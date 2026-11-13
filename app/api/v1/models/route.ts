/**
 * GET /api/v1/models — daftar model (OpenAI-compatible, tanpa auth).
 *
 * id model = model id tiap provider, plus "hymn/auto" untuk router
 * otomatis (fallback chain). Model yang dipakai dua provider
 * (mis. gpt-oss-20b) hanya muncul sekali. Model gambar (flux / turbo)
 * ditandai type "image" dan dipakai di /api/v1/images/generations.
 *
 * Field tambahan per item (di luar bentuk OpenAI standar, aman
 * diabaikan client OpenAI): provider, providers (kalau dipakai >1
 * provider), configured, needs_key, free_tier, type.
 */

import { NextResponse } from "next/server";
import { getProviders } from "@/lib/free-ai-router";

export const runtime = "nodejs";

type ModelItem = {
  id: string;
  object: "model";
  owned_by: string;
  provider: string;
  providers?: string[];
  configured: boolean;
  needs_key: boolean;
  free_tier: string;
  /** "chat" untuk /v1/chat/completions, "image" untuk /v1/images/generations */
  type: "chat" | "image";
};

export async function GET() {
  const providers = getProviders();
  const anyConfigured = providers.some((p) => !p.needsKey || !!p.apiKey);

  const data: ModelItem[] = [
    {
      id: "hymn/auto",
      object: "model",
      owned_by: "hymn-router",
      provider: "hymn-router",
      providers: providers.map((p) => p.id),
      configured: anyConfigured,
      needs_key: false,
      free_tier: `Fallback chain ${providers.length} provider. Free plan: 100 request/hari per user.`,
      type: "chat",
    },
  ];

  const seen = new Map<string, ModelItem>();
  for (const p of providers) {
    const existing = seen.get(p.model);
    if (existing) {
      // Model yang sama dipakai provider lain (mis. gpt-oss-20b di
      // Pollinations & OVH): gabungkan daftar providernya.
      existing.providers = [...(existing.providers ?? [existing.provider]), p.id];
      existing.configured = existing.configured || !p.needsKey || !!p.apiKey;
      existing.needs_key = existing.needs_key && p.needsKey;
      continue;
    }
    const item: ModelItem = {
      id: p.model,
      object: "model",
      owned_by: p.id,
      provider: p.id,
      configured: !p.needsKey || !!p.apiKey,
      needs_key: p.needsKey,
      free_tier: p.notes,
      type: "chat",
    };
    seen.set(p.model, item);
    data.push(item);
  }

  // Model gambar (Pollinations, tanpa key) — endpoint terpisah:
  // POST /api/v1/images/generations (bukan /chat/completions).
  for (const id of ["flux", "turbo"] as const) {
    data.push({
      id,
      object: "model",
      owned_by: "hymn-router",
      provider: "hymn-router",
      configured: true,
      needs_key: false,
      free_tier:
        "Image generation gratis. Ukuran: 1024x1024, 512x512, 1024x1792, 1792x1024. Satu gambar = 1 unit kuota harian.",
      type: "image",
    });
  }
  return NextResponse.json({ object: "list", data });
}
