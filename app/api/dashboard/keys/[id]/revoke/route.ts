/**
 * POST /api/dashboard/keys/[id]/revoke — revoke API key milik user.
 * Key yang di-revoke tidak bisa dipakai lagi dan tidak bisa di-unrevoke.
 */

import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-keys";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database belum dikonfigurasi — isi DATABASE_URL dan jalankan npm run migrate." },
      { status: 503 },
    );
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await revokeApiKey(id, user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "key tidak ditemukan, bukan milikmu, atau sudah di-revoke" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
