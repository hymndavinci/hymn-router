/**
 * POST /api/auth/signup — daftar dengan email + password.
 *
 * Body JSON: { email, password, name? }.
 * Sukses (201): session cookie + { ok: true, user: { id, email, name } }.
 * Email sudah ada -> 409 { error: "email_exists" }.
 * Rate limit: 10 percobaan per 15 menit per IP.
 *
 * Password tidak pernah di-log atau dikembalikan di respons. Email
 * disimpan lowercase. Akun langsung aktif — belum ada verifikasi email.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";
import { rateLimitedWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const SIGNUP_LIMIT = 10;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isPgCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === code
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimitedWindow(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak percobaan daftar — silakan coba lagi dalam 15 menit.",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Body harus JSON." },
      { status: 400 },
    );
  }
  const { email, password, name } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
  };
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (
    !normalizedEmail ||
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL_RE.test(normalizedEmail)
  ) {
    return NextResponse.json(
      { error: "invalid_email", message: "Format email tidak valid." },
      { status: 400 },
    );
  }
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return NextResponse.json(
      {
        error: "invalid_password",
        message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter (maksimal ${MAX_PASSWORD_LENGTH}).`,
      },
      { status: 400 },
    );
  }
  const displayName =
    typeof name === "string" ? name.trim().slice(0, MAX_NAME_LENGTH) || null : null;

  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error: "server_not_configured",
        message: "Database belum dikonfigurasi di server.",
      },
      { status: 503 },
    );
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      {
        error: "server_not_configured",
        message: "Database belum dikonfigurasi di server.",
      },
      { status: 503 },
    );
  }

  try {
    const existing = (await db`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as { id: string }[];
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "email_exists", message: "Email sudah terdaftar, silakan masuk." },
        { status: 409 },
      );
    }

    const rows = (await db`
      INSERT INTO users (email, name, password_hash)
      VALUES (${normalizedEmail}, ${displayName}, ${hashPassword(password)})
      RETURNING id, email, name
    `) as { id: string; email: string; name: string | null }[];
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "database_error", message: "Gagal membuat akun." },
        { status: 503 },
      );
    }

    const ok = await setSessionCookie(rows[0].id);
    if (!ok) {
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "SESSION_SECRET belum dikonfigurasi di server.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, user: rows[0] }, { status: 201 });
  } catch (err) {
    // Race dengan signup lain di email yang sama (unique index email).
    if (isPgCode(err, "23505")) {
      return NextResponse.json(
        { error: "email_exists", message: "Email sudah terdaftar, silakan masuk." },
        { status: 409 },
      );
    }
    // Kolom password_hash belum ada — migrasi 002 belum dijalankan.
    if (isPgCode(err, "42703")) {
      console.error("[auth/signup] kolom password_hash belum ada — migrasi 002 belum dijalankan");
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "Migrasi database belum dijalankan di server (002_auth).",
        },
        { status: 503 },
      );
    }
    console.error("[auth/signup] database error:", err);
    return NextResponse.json(
      { error: "database_error", message: "Gagal membuat akun, silakan coba lagi sebentar." },
      { status: 503 },
    );
  }
}
