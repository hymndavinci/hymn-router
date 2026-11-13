/**
 * POST /api/auth/verify/resend — kirim ulang kode verifikasi pendaftaran.
 *
 * Body JSON: { email }.
 * Sukses (200): { ok: true, email } — kode baru dikirim, masa berlaku
 * diperpanjang 10 menit, percobaan direset ke 0.
 *
 * - Pending tidak ada -> 404 { error: "verification_not_found" }
 *   (termasuk bila tabel pending_signups belum ada — tanpa tabel,
 *   tidak mungkin ada pending).
 * - Dalam jeda 60 detik sejak pengiriman terakhir -> 429
 *   { error: "resend_too_soon", retryAfterSeconds }.
 * - Lebih dari 5 pengiriman/jam untuk email ini (dihitung bersama
 *   signup — kunci bucket yang sama) -> 429 { error: "rate_limited" }.
 * - Pengiriman email gagal -> 502 { error: "email_send_failed" }
 *   (pending lama tidak diubah — kode lama tetap berlaku sampai
 *   kedaluwarsa).
 *
 * Pending yang sudah kedaluwarsa BOLEH diperpanjang lewat kirim ulang
 * (kode baru + masa berlaku baru) — sama amannya dengan daftar ulang,
 * karena menyelesaikan pendaftaran tetap butuh akses ke inbox email.
 *
 * Rate limit: 10 percobaan per 15 menit per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { clientIp, rateLimitedWindow } from "@/lib/rate-limit";
import { sendVerificationCode } from "@/lib/mail";
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
const RESEND_LIMIT = 10;
const RESEND_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_SEND_WINDOW_MS = 60 * 60 * 1000;

function isPgCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === code
  );
}

type Pending = {
  email: string;
  last_sent_at: string;
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimitedWindow(`verify-resend:${ip}`, RESEND_LIMIT, RESEND_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak permintaan kirim ulang — silakan coba lagi dalam 15 menit.",
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

  // Batas pengiriman kode per email (anti spam inbox) — kunci bucket
  // SAMA dengan signup, supaya signup + kirim ulang dihitung bersama
  // menuju batas 5/jam/email.
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
    const rows = (await db`
      SELECT email, last_sent_at FROM pending_signups
      WHERE email = ${normalizedEmail} LIMIT 1
    `) as Pending[];
    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: "verification_not_found",
          message: "Verifikasi tidak ditemukan — silakan daftar ulang.",
        },
        { status: 404 },
      );
    }

    const lastSent = new Date(rows[0].last_sent_at).getTime();
    const waitMs = lastSent + RESEND_COOLDOWN_MS - Date.now();
    if (waitMs > 0) {
      return NextResponse.json(
        {
          error: "resend_too_soon",
          message: "Kode baru saja dikirim — silakan tunggu sebentar sebelum meminta lagi.",
          retryAfterSeconds: Math.ceil(waitMs / 1000),
        },
        { status: 429 },
      );
    }

    // Kirim dulu, baru perbarui baris: kalau pengiriman gagal, kode
    // lama tetap berlaku sampai kedaluwarsa.
    const code = generateCode();
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    try {
      await sendVerificationCode(normalizedEmail, code, locale);
    } catch (err) {
      console.error("[auth/verify/resend] pengiriman kode gagal:", err);
      return NextResponse.json(
        {
          error: "email_send_failed",
          message: "Kode gagal dikirim — silakan coba lagi sebentar.",
        },
        { status: 502 },
      );
    }
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    await db`
      UPDATE pending_signups
      SET code_hash = ${hashCode(code)}, attempts = 0,
          expires_at = ${expiresAt}, last_sent_at = now()
      WHERE email = ${normalizedEmail}
    `;
    return NextResponse.json({ ok: true, email: normalizedEmail }, { status: 200 });
  } catch (err) {
    // Tabel pending_signups belum ada (migrasi 004 belum dijalankan):
    // tanpa tabel, tidak mungkin ada pending — sama seperti
    // "tidak ditemukan". Dicatat di log server.
    if (isPgCode(err, "42P01")) {
      console.warn("[auth/verify/resend] tabel pending_signups belum ada — migrasi 004 belum dijalankan");
      return NextResponse.json(
        {
          error: "verification_not_found",
          message: "Verifikasi tidak ditemukan — silakan daftar ulang.",
        },
        { status: 404 },
      );
    }
    console.error("[auth/verify/resend] database error:", err);
    return NextResponse.json(
      { error: "database_error", message: "Gagal mengirim ulang kode, silakan coba lagi sebentar." },
      { status: 503 },
    );
  }
}
