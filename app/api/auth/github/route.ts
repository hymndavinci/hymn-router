/**
 * GET /api/auth/github — mulai login GitHub (OAuth 2.0 authorization code).
 *
 * Cerminan pola /api/auth/google. Kalau GITHUB_CLIENT_ID belum diisi,
 * redirect ke /login?error=github_not_configured (bukan crash) — tombol
 * GitHub di /login memang disembunyikan kalau belum terkonfigurasi, tapi
 * URL ini bisa dibuka langsung.
 *
 * Query `next` (opsional, path internal) dibawa di dalam state dan
 * dipakai callback untuk redirect sesudah login.
 *
 * CATATAN: GitHub OAuth App hanya punya SATU callback URL, dan yang
 * terdaftar saat ini adalah domain lama
 * https://hymn-router.vercel.app/api/auth/callback/github. Jadi login
 * GitHub hanya jalan dari hymn-router.vercel.app; dari hymnrouter.my.id
 * GitHub akan menolak dengan redirect_uri_mismatch (login Google adalah
 * jalur yang didukung di domain baru). Kalau callback GitHub suatu saat
 * dipindah ke domain baru, login dari domain lama perlu redirect kanonis
 * ke hymnrouter.my.id di sini supaya tidak rusak.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildOAuthState, newOAuthState, OAUTH_STATE_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const origin = url.origin;
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.redirect(`${origin}/login?error=github_not_configured`);
  }

  const nonce = newOAuthState();
  const state = buildOAuthState(nonce, url.searchParams.get("next"));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback/github`,
    scope: "user:email",
    state,
  });

  const res = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
  res.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
