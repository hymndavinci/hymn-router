/**
 * POST /api/auth/logout — hapus session cookie, kembali ke beranda.
 *
 * Sengaja POST, bukan GET: logout mengubah state (menghapus cookie), dan
 * GET yang mengubah state bisa dipicu situs lain (logout CSRF — mis.
 * lewat <img src=".../logout">). UI memakai <form method="POST"> jadi
 * tetap jalan tanpa JavaScript.
 */

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", req.url));
}
