/**
 * POST /api/auth/forgot-password — minta kode reset password.
 *
 * Body JSON: { email }.
 *
 * SELALU mengembalikan 200 generik bila input valid — JANGAN pernah
 * mengungkap apakah email terdaftar atau tidak (anti-enumerasi).
 * Kode hanya benar-benar dikirim bila user ada DAN punya password_hash
 * (akun OAuth-only tidak dikirimi kode — password mereka tidak ada
 * di sini; respons tetap 200).
 *
 * Pengecualian yang TIDAK membocorkan keberadaan email (semuanya
 * diputuskan SEBELUM memeriksa apakah user ada):
 * - 400 invalid_email (format salah),
 * - 429 rate_limited (10 percobaan/15 menit/IP, atau 5 permintaan/
 *   jam/email — dihitung dari semua percobaan, terdaftar atau tidak),
 * - 503 email_not_configured (RESEND_API_KEY belum diisi — tanpa
 *   email, reset mustahil; tidak ada fallback),
 * - 503 server_not_configured (DATABASE_URL belum diisi).
 *
 * Setelah user dipastikan ada, SEMUA kegagalan (tabel belum ada,
 * pengiriman email gagal, error DB) tetap dibalas 200 generik dan
 * hanya dicatat di log server — membalas error di titik itu akan
 * membocorkan bahwa email tersebut terdaftar. Jeda kirim ulang
 * 60 detik juga ditegakkan secara diam-diam (tidak ada email baru
 * yang dikirim, respons tetap 200).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { clientIp, rateLimitedWindow } from "@/lib/rate-limit";
import { isEmailConfigured, sendPasswordResetCode } from "@/lib/mail";
import {
  CODE_TTL_MS,
  generateCode,
  hashCode,
  MAX_SENDS_PER_HOUR,
  RESEND_COOLDOWN_MS,
} from "@/lib/verification";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORGOT_LIMIT = 10;
const FORGOT_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_SEND_WINDOW_MS = 60 * 60 * 1000;
/**
 * Respons generik di-pad sampai minimal selama ini (ms): jalur
 * "email tidak terdaftar" yang langsung kembali akan jauh lebih
 * cepat dari jalur asli (upsert + kirim email) dan menjadi oracle
 * timing yang membocorkan keberadaan email. Hash dummy scrypt
 * (biaya sama seperti hash kode asli) + jeda sampai batas ini
 * membuat kedua jalur tidak lagi mudah dibedakan dari timing.
 */
const MIN_RESPONSE_MS = 500;

/** Respons generik — sama persis untuk email terdaftar maupun tidak. */
function genericOk() {
  return NextResponse.json(
    {
      ok: true,
      message: "Jika email terdaftar, kode reset telah dikirim.",
    },
    { status: 200 },
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
  if (rateLimitedWindow(`forgot:${ip}`, FORGOT_LIMIT, FORGOT_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak permintaan reset — silakan coba lagi dalam 15 menit.",
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
  const { email } = (body ?? {}) as { email?: unknown };
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "invalid_email", message: "Format email tidak valid." },
      { status: 400 },
    );
  }

  // Batas per email dihitung dari SEMUA percobaan (terdaftar/tidak),
  // supaya 429 tidak membocorkan keberadaan email.
  if (
    rateLimitedWindow(`forgot-email:${normalizedEmail}`, MAX_SENDS_PER_HOUR, EMAIL_SEND_WINDOW_MS)
  ) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak permintaan reset untuk email ini — silakan coba lagi dalam satu jam.",
      },
      { status: 429 },
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error: "email_not_configured",
        message: "Pengiriman email belum dikonfigurasi di server.",
      },
      { status: 503 },
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

  // Mulai dari sini: JANGAN pernah membalas selain 200 generik.
  // Kegagalan apa pun hanya dicatat di log server.
  const started = Date.now();
  // Kerja dummy + padding waktu untuk jalur yang kembali lebih awal
  // (lihat MIN_RESPONSE_MS): samarkan perbedaan timing dengan jalur
  // yang benar-benar mengirim email.
  const padEarlyReturn = async () => {
    hashCode(generateCode());
    const elapsed = Date.now() - started;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
  };
  try {
    const users = (await db`
      SELECT id, password_hash FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as { id: string; password_hash: string | null }[];
    // Email tidak terdaftar, atau akun OAuth-only (tanpa password):
    // tidak ada kode yang dikirim, respons tetap generik.
    if (users.length === 0 || !users[0].password_hash) {
      await padEarlyReturn();
      return genericOk();
    }

    // Jeda kirim ulang 60 detik — ditegakkan diam-diam.
    const existing = (await db`
      SELECT last_sent_at FROM password_resets WHERE email = ${normalizedEmail} LIMIT 1
    `) as { last_sent_at: string }[];
    if (existing.length > 0) {
      const lastSent = new Date(existing[0].last_sent_at).getTime();
      if (lastSent + RESEND_COOLDOWN_MS > Date.now()) {
        await padEarlyReturn();
        return genericOk();
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    await db`
      INSERT INTO password_resets (email, code_hash, attempts, expires_at, last_sent_at, created_at)
      VALUES (${normalizedEmail}, ${hashCode(code)}, 0, ${expiresAt}, now(), now())
      ON CONFLICT (email) DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        attempts = 0,
        expires_at = EXCLUDED.expires_at,
        last_sent_at = now(),
        created_at = now()
    `;
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    try {
      await sendPasswordResetCode(normalizedEmail, code, locale);
    } catch (err) {
      console.error("[auth/forgot-password] pengiriman kode reset gagal:", err);
      await db`DELETE FROM password_resets WHERE email = ${normalizedEmail}`.catch(
        () => undefined,
      );
    }
    return genericOk();
  } catch (err) {
    if (isPgCode(err, "42P01")) {
      console.warn("[auth/forgot-password] tabel password_resets belum ada — migrasi 004 belum dijalankan");
    } else {
      console.error("[auth/forgot-password] database error:", err);
    }
    return genericOk();
  }
}
