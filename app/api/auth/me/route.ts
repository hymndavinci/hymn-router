/** GET /api/auth/me — user yang sedang login, atau 401 kalau belum login. */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getSessionUserFromRequest(req);
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
