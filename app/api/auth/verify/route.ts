/**
 * POST /api/auth/verify — verifikasi kode pendaftaran email.
 *
 * Body JSON: { email, code } (code: 6 digit).
 * Sukses (200): akun dibuat dari pending_signups, pending dihapus,
 * session cookie dibuat — { ok: true, user: { id, email, name } }.
 *
 * - Pending tidak ada -> 401 { error: "invalid_code" } (disamakan
 *   dengan kode salah — 404 yang berbeda akan membocorkan apakah
 *   sebuah email sedang punya pending signup; termasuk bila tabel
 *   pending_signups belum ada).
 * - Kode kedaluwarsa -> 410 { error: "verification_expired" }
 *   (pending dihapus, daftar ulang untuk kode baru).
 * - Percobaan habis (>= 5) -> 429 { error: "too_many_attempts" }
 *   (pending dihapus, daftar ulang untuk kode baru).
 * - Kode salah -> 401 { error: "invalid_code", attemptsRemaining }.
 *   Penghitung percobaan dinaikkan secara atomik di database
 *   (UPDATE ... SET attempts = attempts + 1) supaya tebakan paralel
 *   tidak bisa mengakali batas 5 percobaan.
 * - Email sudah terdaftar di users (race dengan OAuth) -> 409.
 *
 * Rate limit: 10 percobaan per 15 menit per IP. Kode tidak pernah
 * di-log.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { isForeignOrigin, isSessionConfigured, setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimitedWindow } from "@/lib/rate-limit";
import {
  isCodeFormat,
  MAX_ATTEMPTS,
  verifyCode,
} from "@/lib/verification";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

function isPgCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === code
  );
}

type Pending = {
  email: string;
  name: string;
  password_hash: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
};

export async function POST(req: NextRequest) {
  // Verify yang sukses membuat session — tolak POST cross-site
  // (login CSRF). Request tanpa Origin (curl/API client) diizinkan.
  if (isForeignOrigin(req)) {
    return NextResponse.json(
      { error: "forbidden", message: "Origin tidak diizinkan." },
      { status: 403 },
    );
  }
  const ip = clientIp(req);
  if (rateLimitedWindow(`verify:${ip}`, VERIFY_LIMIT, VERIFY_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak percobaan verifikasi — silakan coba lagi dalam 15 menit.",
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
  const { email, code } = (body ?? {}) as { email?: unknown; code?: unknown };
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "invalid_email", message: "Format email tidak valid." },
      { status: 400 },
    );
  }
  if (!isCodeFormat(code)) {
    return NextResponse.json(
      { error: "invalid_code", message: "Kode harus 6 digit." },
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
      SELECT email, name, password_hash, code_hash, attempts, expires_at
      FROM pending_signups WHERE email = ${normalizedEmail} LIMIT 1
    `) as Pending[];
    if (rows.length === 0) {
      // Disamakan dengan kode salah (401) — jangan 404: respons yang
      // berbeda akan membocorkan apakah email ini punya pending signup.
      return NextResponse.json(
        {
          error: "invalid_code",
          message: "Kode salah atau sudah tidak berlaku — silakan periksa kembali kode di email Anda.",
        },
        { status: 401 },
      );
    }
    const pending = rows[0];

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await db`DELETE FROM pending_signups WHERE email = ${normalizedEmail}`;
      return NextResponse.json(
        {
          error: "verification_expired",
          message: "Kode sudah kedaluwarsa — silakan daftar ulang untuk kode baru.",
        },
        { status: 410 },
      );
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await db`DELETE FROM pending_signups WHERE email = ${normalizedEmail}`;
      return NextResponse.json(
        {
          error: "too_many_attempts",
          message: "Terlalu banyak percobaan salah — silakan daftar ulang untuk kode baru.",
        },
        { status: 429 },
      );
    }

    if (!verifyCode(code, pending.code_hash)) {
      // Atomik: nilai lama tidak dibaca dulu — tebakan paralel tidak
      // bisa berbagi satu hitungan percobaan.
      const updated = (await db`
        UPDATE pending_signups SET attempts = attempts + 1
        WHERE email = ${normalizedEmail} AND attempts < ${MAX_ATTEMPTS}
        RETURNING attempts
      `) as { attempts: number }[];
      const attempts = updated.length > 0 ? updated[0].attempts : MAX_ATTEMPTS;
      return NextResponse.json(
        {
          error: "invalid_code",
          message: "Kode salah — silakan periksa kembali kode di email Anda.",
          attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts),
        },
        { status: 401 },
      );
    }

    // Kode benar. Jaga race: email bisa saja sudah terdaftar lewat
    // OAuth sejak signup dimulai.
    const existing = (await db`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as { id: string }[];
    if (existing.length > 0) {
      await db`DELETE FROM pending_signups WHERE email = ${normalizedEmail}`;
      return NextResponse.json(
        { error: "email_exists", message: "Email sudah terdaftar, silakan masuk." },
        { status: 409 },
      );
    }

    // Cek session SEBELUM membuat akun: kalau SESSION_SECRET belum
    // benar, jangan sisakan akun yang terbuat tapi tidak bisa login.
    if (!isSessionConfigured()) {
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "SESSION_SECRET belum dikonfigurasi di server.",
        },
        { status: 503 },
      );
    }

    const users = (await db`
      INSERT INTO users (email, name, password_hash)
      VALUES (${normalizedEmail}, ${pending.name === "" ? null : pending.name}, ${pending.password_hash})
      RETURNING id, email, name
    `) as { id: string; email: string; name: string | null }[];
    if (users.length === 0) {
      return NextResponse.json(
        { error: "database_error", message: "Gagal membuat akun." },
        { status: 503 },
      );
    }
    await db`DELETE FROM pending_signups WHERE email = ${normalizedEmail}`;

    const ok = await setSessionCookie(users[0].id);
    if (!ok) {
      return NextResponse.json(
        {
          error: "server_not_configured",
          message: "SESSION_SECRET belum dikonfigurasi di server.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, user: users[0] }, { status: 200 });
  } catch (err) {
    // Tabel pending_signups belum ada (migrasi 004 belum dijalankan):
    // tanpa tabel, tidak mungkin ada pending — hasilnya sama seperti
    // kode salah (401, disamakan — lihat di atas). Dicatat di log
    // server supaya tidak diam-diam.
    if (isPgCode(err, "42P01")) {
      console.warn("[auth/verify] tabel pending_signups belum ada — migrasi 004 belum dijalankan");
      return NextResponse.json(
        {
          error: "invalid_code",
          message: "Kode salah atau sudah tidak berlaku — silakan periksa kembali kode di email Anda.",
        },
        { status: 401 },
      );
    }
    // Race insert user (unique index email).
    if (isPgCode(err, "23505")) {
      return NextResponse.json(
        { error: "email_exists", message: "Email sudah terdaftar, silakan masuk." },
        { status: 409 },
      );
    }
    console.error("[auth/verify] database error:", err);
    return NextResponse.json(
      { error: "database_error", message: "Gagal memverifikasi, silakan coba lagi sebentar." },
      { status: 503 },
    );
  }
}
