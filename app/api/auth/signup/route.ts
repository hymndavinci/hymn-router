/**
 * POST /api/auth/signup — daftar dengan email + password.
 *
 * Body JSON: { email, password, name? }.
 * Email sudah ada -> 409 { error: "email_exists" }.
 * Rate limit: 10 percobaan per 15 menit per IP, 5 pengiriman kode
 * per jam per email.
 *
 * Dua jalur, tergantung konfigurasi email server:
 *
 * 1. RESEND_API_KEY terisi (jalur verifikasi): akun TIDAK langsung
 *    dibuat. Data signup menunggu di pending_signups dan kode 6 digit
 *    dikirim ke email. Respons 202 { verificationRequired: true,
 *    email }. Akun dibuat oleh POST /api/auth/verify setelah kode
 *    benar. Kalau pengiriman email gagal -> 502 email_send_failed
 *    dan tidak ada akun yang dibuat.
 *
 * 2. RESEND_API_KEY belum diisi (fallback transisional, SENGAJA):
 *    perilaku lama — akun langsung dibuat dan aktif, 201 + session
 *    cookie. Fallback ini ada supaya pendaftaran tetap berfungsi
 *    sebelum layanan email dikonfigurasi; setelah Resend aktif,
 *    semua pendaftaran baru wajib verifikasi kode.
 *
 * Password tidak pernah di-log atau dikembalikan di respons. Email
 * disimpan lowercase. Kode verifikasi tidak pernah di-log.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { isForeignOrigin, isSessionConfigured, setSessionCookie } from "@/lib/auth";
import {
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";
import { clientIp, rateLimitedWindow } from "@/lib/rate-limit";
import { isEmailConfigured, sendVerificationCode } from "@/lib/mail";
import {
  CODE_TTL_MS,
  generateCode,
  hashCode,
  MAX_SENDS_PER_HOUR,
} from "@/lib/verification";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const SIGNUP_LIMIT = 10;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_SEND_WINDOW_MS = 60 * 60 * 1000;

function isPgCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === code
  );
}

export async function POST(req: NextRequest) {
  // Signup (jalur fallback) membuat session — tolak POST cross-site
  // (login CSRF). Request tanpa Origin (curl/API client) diizinkan.
  if (isForeignOrigin(req)) {
    return NextResponse.json(
      { error: "forbidden", message: "Origin tidak diizinkan." },
      { status: 403 },
    );
  }
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

  // Batas pengiriman kode per email (anti spam inbox) — dihitung dari
  // semua percobaan signup untuk email ini, sebelum menyentuh DB.
  if (
    rateLimitedWindow(`signup-email:${normalizedEmail}`, MAX_SENDS_PER_HOUR, EMAIL_SEND_WINDOW_MS)
  ) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak permintaan kode untuk email ini — silakan coba lagi dalam satu jam.",
      },
      { status: 429 },
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
    const existing = (await db`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as { id: string }[];
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "email_exists", message: "Email sudah terdaftar, silakan masuk." },
        { status: 409 },
      );
    }

    // --- Jalur verifikasi (email terkonfigurasi) ---
    if (isEmailConfigured()) {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
      // pending_signups.name NOT NULL — nama kosong disimpan "" dan
      // dikembalikan ke null saat akun dibuat di /api/auth/verify.
      await db`
        INSERT INTO pending_signups (email, name, password_hash, code_hash, attempts, expires_at, last_sent_at, created_at)
        VALUES (${normalizedEmail}, ${displayName ?? ""}, ${hashPassword(password)}, ${hashCode(code)}, 0, ${expiresAt}, now(), now())
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          code_hash = EXCLUDED.code_hash,
          attempts = 0,
          expires_at = EXCLUDED.expires_at,
          last_sent_at = now(),
          created_at = now()
      `;
      const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
      const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
      try {
        await sendVerificationCode(normalizedEmail, code, locale);
      } catch (err) {
        // Email gagal terkirim — jangan sisakan pending yang tidak bisa
        // diverifikasi, dan jangan buat akun.
        console.error("[auth/signup] pengiriman kode verifikasi gagal:", err);
        await db`DELETE FROM pending_signups WHERE email = ${normalizedEmail}`.catch(
          () => undefined,
        );
        return NextResponse.json(
          {
            error: "email_send_failed",
            message: "Kode verifikasi gagal dikirim — silakan coba lagi sebentar.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { verificationRequired: true, email: normalizedEmail },
        { status: 202 },
      );
    }

    // --- Fallback transisional: email belum dikonfigurasi ---
    // Akun langsung dibuat dan aktif (perilaku sebelum verifikasi ada).
    // Sengaja dipertahankan sampai RESEND_API_KEY diisi di server.
    // Cek session SEBELUM membuat akun: kalau SESSION_SECRET belum
    // benar, jangan sisakan akun yang terbuat tapi tidak bisa login
    // (retry-nya hanya akan menghasilkan 409 yang membingungkan).
    if (!isSessionConfigured()) {
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "SESSION_SECRET belum dikonfigurasi di server.",
        },
        { status: 503 },
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
    // Tabel pending_signups belum ada — migrasi 004 belum dijalankan.
    if (isPgCode(err, "42P01")) {
      console.error("[auth/signup] tabel pending_signups belum ada — migrasi 004 belum dijalankan");
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "Migrasi database belum dijalankan di server (004_email_verification).",
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
