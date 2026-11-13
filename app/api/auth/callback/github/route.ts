/**
 * GET /api/auth/callback/github — terima code dari GitHub, tukar jadi
 * access token, ambil profil + email, cari/buat/tautkan user, set
 * session cookie, redirect ke /dashboard (atau `next` dari state).
 *
 * Penautan akun: utamakan github_id; kalau tidak ada, cari by email —
 * kalau email sudah dipakai akun email/Google, tautkan github_id ke
 * akun itu (password_hash tidak ditimpa); kalau belum ada juga, buat
 * user baru. Jadi satu email = satu akun, apa pun cara loginnya.
 *
 * Semua kegagalan diarahkan ke /login?error=... dengan pesan yang jelas
 * — tidak pernah crash dengan stack trace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { OAUTH_STATE_COOKIE, parseOAuthState, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

type GitHubUser = {
  id?: number;
  login?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);

  try {
    const denied = url.searchParams.get("error");
    if (denied) return fail("github_failed");

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) return fail("github_failed");

    const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const { valid, next } = parseOAuthState(state, stateCookie);
    if (!valid) return fail("github_failed");

    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return fail("github_not_configured");
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.trim().length < 32) {
      return fail("github_failed");
    }
    if (!isDbConfigured()) return fail("github_failed");

    // Tukar authorization code dengan access token.
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/auth/callback/github`,
      }),
    });
    if (!tokenRes.ok) return fail("github_failed");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("github_failed");

    const ghFetch = (path: string) =>
      fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "hymn-router",
        },
      });

    // Profil GitHub.
    const userRes = await ghFetch("/user");
    if (!userRes.ok) return fail("github_failed");
    const ghUser = (await userRes.json()) as GitHubUser;
    if (!ghUser.id || !ghUser.login) return fail("github_failed");

    // Email: profil bisa menyembunyikannya (pengaturan privasi GitHub),
    // jadi ambil dari /user/emails kalau perlu.
    let email = ghUser.email?.trim().toLowerCase() || null;
    if (!email) {
      const emailsRes = await ghFetch("/user/emails");
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as GitHubEmail[];
        const pick =
          emails.find((e) => e.primary && e.verified) ??
          emails.find((e) => e.verified) ??
          null;
        email = pick ? pick.email.trim().toLowerCase() : null;
      }
    }
    if (!email) return fail("github_no_email");

    const db = getDb();
    if (!db) return fail("github_failed");
    const githubId = String(ghUser.id);
    const name = ghUser.name?.trim() || ghUser.login;
    const avatar = ghUser.avatar_url ?? null;

    // 1) Cari by github_id.
    let userId: string | null = null;
    const byGithub = (await db`
      SELECT id FROM users WHERE github_id = ${githubId} LIMIT 1
    `) as { id: string }[];
    if (byGithub.length > 0) {
      userId = byGithub[0].id;
    } else {
      // 2) Cari by email — tautkan github_id ke akun yang sudah ada
      // (jangan timpa password_hash; avatar hanya diisi kalau masih kosong).
      const byEmail = (await db`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `) as { id: string }[];
      if (byEmail.length > 0) {
        userId = byEmail[0].id;
        await db`
          UPDATE users
          SET github_id = ${githubId}, avatar_url = COALESCE(avatar_url, ${avatar})
          WHERE id = ${userId}
        `;
      } else {
        // 3) Buat user baru (google_sub NULL — akun ini murni GitHub).
        const inserted = (await db`
          INSERT INTO users (github_id, email, name, avatar_url)
          VALUES (${githubId}, ${email}, ${name}, ${avatar})
          RETURNING id
        `) as { id: string }[];
        userId = inserted[0]?.id ?? null;
      }
    }
    if (!userId) return fail("github_failed");

    const ok = await setSessionCookie(userId);
    if (!ok) return fail("github_failed");

    const res = NextResponse.redirect(`${origin}${next ?? "/dashboard"}`);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("[auth/callback/github] error:", err);
    return fail("github_failed");
  }
}
