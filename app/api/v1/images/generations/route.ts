/**
 * POST /api/v1/images/generations — image generation OpenAI-compatible.
 *
 * Wajib Authorization: Bearer <API key user> (dibuat di /dashboard).
 * Body: { prompt, model?: "flux" | "turbo", size?: "1024x1024" |
 * "512x512" | "1024x1792" | "1792x1024", n?: 1, seed?: number }.
 *
 * Backend: Pollinations (gratis, tanpa key). Gambar di-fetch server-side
 * supaya respons berisi url DAN b64_json (OpenAI mengirim salah satu;
 * gateway ini mengirim keduanya agar client tidak perlu fetch ulang).
 * Satu gambar = 1 unit kuota harian (dicatat ke tabel usage seperti
 * request chat). Rate limit 60 req/menit per key.
 *
 * Batas keamanan: gambar >3 MB dikembalikan tanpa b64_json (url saja)
 * supaya respons tetap di bawah batas ~4,5 MB Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { logUsage, validateApiKey } from "@/lib/api-keys";
import { rateLimited } from "@/lib/rate-limit";
import { DAILY_FREE_QUOTA, getTodayQuota, type DailyQuota } from "@/lib/usage";
import {
  buildPollinationsImageUrl,
  isImageModel,
  isImageSize,
  type ImageModel,
  type ImageSize,
} from "@/lib/pollinations-images";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Batas b64_json: di atas ini hanya url yang dikembalikan. */
const MAX_B64_BYTES = 3_000_000;
/** Timeout fetch ke Pollinations (ms). */
const FETCH_TIMEOUT_MS = 50_000;

function openAiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { error: { message, type: "invalid_request_error", code } },
    { status },
  );
}

function quotaHeaders(quota: DailyQuota | null): Record<string, string> {
  if (!quota) return {};
  return {
    "X-Quota-Limit": String(quota.limit),
    "X-Quota-Remaining": String(Math.max(0, quota.remaining - 1)),
    "X-Quota-Reset": quota.resetsAt,
  };
}

export async function GET() {
  return NextResponse.json(
    {
      error: {
        message:
          "Gunakan POST dengan body { prompt, model?, size? }. Lihat /docs.",
        type: "invalid_request_error",
        code: "method_not_allowed",
      },
    },
    { status: 405 },
  );
}

export async function POST(req: NextRequest) {
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

  const { prompt, model, size, n, seed } = (body ?? {}) as {
    prompt?: unknown;
    model?: unknown;
    size?: unknown;
    n?: unknown;
    seed?: unknown;
  };

  if (typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > 4000) {
    return openAiError(
      "prompt wajib diisi (string, 1–4000 karakter)",
      "invalid_request_error",
      400,
    );
  }
  if (model !== undefined && !isImageModel(model)) {
    return openAiError(
      'model harus "flux" atau "turbo"',
      "invalid_request_error",
      400,
    );
  }
  if (size !== undefined && !isImageSize(size)) {
    return openAiError(
      'size harus "1024x1024", "512x512", "1024x1792", atau "1792x1024"',
      "invalid_request_error",
      400,
    );
  }
  if (n !== undefined && n !== 1) {
    return openAiError(
      "hanya n = 1 yang didukung (satu gambar per request)",
      "invalid_request_error",
      400,
    );
  }
  if (
    seed !== undefined &&
    (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0)
  ) {
    return openAiError(
      "seed harus bilangan bulat >= 0",
      "invalid_request_error",
      400,
    );
  }

  const imageModel: ImageModel = (model as ImageModel) ?? "flux";
  const imageSize: ImageSize = (size as ImageSize) ?? "1024x1024";
  const imageSeed =
    typeof seed === "number" ? seed : Math.floor(Math.random() * 1_000_000);
  const cleanPrompt = prompt.trim();

  // Kuota harian gratis (fail OPEN, sama seperti /v1 chat).
  const quota = await getTodayQuota(keyInfo.userId).catch((err) => {
    console.error("[v1/images] quota check failed, allowing request:", err);
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
  const url = buildPollinationsImageUrl(cleanPrompt, imageModel, imageSize, imageSeed);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let imageBuffer: Buffer;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: {
            message: `Layanan gambar gagal (HTTP ${res.status} ${text.slice(0, 200)})`,
            type: "server_error",
            code: "image_generation_failed",
          },
        },
        { status: 502 },
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        {
          error: {
            message: "Layanan gambar mengembalikan respons bukan gambar.",
            type: "server_error",
            code: "image_generation_failed",
          },
        },
        { status: 502 },
      );
    }
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        {
          error: {
            message: `Layanan gambar timeout setelah ${FETCH_TIMEOUT_MS / 1000} detik.`,
            type: "server_error",
            code: "image_generation_failed",
          },
        },
        { status: 502 },
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // 1 unit kuota: dicatat ke tabel usage seperti request chat.
  // provider dicatat sebagai "image" (bukan nama upstream): sumber
  // model gambar sengaja tidak ditampilkan di halaman mana pun.
  after(async () => {
    await logUsage({
      userId: keyInfo.userId,
      apiKeyId: keyInfo.keyId,
      provider: "image",
      model: imageModel,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - started,
    });
  });

  const data: Record<string, string> = { url, revised_prompt: cleanPrompt };
  if (imageBuffer.length <= MAX_B64_BYTES) {
    data.b64_json = imageBuffer.toString("base64");
  }

  return NextResponse.json(
    { created: Math.floor(Date.now() / 1000), data: [data] },
    { headers: quotaHeaders(quota) },
  );
}
