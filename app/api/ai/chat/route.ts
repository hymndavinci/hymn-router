/**
 * POST /api/ai/chat — endpoint chat AI Router gratis.
 * GET  /api/ai/chat — status provider (tanpa key, aman dibuka).
 *
 * Perilaku anonim tidak berubah: tanpa Authorization, rate limit 20
 * req/menit per IP (AI_ROUTER_IP_RPM).
 *
 * Kalau ada header Authorization: Bearer <API key user>:
 *   - key valid → request diatribusikan ke user itu, limit 60 req/menit
 *     per key (AI_ROUTER_KEY_RPM), pemakaian dicatat ke dashboard.
 *   - key tidak valid → 401 (tidak diam-diam fallback ke anonim).
 *
 * Request:
 *   POST /api/ai/chat
 *   { "messages": [{ "role": "user", "content": "halo" }],
 *     "temperature": 0.7, "maxTokens": 1024, "stream": false }
 *
 * Response sukses (non-stream):
 *   { "provider": "groq", "model": "openai/gpt-oss-120b",
 *     "content": "...", "tried": [], "usage": {...} }
 *
 * Response sukses (stream:true): SSE OpenAI-compatible (chunk
 * choices[0].delta, diakhiri [DONE]), diawali satu `event: meta`
 * berisi { provider, model, tried } untuk playground.
 *
 * Response gagal (semua provider down):
 *   502 { "error": "all providers failed: ..." }
 *
 * Pemakaian (request ber-autentikasi) dicatat ke DB lewat after()
 * supaya dijamin jalan di serverless.
 *
 * Keamanan:
 * - Semua key hanya dibaca server-side (process.env / DB hash). Jangan
 *   pernah expose key ke client / NEXT_PUBLIC_*.
 * - Rate limit in-memory per proses. Untuk produksi serius, ganti dengan
 *   Upstash Redis / middleware rate limit.
 */

import { after, NextRequest, NextResponse } from "next/server";
import {
  chat,
  chatStream,
  getProviderStatus,
  type ChatMessage,
  type StreamUsage,
} from "@/lib/free-ai-router";
import { buildSseResponse } from "@/lib/sse";
import { isDbConfigured } from "@/lib/db";
import { logUsage, validateApiKey } from "@/lib/api-keys";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
// Router bisa memakan waktu kalau harus fallback beberapa provider.
export const maxDuration = 60;

const IP_RPM = Number(process.env.AI_ROUTER_IP_RPM ?? 20);
const KEY_RPM = Number(process.env.AI_ROUTER_KEY_RPM ?? 60);

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET() {
  return NextResponse.json({ providers: getProviderStatus() });
}

export async function POST(req: NextRequest) {
  // Auth opsional: Bearer key user → limit per key + catat usage.
  // Bearer yang tidak valid ditolak 401, bukan fallback anonim.
  const auth = req.headers.get("authorization");
  const rawKey = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let keyInfo: { userId: string; keyId: string } | null = null;

  if (rawKey) {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: "API key tidak bisa divalidasi — DATABASE_URL belum dikonfigurasi di server." },
        { status: 401 },
      );
    }
    keyInfo = await validateApiKey(rawKey);
    if (!keyInfo) {
      return NextResponse.json(
        { error: "API key tidak valid atau sudah di-revoke." },
        { status: 401 },
      );
    }
    if (rateLimited(`key:${keyInfo.keyId}`, KEY_RPM)) {
      return NextResponse.json(
        { error: `rate limited: max ${KEY_RPM} requests/minute per API key` },
        { status: 429 },
      );
    }
  } else {
    const ip = clientIp(req);
    if (rateLimited(`ip:${ip}`, IP_RPM)) {
      return NextResponse.json(
        { error: `rate limited: max ${IP_RPM} requests/minute per IP` },
        { status: 429 },
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { messages, temperature, maxTokens, preferProvider, stream } = (body ?? {}) as {
    messages?: unknown;
    temperature?: unknown;
    maxTokens?: unknown;
    preferProvider?: unknown;
    stream?: unknown;
  };

  if (stream !== undefined && typeof stream !== "boolean") {
    return NextResponse.json({ error: "stream harus boolean" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return NextResponse.json(
      { error: "messages must be a non-empty array (max 50)" },
      { status: 400 },
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
      return NextResponse.json(
        { error: "each message needs role (system/user/assistant) and content (1–20000 chars)" },
        { status: 400 },
      );
    }
  }
  if (temperature !== undefined && (typeof temperature !== "number" || temperature < 0 || temperature > 2)) {
    return NextResponse.json({ error: "temperature must be 0–2" }, { status: 400 });
  }
  if (maxTokens !== undefined && (typeof maxTokens !== "number" || maxTokens < 1 || maxTokens > 8192)) {
    return NextResponse.json({ error: "maxTokens must be 1–8192" }, { status: 400 });
  }

  const started = Date.now();
  const chatOpts = {
    temperature: temperature as number | undefined,
    maxTokens: maxTokens as number | undefined,
    preferProvider: typeof preferProvider === "string" ? preferProvider : undefined,
    signal: req.signal,
  };

  // ---- streaming (SSE, diawali event meta untuk playground) ----
  if (stream === true) {
    let result: Awaited<ReturnType<typeof chatStream>>;
    try {
      result = await chatStream(messages as ChatMessage[], chatOpts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    let finalUsage: StreamUsage | undefined;
    const sseResponse = buildSseResponse(result, {
      meta: {
        provider: result.provider,
        model: result.model,
        tried: result.tried,
      },
      onFinish: (info) => {
        finalUsage = info.usage;
      },
    });
    if (keyInfo) {
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
    }
    return sseResponse;
  }

  // ---- non-streaming ----
  try {
    const result = await chat(messages as ChatMessage[], chatOpts);
    if (keyInfo) {
      after(async () => {
        await logUsage({
          userId: keyInfo.userId,
          apiKeyId: keyInfo.keyId,
          provider: result.provider,
          model: result.model,
          promptTokens: result.usage?.prompt_tokens ?? 0,
          completionTokens: result.usage?.completion_tokens ?? 0,
          latencyMs: Date.now() - started,
        });
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
