/** GET /api/dashboard/usage?days=7 — ringkasan pemakaian user yang login. */

import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUsageSummary } from "@/lib/usage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database belum dikonfigurasi — isi DATABASE_URL dan jalankan npm run migrate." },
      { status: 503 },
    );
  }
  let user;
  try {
    user = await getSessionUser();
  } catch (err) {
    console.error("[dashboard/usage] database error:", err);
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, coba lagi sebentar" },
      { status: 503 },
    );
  }
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const daysParam = Number(new URL(req.url).searchParams.get("days") ?? 7);
  const days = Number.isFinite(daysParam) ? Math.min(90, Math.max(1, daysParam)) : 7;
  try {
    return NextResponse.json({ usage: await getUsageSummary(user.id, days) });
  } catch (err) {
    console.error("[dashboard/usage] database error:", err);
    return NextResponse.json(
      { error: "database_error: gagal mengakses database, coba lagi sebentar" },
      { status: 503 },
    );
  }
}
