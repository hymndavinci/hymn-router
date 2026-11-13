/**
 * auth.ts — session cookie HMAC-SHA256, tanpa library auth.
 *
 * Format cookie: base64url(JSON {uid, exp}) + "." + base64url(HMAC-SHA256(payload)).
 * Cookie: httpOnly, Secure di production, SameSite=Lax, Path=/, 30 hari.
 *
 * SESSION_SECRET wajib min 32 karakter — kalau tidak ada / terlalu pendek,
 * semua fungsi session mengembalikan null/false dan route auth gagal
 * dengan pesan setup, bukan dengan secret lemah.
 *
 * Server-side only — jangan pernah import ini di client component.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const SESSION_COOKIE = "hymn_session";
export const OAUTH_STATE_COOKIE = "hymn_oauth_state";
/** 30 hari, dalam detik. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

function getSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (!s || s.trim().length < 32) return null;
  return s.trim();
}

function b64urlEncode(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function b64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

/** Buat token session untuk user id. Null kalau SESSION_SECRET belum benar. */
export function signSession(uid: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const payload = b64urlEncode(
    JSON.stringify({ uid, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 }),
  );
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verifikasi token session. Mengembalikan uid, atau null kalau tidak valid / kadaluarsa. */
export function verifySession(token: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload)) as { uid?: unknown; exp?: unknown };
    if (typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

/**
 * User yang sedang login (dari cookie session + DB), atau null kalau tidak
 * ada session / session tidak valid / user tidak ditemukan.
 *
 * MELEMPAR Error("session_db_error") kalau query DB gagal — kegagalan
 * database TIDAK BOLEH disamarkan jadi "belum login", karena caller akan
 * membalas 401 "unauthorized" yang menyesatkan. Caller wajib menangkap
 * error ini dan membalas 503 / menampilkan pesan database error.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = verifySession(token);
  if (!uid) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const rows = (await db`
      SELECT id, email, name, avatar_url FROM users WHERE id = ${uid} LIMIT 1
    `) as { id: string; email: string; name: string | null; avatar_url: string | null }[];
    if (rows.length === 0) return null;
    const r = rows[0];
    return { id: r.id, email: r.email, name: r.name, avatarUrl: r.avatar_url };
  } catch (err) {
    console.error("[auth] getSessionUser: query database gagal:", err);
    throw new Error("session_db_error");
  }
}

/** Set cookie session. False kalau SESSION_SECRET belum benar. */
export async function setSessionCookie(uid: string): Promise<boolean> {
  const token = signSession(uid);
  if (!token) return false;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return true;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** State acak untuk CSRF protection di flow OAuth. */
export function newOAuthState(): string {
  return randomBytes(16).toString("base64url");
}
