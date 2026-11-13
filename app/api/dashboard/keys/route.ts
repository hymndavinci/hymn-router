/**
 * GET  /api/dashboard/keys — daftar API key milik user (tanpa key utuh).
 * POST /api/dashboard/keys — buat key baru { name }.
 *
 * Keduanya butuh session login. POST mengembalikan key utuh SEKALI —
 * frontend harus menampilkannya langsung, tidak bisa diambil lagi.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

export const runtime = "nodejs";

function notConfigured() {
  return NextResponse.json(
    {
      error: "Database belum dikonfigurasi — isi DATABASE_URL dan jalankan npm run migrate.",
      code: "server_not_configured",
    },
    { status: 503 },
  );
}

function dbError(err: unknown) {
  console.error("[dashboard/keys] database error:", err);
  return NextResponse.json(
    { error: "database_error: gagal mengakses database, silakan coba lagi sebentar", code: "database_error" },
    { status: 503 },
  );
}

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) return notConfigured();
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
    return NextResponse.json({ keys: await listApiKeys(user.id) });
  } catch (err) {
    return dbError(err);
  }
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return notConfigured();
  let user;
  try {
    user = await getSessionUserFromRequest(req);
  } catch (err) {
    return dbError(err);
  }
  if (!user)
    return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body", code: "invalid_json" }, { status: 400 });
  }
  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 64) {
    return NextResponse.json(
      { error: "name wajib diisi (1–64 karakter)", code: "invalid_name" },
      { status: 400 },
    );
  }

  let created;
  try {
    created = await createApiKey(user.id, name.trim());
  } catch (err) {
    return dbError(err);
  }
  if (!created) return notConfigured();
  return NextResponse.json({ key: created }, { status: 201 });
}
