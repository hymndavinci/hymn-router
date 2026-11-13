/**
 * POST /api/v1/chat/completions — gateway OpenAI-compatible.
 *
 * Wajib Authorization: Bearer <API key user> (dibuat di /dashboard).
 * Body: { model?, messages, temperature?, max_tokens?, stream? }.
 *
 * model bisa:
 *   - "hymn/auto" (default) — fallback chain penuh
 *   - id provider, mis. "groq" — provider itu dicoba duluan, tetap fallback
 *   - id model, mis. "openai/gpt-oss-120b"
 *   - model OpenRouter berakhiran ":free", mis.
 *     "google/gemma-4-26b-a4b-it:free" — diteruskan ke OpenRouter
 *     (butuh OPENROUTER_API_KEY di server; hanya :free yang diizinkan,
 *     supaya tidak ada model berbayar yang membakar kredit server).
 *
 * stream:true → SSE OpenAI-compatible (chunk choices[0].delta, diakhiri
 * [DONE]). Rate limit 60 req/menit per key (AI_ROUTER_KEY_RPM) + kuota
 * harian gratis 100 request/hari per user (reset 00:00 WIB).
 * Pemakaian dicatat ke DB lewat after() (dijamin jalan di serverless).
 */

import { randomBytes } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import {
  chat,
  chatStream,
  getProviders,
  type ChatMessage,
  type StreamUsage,
} from "@/lib/free-ai-router";
import { buildSseResponse } from "@/lib/sse";
import { isDbConfigured } from "@/lib/db";
import { logUsage, validateApiKey } from "@/lib/api-keys";
import { rateLimited } from "@/lib/rate-limit";
import { DAILY_FREE_QUOTA, getTodayQuota, type DailyQuota } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

function openAiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { error: { message, type: "invalid_request_error", code } },
    { status },
  );
}

/** Header kuota harian (hanya kalau info kuota tersedia). */
function quotaHeaders(quota: DailyQuota | null): Record<string, string> {
  if (!quota) return {};
  return {
    "X-Quota-Limit": String(quota.limit),
    // Request ini ikut dihitung, jadi sisa setelah request ini = remaining - 1.
    "X-Quota-Remaining": String(Math.max(0, quota.remaining - 1)),
    "X-Quota-Reset": quota.resetsAt,
  };
}

export async function GET() {
  return NextResponse.json(
    {
      error: {
        message: "Gunakan POST dengan body { model, messages }. Lihat /docs.",
        type: "invalid_request_error",
        code: "method_not_allowed",
      },
    },
    { status: 405 },
  );
}

