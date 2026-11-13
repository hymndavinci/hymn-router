/**
 * GET /api/v1/models — daftar model (OpenAI-compatible, tanpa auth).
 *
 * id model = model id tiap provider, plus "hymn/auto" untuk router
 * otomatis (fallback chain). Model yang dipakai dua provider
 * (mis. gpt-oss-20b) hanya muncul sekali.
 */

import { NextResponse } from "next/server";
import { getProviders } from "@/lib/free-ai-router";

export const runtime = "nodejs";

export async function GET() {
  const seen = new Set<string>();
  const data: { id: string; object: "model"; owned_by: string }[] = [
    { id: "hymn/auto", object: "model", owned_by: "hymn-router" },
  ];
  seen.add("hymn/auto");
  for (const p of getProviders()) {
    if (seen.has(p.model)) continue;
    seen.add(p.model);
    data.push({ id: p.model, object: "model", owned_by: p.id });
  }
  return NextResponse.json({ object: "list", data });
}
