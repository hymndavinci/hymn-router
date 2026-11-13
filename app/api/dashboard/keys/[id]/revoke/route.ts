/**
 * POST /api/dashboard/keys/[id]/revoke — revoke API key milik user.
 * Key yang di-revoke tidak bisa dipakai lagi dan tidak bisa di-unrevoke.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error: "Database belum dikonfigurasi — isi DATABASE_URL dan jalankan npm run migrate.",
        code: "server_not_configured",
      },
      { status: 503 },
    );
  }
  let user;
  try {
    user = await getSessionUserFromRequest(req);
  } catch (err) {
    console.error("[dashboard/revoke] database error:", err);
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, silakan coba lagi sebentar", code: "database_error" },
      { status: 503 },
    );
  }
  if (!user)
    return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  const { id } = await params;
  let ok;
  try {
    ok = await revokeApiKey(id, user.id);
  } catch (err) {
    console.error("[dashboard/revoke] database error:", err);
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, silakan coba lagi sebentar", code: "database_error" },
      { status: 503 },
    );
  }
  if (!ok) {
    return NextResponse.json(
      { error: "key tidak ditemukan, bukan milik Anda, atau sudah di-revoke", code: "key_not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
