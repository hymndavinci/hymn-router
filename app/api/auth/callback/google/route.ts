/**
 * GET /api/auth/callback/google — terima code dari Google, tukar jadi
 * id_token, verifikasi, cari/buat user, set session cookie, redirect
 * ke /dashboard.
 *
 * Semua kegagalan diarahkan ke /auth/error?reason=... dengan pesan yang
 * jelas — tidak pernah crash dengan stack trace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { OAUTH_STATE_COOKIE, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

type TokenInfo = {
  aud?: string;
  exp?: string;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/auth/error?reason=${encodeURIComponent(reason)}`);

  try {
    const denied = url.searchParams.get("error");
    if (denied) return fail("denied");

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) return fail("missing_code");

    const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
    if (!state || !stateCookie || state !== stateCookie) return fail("bad_state");

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return fail("not_configured");
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.trim().length < 32) {
      return fail("no_session_secret");
    }
    if (!isDbConfigured()) return fail("no_database");

    // Tukar authorization code dengan token.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/callback/google`,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!tokenRes.ok) return fail("token_exchange_failed");
    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) return fail("no_id_token");

    // Verifikasi id_token via tokeninfo (cek signature + aud + exp di sisi Google).
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
    );
    if (!infoRes.ok) return fail("tokeninfo_failed");
    const info = (await infoRes.json()) as TokenInfo;
    if (info.aud !== clientId) return fail("bad_audience");
    if (!info.sub || !info.email) return fail("bad_token");
    if (Number(info.exp) * 1000 < Date.now()) return fail("token_expired");

    // Cari / buat user (upsert berdasarkan google_sub).
    const db = getDb();
    if (!db) return fail("no_database");
    const rows = (await db`
      INSERT INTO users (google_sub, email, name, avatar_url)
      VALUES (${info.sub}, ${info.email}, ${info.name ?? null}, ${info.picture ?? null})
      ON CONFLICT (google_sub) DO UPDATE
        SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
      RETURNING id
    `) as { id: string }[];
    if (rows.length === 0) return fail("db_error");

    const ok = await setSessionCookie(rows[0].id);
    if (!ok) return fail("no_session_secret");

    const res = NextResponse.redirect(`${origin}/dashboard`);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch {
    return fail("unknown");
  }
}
