/**
 * password.ts — hash & verifikasi password pakai scrypt (node:crypto),
 * tanpa dependensi baru.
 *
 * Format simpan: `scrypt$<salt-hex>$<hash-hex>` (salt 16 byte, hash 64 byte).
 * Parameter scrypt: N=16384, r=8, p=1 — sekitar 50-100 ms per hash di
 * server biasa: cukup berat untuk brute force, cukup ringan untuk login
 * interaktif. Password asli tidak pernah disimpan atau di-log.
 *
 * Server-side only — jangan pernah import ini di client component.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALTLEN = 16;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Hash password baru. Format hasil: `scrypt$<salt-hex>$<hash-hex>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALTLEN);
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Verifikasi password terhadap hash tersimpan. False untuk format yang
 * tidak dikenali (bukan error) — akun lama / data rusak tidak boleh
 * melempar. Perbandingan memakai timingSafeEqual.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "hex");
    expected = Buffer.from(parts[2], "hex");
  } catch {
    return false;
  }
  if (salt.length !== SALTLEN || expected.length !== KEYLEN) return false;
  const actual = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return timingSafeEqual(actual, expected);
}
