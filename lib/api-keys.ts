/**
 * api-keys.ts — API key per user (server-side only).
 *
 * Format key: hr_ + 24 byte acak (base64url). Yang disimpan di DB HANYA
 * hash SHA-256 + prefix 12 karakter untuk display. Key utuh ditampilkan
 * SEKALI saat dibuat — sesudahnya tidak bisa dilihat lagi.
 *
 * Jangan pernah log key utuh. Kalau butuh log, pakai prefix saja.
 */

import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";

export type ApiKeyInfo = {
  id: string;
  prefix: string;
  name: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export type CreatedApiKey = {
  id: string;
  /** Key utuh — hanya tersedia di return ini, tidak tersimpan di mana pun. */
  key: string;
  prefix: string;
  name: string;
  createdAt: string;
};

export type ValidatedKey = { userId: string; keyId: string };

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): string {
  return `hr_${randomBytes(24).toString("base64url")}`;
}

/** Buat key baru untuk user. Null kalau DB belum dikonfigurasi. */
export async function createApiKey(
  userId: string,
  name: string,
): Promise<CreatedApiKey | null> {
  const db = getDb();
  if (!db) return null;
  const key = generateApiKey();
  const prefix = key.slice(0, 12);
  const rows = (await db`
    INSERT INTO api_keys (user_id, key_hash, prefix, name)
    VALUES (${userId}, ${hashKey(key)}, ${prefix}, ${name})
    RETURNING id, created_at
  `) as { id: string; created_at: string }[];
  return { id: rows[0].id, key, prefix, name, createdAt: rows[0].created_at };
}

/**
 * Validasi key mentah. Mengembalikan userId + keyId kalau key ada dan
 * belum di-revoke, atau null. Update last_used_at fire-and-forget.
 */
export async function validateApiKey(rawKey: string): Promise<ValidatedKey | null> {
  const db = getDb();
  if (!db || !rawKey) return null;
  const rows = (await db`
    SELECT id, user_id FROM api_keys
    WHERE key_hash = ${hashKey(rawKey)} AND revoked_at IS NULL
    LIMIT 1
  `) as { id: string; user_id: string }[];
  if (rows.length === 0) return null;
  const r = rows[0];
  // Fire-and-forget: jangan gagalkan request kalau update ini gagal.
  void db`UPDATE api_keys SET last_used_at = now() WHERE id = ${r.id}`.catch(() => {});
  return { userId: r.user_id, keyId: r.id };
}

export async function listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  const db = getDb();
  if (!db) return [];
  const rows = (await db`
    SELECT id, prefix, name, revoked_at, last_used_at, created_at
    FROM api_keys WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as {
    id: string;
    prefix: string;
    name: string;
    revoked_at: string | null;
    last_used_at: string | null;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    prefix: r.prefix,
    name: r.name,
    revokedAt: r.revoked_at,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
  }));
}

/** Revoke key milik user. False kalau key tidak ada / bukan milik user / sudah di-revoke. */
export async function revokeApiKey(id: string, userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const rows = (await db`
    UPDATE api_keys SET revoked_at = now()
    WHERE id = ${id} AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export type UsageEntry = {
  userId: string;
  apiKeyId: string | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
};

/**
 * Catat satu request ke tabel usage. Tidak pernah melempar — logging
 * yang gagal tidak boleh menggagalkan request chat user.
 */
export async function logUsage(entry: UsageEntry): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await db`
      INSERT INTO usage (user_id, api_key_id, provider, model, prompt_tokens, completion_tokens, latency_ms)
      VALUES (${entry.userId}, ${entry.apiKeyId}, ${entry.provider}, ${entry.model},
              ${entry.promptTokens}, ${entry.completionTokens}, ${entry.latencyMs})
    `;
  } catch {
    // Sengaja diam: usage logging tidak boleh memengaruhi request.
  }
}
