/**
 * POST /api/ai/chat — endpoint chat AI Router gratis.
 * GET  /api/ai/chat — status provider (tanpa key, aman dibuka).
 *
 * Taruh file ini di project Next.js (App Router) lu, mis. portfolio:
 *   app/api/ai/chat/route.ts
 * dan lib-nya di:
 *   lib/free-ai-router.ts
 *
 * Request:
 *   POST /api/ai/chat
 *   { "messages": [{ "role": "user", "content": "halo" }],
 *     "temperature": 0.7, "maxTokens": 1024 }
 *
 * Response sukses:
 *   { "provider": "groq", "model": "openai/gpt-oss-120b",
 *     "content": "...", "tried": [], "usage": {...} }
 *
 * Response gagal (semua provider down):
 *   502 { "error": "all providers failed: ..." }
 *
 * Keamanan:
 * - Semua key hanya dibaca server-side (process.env). Jangan pernah
 *   expose key ke client / NEXT_PUBLIC_*.
 * - Rate limit sederhana per IP (in-memory) supaya kuota gratis tidak
 *   dikuras satu orang. Untuk produksi serius, ganti dengan Upstash
 *   Redis / middleware rate limit.
 */

import { NextRequest, NextResponse } from "next/server";
import { chat, getProviderStatus, type ChatMessage } from "@/lib/free-ai-router";

export const runtime = "nodejs";
// Router bisa memakan waktu kalau harus fallback beberapa provider.
export const maxDuration = 60;

// ---- rate limit per IP (in-memory, per proses server) ----
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.AI_ROUTER_IP_RPM ?? 20);
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  h.count += 1;
  return h.count > MAX_PER_WINDOW;
}

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
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: `rate limited: max ${MAX_PER_WINDOW} requests/minute per IP` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { messages, temperature, maxTokens, preferProvider } = (body ?? {}) as {
    messages?: unknown;
    temperature?: unknown;
    maxTokens?: unknown;
    preferProvider?: unknown;
  };

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

  try {
    const result = await chat(messages as ChatMessage[], {
      temperature: temperature as number | undefined,
      maxTokens: maxTokens as number | undefined,
      preferProvider: typeof preferProvider === "string" ? preferProvider : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
