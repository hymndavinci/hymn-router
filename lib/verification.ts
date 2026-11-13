/**
 * verification.ts — kode verifikasi 6 digit untuk signup & reset password.
 *
 * Kode dibuat dengan crypto.randomInt (100000–999999, selalu 6 digit,
 * digit pertama tidak pernah 0). Kode di-hash dengan scrypt yang sama
 * seperti password (lib/password.ts) — kode mentah tidak pernah
 * disimpan di database maupun di-log.
 *
 * Konstanta dipakai bersama oleh alur signup (/api/auth/verify) dan
 * lupa password (/api/auth/reset-password): TTL 10 menit, maksimal 5
 * percobaan per kode, jeda kirim ulang 60 detik, maksimal 5 pengiriman
 * per jam per email.
 *
 * Server-side only — jangan pernah import ini di client component.
 */

import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "./password";

/** Masa berlaku kode: 10 menit. */
export const CODE_TTL_MS = 10 * 60 * 1000;
/** Percobaan salah maksimal sebelum kode hangus. */
export const MAX_ATTEMPTS = 5;
/** Jeda minimal antar pengiriman kode ke email yang sama: 60 detik. */
export const RESEND_COOLDOWN_MS = 60 * 1000;
/** Pengiriman kode maksimal per jam per email (anti spam inbox). */
export const MAX_SENDS_PER_HOUR = 5;

/** Kode 6 digit acak, sebagai string ("100000"–"999999"). */
export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Hash kode dengan scrypt (format sama seperti hash password). */
export function hashCode(code: string): string {
  return hashPassword(code);
}

/** Verifikasi kode terhadap hash tersimpan (timing-safe). */
export function verifyCode(code: string, stored: string): boolean {
  return verifyPassword(code, stored);
}

/** Format kode yang valid: tepat 6 digit. */
export function isCodeFormat(code: unknown): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code);
}
