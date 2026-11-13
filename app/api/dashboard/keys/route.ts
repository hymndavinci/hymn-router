/**
 * GET  /api/dashboard/keys — daftar API key milik user (tanpa key utuh).
 * POST /api/dashboard/keys — buat key baru { name }.
 *
 * Keduanya butuh session login. POST mengembalikan key utuh SEKALI —
 * frontend harus menampilkannya langsung, tidak bisa diambil lagi.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

export const runtime = "nodejs";

function notConfigured() {
  return NextResponse.json(
    { error: "Database belum dikonfigurasi — isi DATABASE_URL dan jalankan npm run migrate." },
    { status: 503 },
  );
}

export async function GET() {
  if (!isDbConfigured()) return notConfigured();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ keys: await listApiKeys(user.id) });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return notConfigured();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 64) {
    return NextResponse.json(
      { error: "name wajib diisi (1–64 karakter)" },
      { status: 400 },
    );
  }

  const created = await createApiKey(user.id, name.trim());
  if (!created) return notConfigured();
  return NextResponse.json({ key: created }, { status: 201 });
}
