/** GET /api/auth/me — user yang sedang login, atau 401 kalau belum login. */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  let user;
  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("[auth/me] database error:", err);
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, coba lagi sebentar" },
      { status: 503 },
    );
  }
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