export async function POST(req: NextRequest) {
  // Urutan cek: key kosong → 401 (tanpa peduli DB); key ada tapi DB belum
  // dikonfigurasi → 503 (server belum setup, bukan salah client).
  const auth = req.headers.get("authorization");
  const rawKey = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!rawKey) {
    return openAiError(
      "Authorization header Bearer <API key> wajib diisi. Buat key di dasbor.",
      "invalid_api_key",
      401,
    );
  }
  if (!isDbConfigured()) {
    return openAiError(
      "API key belum dikonfigurasi di server — DATABASE_URL belum diisi. Lihat docs/setup.md.",
      "server_not_configured",
      503,
    );
  }
  const keyInfo = await validateApiKey(rawKey);
  if (!keyInfo) {
    return openAiError("API key tidak valid atau sudah di-revoke.", "invalid_api_key", 401);
  }

  const keyRpm = Number(process.env.AI_ROUTER_KEY_RPM ?? 60);
  if (rateLimited(`key:${keyInfo.keyId}`, keyRpm)) {
    return openAiError(
      `rate limited: max ${keyRpm} requests/minute per API key`,
      "rate_limit_exceeded",
      429,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return openAiError("invalid JSON body", "invalid_request_error", 400);
  }

  const { model, messages, temperature, max_tokens, stream } = (body ?? {}) as {
    model?: unknown;
    messages?: unknown;
    temperature?: unknown;
    max_tokens?: unknown;
    stream?: unknown;
  };

  if (stream !== undefined && typeof stream !== "boolean") {
    return openAiError("stream harus boolean", "invalid_request_error", 400);
  }
  if (model !== undefined && typeof model !== "string") {
    return openAiError("model harus string", "invalid_request_error", 400);
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return openAiError(
      "messages must be a non-empty array (max 50)",
      "invalid_request_error",
      400,
    );
  }
  for (const m of messages) {
    const msg = m as { role?: unknown; content?: unknown };
    if (
      !msg ||
      (msg.role !== "system" && msg.role !== "user" && msg.role !== "assistant") ||
      typeof msg.content !== "string" ||
      msg.content.length === 0 ||
      msg.content.length > 20_000
    ) {
      return openAiError(
        "each message needs role (system/user/assistant) and content (1–20000 chars)",
        "invalid_request_error",
        400,
      );
    }
  }
  if (
    temperature !== undefined &&
    (typeof temperature !== "number" || temperature < 0 || temperature > 2)
  ) {
    return openAiError("temperature must be 0–2", "invalid_request_error", 400);
  }
  if (
    max_tokens !== undefined &&
    (typeof max_tokens !== "number" || max_tokens < 1 || max_tokens > 8192)
  ) {
    return openAiError("max_tokens must be 1–8192", "invalid_request_error", 400);
  }

  // Resolve model → preferProvider (+ modelOverride untuk :free).
  let preferProvider: string | undefined;
  let modelOverride: string | undefined;
  const modelStr = typeof model === "string" ? model : "hymn/auto";
  if (modelStr !== "hymn/auto") {
    const providers = getProviders();
    const byId = providers.find((p) => p.id === modelStr);
    const byModel = providers.find((p) => p.model === modelStr);
    if (byId) preferProvider = byId.id;
    else if (byModel) preferProvider = byModel.id;
    else if (modelStr.endsWith(":free")) {
      // Model :free OpenRouter lain — hanya diteruskan kalau OpenRouter
      // terkonfigurasi di server.
      const openrouter = providers.find((p) => p.id === "openrouter");
      if (!openrouter?.apiKey) {
        return NextResponse.json(
          {
            error: {
              message: `Model '${modelStr}' memerlukan OpenRouter — server belum mengonfigurasi OPENROUTER_API_KEY. Gunakan "hymn/auto" atau model dari GET /api/v1/models.`,
              type: "server_error",
              code: "model_unavailable",
            },
          },
          { status: 503 },
        );
      }
      preferProvider = "openrouter";
      modelOverride = modelStr;
    } else {
      return NextResponse.json(
        {
          error: {
            message: `Model '${modelStr}' tidak dikenal. Gunakan "hymn/auto", id provider (mis. "groq"), id model dari GET /api/v1/models, atau model OpenRouter berakhiran ":free".`,
            type: "invalid_request_error",
            code: "model_not_found",
          },
        },
        { status: 404 },
      );
    }
  }

  // Kuota harian gratis (fail OPEN: gangguan DB tidak memblokir request).
  const quota = await getTodayQuota(keyInfo.userId).catch((err) => {
    console.error("[v1] quota check failed, allowing request:", err);
    return null;
  });
  if (quota && quota.remaining <= 0) {
    return NextResponse.json(
      {
        error: {
          message: `Kuota harian gratis habis (${DAILY_FREE_QUOTA} request/hari). Reset pukul 00:00 WIB (${quota.resetsAt}).`,
          type: "rate_limit_error",
          code: "quota_exceeded",
          retry_after: quota.retryAfterSeconds,
          resets_at: quota.resetsAt,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(quota.retryAfterSeconds) },
      },
    );
  }

  const started = Date.now();
  const chatOpts = {
    temperature: temperature as number | undefined,
    maxTokens: max_tokens as number | undefined,
    preferProvider,
    modelOverride,
    signal: req.signal,
  };

  // ---- streaming (SSE OpenAI-compatible) ----
  if (stream === true) {
    let result: Awaited<ReturnType<typeof chatStream>>;
    try {
      result = await chatStream(messages as ChatMessage[], chatOpts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: {
            message: msg,
            type: "server_error",
            code: "all_providers_failed",
          },
        },
        { status: 502 },
      );
    }

    // Usage diisi onFinish saat stream selesai; after() membaca nilai
    // finalnya — after() dijamin jalan setelah respons selesai dikirim.
    let finalUsage: StreamUsage | undefined;
    const sseResponse = buildSseResponse(result, {
      onFinish: (info) => {
        finalUsage = info.usage;
      },
    });
    after(async () => {
      await logUsage({
        userId: keyInfo.userId,
        apiKeyId: keyInfo.keyId,
        provider: result.provider,
        model: result.model,
        promptTokens: finalUsage?.promptTokens ?? 0,
        completionTokens: finalUsage?.completionTokens ?? 0,
        latencyMs: Date.now() - started,
      });
    });
    for (const [k, v] of Object.entries(quotaHeaders(quota))) {
      sseResponse.headers.set(k, v);
    }
    return sseResponse;
  }

  // ---- non-streaming ----
  try {
    const result = await chat(messages as ChatMessage[], chatOpts);
    const promptTokens = result.usage?.prompt_tokens ?? 0;
    const completionTokens = result.usage?.completion_tokens ?? 0;
    const totalTokens =
      result.usage?.total_tokens ?? promptTokens + completionTokens;
    after(async () => {
      await logUsage({
        userId: keyInfo.userId,
        apiKeyId: keyInfo.keyId,
        provider: result.provider,
        model: result.model,
        promptTokens,
        completionTokens,
        latencyMs: Date.now() - started,
      });
    });
    return NextResponse.json(
      {
        id: `chatcmpl-${randomBytes(12).toString("hex")}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: result.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: result.content },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
        },
      },
      { headers: quotaHeaders(quota) },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: {
          message: msg,
          type: "server_error",
          code: "all_providers_failed",
        },
      },
      { status: 502 },
    );
  }
}
