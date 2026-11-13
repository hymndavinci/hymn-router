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
 * REDIRECT KANONIS: GitHub OAuth App hanya punya SATU callback URL, dan
 * callback itu didaftarkan ke domain kanonis hymnrouter.my.id. Login
 * GitHub yang dimulai dari hymn-router.vercel.app akan dialihkan dulu
 * (307, query dipertahankan) ke domain kanonis supaya redirect_uri yang
 * dikirim ke GitHub selalu cocok dengan yang terdaftar. Hanya host
 * hymn-router.vercel.app yang dialihkan — localhost & preview tidak
 * (developer lokal memakai OAuth App / callback-nya sendiri).
 */

import { NextRequest, NextResponse } from "next/server";
import { buildOAuthState, newOAuthState, OAUTH_STATE_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

/** Domain kanonis — satu-satunya callback GitHub yang terdaftar. */
const CANONICAL_HOST = "hymnrouter.my.id";
/** Host lama yang login GitHub-nya harus pindah ke domain kanonis. */
const LEGACY_HOST = "hymn-router.vercel.app";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? url.host;
  if (host === LEGACY_HOST) {
    const target = new URL(`https://${CANONICAL_HOST}/api/auth/github`);
    target.search = url.search; // pertahankan ?next=...
    return NextResponse.redirect(target.toString(), 307);
  }

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
