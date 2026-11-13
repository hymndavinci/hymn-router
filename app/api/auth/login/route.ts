/**
 * POST /api/auth/login — masuk dengan email + password.
 *
 * Body JSON: { email, password }.
 * Sukses: session cookie + { ok: true, user: { id, email, name } }.
 * Rate limit: 10 percobaan per 15 menit per IP.
 *
 * Anti-enumerasi: email yang tidak ada dan password yang salah sama-sama
 * dibalas 401 generik "Email atau password salah". Untuk email yang tidak
 * ada, tetap dijalankan verifikasi dummy terhadap hash acak supaya
 * timing-nya mirip (tidak bisa dibedakan dari password salah).
 * Akun yang dibuat lewat OAuth (password_hash NULL) dibalas 401 khusus
 * { error: "oauth_only" } yang mengarahkan ke tombol Google/GitHub.
 *
 * Password tidak pernah di-log atau dikembalikan di respons.
 */

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimitedWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const GENERIC_FAIL = "Email atau password salah.";

/** Hash acak untuk verifikasi dummy (dihitung sekali per proses). */
let dummyHash: string | null = null;
function getDummyHash(): string {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

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
  if (rateLimitedWindow(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak percobaan login — silakan coba lagi dalam 15 menit.",
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
  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
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
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: "invalid_password", message: "Password wajib diisi." },
      { status: 400 },
    );
  }

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
    const rows = (await db`
      SELECT id, email, name, password_hash FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as {
      id: string;
      email: string;
      name: string | null;
      password_hash: string | null;
    }[];

    if (rows.length === 0) {
      // Email tidak ada — verifikasi dummy supaya timing mirip.
      verifyPassword(password, getDummyHash());
      return NextResponse.json(
        { error: "invalid_credentials", message: GENERIC_FAIL },
        { status: 401 },
      );
    }

    const user = rows[0];
    if (!user.password_hash) {
      return NextResponse.json(
        {
          error: "oauth_only",
          message:
            "Akun ini dibuat melalui Google/GitHub, silakan masuk dengan tombol tersebut.",
        },
        { status: 401 },
      );
    }
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "invalid_credentials", message: GENERIC_FAIL },
        { status: 401 },
      );
    }

    const ok = await setSessionCookie(user.id);
    if (!ok) {
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "SESSION_SECRET belum dikonfigurasi di server.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    // Kolom password_hash belum ada — migrasi 002 belum dijalankan.
    if (isPgCode(err, "42703")) {
      console.error("[auth/login] kolom password_hash belum ada — migrasi 002 belum dijalankan");
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "Migrasi database belum dijalankan di server (002_auth).",
        },
        { status: 503 },
      );
    }
    console.error("[auth/login] database error:", err);
    return NextResponse.json(
      { error: "database_error", message: "Gagal masuk, silakan coba lagi sebentar." },
      { status: 503 },
    );
  }
}
