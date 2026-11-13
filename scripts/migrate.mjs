#!/usr/bin/env node
/**
 * migrate.mjs — jalankan semua file db/migrations/*.sql ke DATABASE_URL.
 *
 *   npm run migrate
 *
 * DATABASE_URL dibaca dari environment, atau dari .env.local / .env kalau
 * ada (tanpa dependency dotenv — parser sederhana di bawah).
 * Idempotent: skema memakai CREATE TABLE IF NOT EXISTS.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Parser .env minimal: KEY=VALUE, abaikan komentar & baris kosong.
// Nilai yang sudah ada di environment tidak ditimpa.
function loadEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.DATABASE_URL;
if (!url || url.trim() === "") {
  console.error("DATABASE_URL belum diisi. Isi di environment atau .env.local (lihat docs/setup.md).");
  process.exit(1);
}

const migrationsDir = join(root, "db", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("Tidak ada file migrasi di db/migrations/.");
  process.exit(1);
}

const sql = neon(url);

for (const file of files) {
  const text = readFileSync(join(migrationsDir, file), "utf8");
  // DDL di file ini sederhana (CREATE TABLE / INDEX) — split per statement aman.
  // Hapus baris komentar dulu: kalau tidak, statement pertama (yang diawali
  // baris "-- ...") ikut terbuang oleh filter di bawah.
  const statements = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  console.log(`→ ${file}: ${statements.length} statement...`);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`  OK ${file}`);
}

console.log("Migrasi selesai.");
