/**
 * GET /api/auth/google — mulai login Google (OAuth 2.0 authorization code).
 *
 * Redirect ke accounts.google.com. Kalau GOOGLE_CLIENT_ID belum diisi,
 * balas 503 dengan pesan setup yang jelas (bukan crash).
 */

import { NextRequest, NextResponse } from "next/server";
import { newOAuthState, OAUTH_STATE_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Google login belum dikonfigurasi — isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di environment. Lihat docs/setup.md.",
      },
      { status: 503 },
    );
  }

  const origin = new URL(req.url).origin;
  const state = newOAuthState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback/google`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
