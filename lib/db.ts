/**
 * db.ts — koneksi Neon Postgres (server-side only).
 *
 * Lazy: kalau DATABASE_URL kosong, getDb() mengembalikan null dan semua
 * fitur yang butuh DB (login, API key, usage) gagal dengan pesan setup
 * yang jelas — landing & playground anonim tetap jalan normal.
 *
 * Satu-satunya driver: @neondatabase/serverless (HTTP, tanpa koneksi
 * persisten — cocok untuk serverless Vercel).
 */

import { neon } from "@neondatabase/serverless";

type NeonClient = ReturnType<typeof neon>;

let client: NeonClient | null = null;

export function isDbConfigured(): boolean {
  const v = process.env.DATABASE_URL;
  return !!v && v.trim() !== "";
}

/** Client Neon yang di-cache per proses, atau null kalau belum dikonfigurasi. */
export function getDb(): NeonClient | null {
  if (!isDbConfigured()) return null;
  if (!client) client = neon(process.env.DATABASE_URL as string);
  return client;
}
