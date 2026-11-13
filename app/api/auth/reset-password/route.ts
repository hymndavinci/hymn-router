/**
 * POST /api/auth/reset-password — ganti password dengan kode reset.
 *
 * Body JSON: { email, code, newPassword } (code: 6 digit, password
 * baru 8–128 karakter — aturan sama seperti signup).
 * Sukses (200): { ok: true } — password_hash diperbarui, record reset
 * dihapus. TIDAK membuat session: user masuk lagi dengan password baru.
 *
 * - Reset tidak ada -> 401 { error: "invalid_code" } (disamakan
 *   dengan kode salah — 404 yang berbeda akan membocorkan apakah
 *   sebuah email adalah akun password yang baru meminta reset;
 *   termasuk bila tabel password_resets belum ada).
 * - Kode kedaluwarsa -> 410 { error: "reset_expired" }
 *   (record dihapus, minta kode baru).
 * - Percobaan habis (>= 5) -> 429 { error: "too_many_attempts" }
 *   (record dihapus, minta kode baru).
 * - Kode salah -> 401 { error: "invalid_code", attemptsRemaining }.
 *   Penghitung percobaan dinaikkan secara atomik di database
 *   (UPDATE ... SET attempts = attempts + 1) supaya tebakan paralel
 *   tidak bisa mengakali batas 5 percobaan.
 *
 * Rate limit: 10 percobaan per 15 menit per IP. Kode dan password
 * tidak pernah di-log.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { clientIp, rateLimitedWindow } from "@/lib/rate-limit";
import {
  isCodeFormat,
  MAX_ATTEMPTS,
  verifyCode,
} from "@/lib/verification";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_LIMIT = 10;
const RESET_WINDOW_MS = 15 * 60 * 1000;

function isPgCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === code
  );
}

type ResetRecord = {
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimitedWindow(`reset:${ip}`, RESET_LIMIT, RESET_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Terlalu banyak percobaan reset — silakan coba lagi dalam 15 menit.",
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
  const { email, code, newPassword } = (body ?? {}) as {
    email?: unknown;
    code?: unknown;
    newPassword?: unknown;
  };
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
  if (
    typeof newPassword !== "string" ||
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > MAX_PASSWORD_LENGTH
  ) {
    return NextResponse.json(
      {
        error: "invalid_password",
        message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter (maksimal ${MAX_PASSWORD_LENGTH}).`,
      },
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
      SELECT email, code_hash, attempts, expires_at
      FROM password_resets WHERE email = ${normalizedEmail} LIMIT 1
    `) as ResetRecord[];
    if (rows.length === 0) {
      // Disamakan dengan kode salah (401) — jangan 404: respons yang
      // berbeda akan membocorkan apakah email ini baru meminta reset.
      return NextResponse.json(
        {
          error: "invalid_code",
          message: "Kode salah atau sudah tidak berlaku — silakan periksa kembali kode di email Anda.",
        },
        { status: 401 },
      );
    }
    const record = rows[0];

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await db`DELETE FROM password_resets WHERE email = ${normalizedEmail}`;
      return NextResponse.json(
        {
          error: "reset_expired",
          message: "Kode sudah kedaluwarsa — silakan minta kode baru.",
        },
        { status: 410 },
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await db`DELETE FROM password_resets WHERE email = ${normalizedEmail}`;
      return NextResponse.json(
        {
          error: "too_many_attempts",
          message: "Terlalu banyak percobaan salah — silakan minta kode baru.",
        },
        { status: 429 },
      );
    }

    if (!verifyCode(code, record.code_hash)) {
      // Atomik: nilai lama tidak dibaca dulu — tebakan paralel tidak
      // bisa berbagi satu hitungan percobaan.
      const updated = (await db`
        UPDATE password_resets SET attempts = attempts + 1
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

    const updated = (await db`
      UPDATE users SET password_hash = ${hashPassword(newPassword)}
      WHERE email = ${normalizedEmail}
      RETURNING id
    `) as { id: string }[];
    await db`DELETE FROM password_resets WHERE email = ${normalizedEmail}`;
    if (updated.length === 0) {
      // Akun dihapus setelah kode diminta — reset tidak berarti lagi.
      // Disamakan dengan kode salah (401) supaya tidak membocorkan.
      return NextResponse.json(
        {
          error: "invalid_code",
          message: "Kode salah atau sudah tidak berlaku — silakan periksa kembali kode di email Anda.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Tabel password_resets belum ada (migrasi 004 belum dijalankan):
    // tanpa tabel, tidak mungkin ada reset — sama seperti kode salah
    // (401, disamakan — lihat di atas). Dicatat di log server.
    if (isPgCode(err, "42P01")) {
      console.warn("[auth/reset-password] tabel password_resets belum ada — migrasi 004 belum dijalankan");
      return NextResponse.json(
        {
          error: "invalid_code",
          message: "Kode salah atau sudah tidak berlaku — silakan periksa kembali kode di email Anda.",
        },
        { status: 401 },
      );
    }
    console.error("[auth/reset-password] database error:", err);
    return NextResponse.json(
      { error: "database_error", message: "Gagal mereset password, silakan coba lagi sebentar." },
      { status: 503 },
    );
  }
}
