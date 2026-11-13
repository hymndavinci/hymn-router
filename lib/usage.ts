/**
 * usage.ts — agregasi pemakaian per user untuk dashboard (server-side only).
 *
 * Yang dicatat di DB hanya jumlah request, token, provider, dan latensi.
 * Prompt & isi response TIDAK pernah disimpan.
 */

import { getDb } from "./db";

export type UsageSummary = {
  /** Jendela agregasi, dalam hari. */
  days: number;
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  byProvider: { provider: string; requests: number; tokens: number }[];
};

const EMPTY = (days: number): UsageSummary => ({
  days,
  totalRequests: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,
  byProvider: [],
});

/**
 * Ringkasan pemakaian. MELEMPAR kalau query DB gagal — kegagalan DB tidak
 * boleh disamarkan jadi "0 request" (pemakaian 0 yang palsu). Kedua
 * caller (dashboard page & /api/dashboard/usage) sudah menangkap error
 * ini dan menampilkan pesan database error.
 */
export async function getUsageSummary(userId: string, days = 7): Promise<UsageSummary> {
  const db = getDb();
  if (!db) return EMPTY(days);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const totals = (await db`
    SELECT
      COUNT(*)::int AS requests,
      COALESCE(SUM(prompt_tokens), 0)::int AS prompt_tokens,
      COALESCE(SUM(completion_tokens), 0)::int AS completion_tokens
    FROM usage
    WHERE user_id = ${userId} AND created_at >= ${cutoff}
  `) as { requests: number; prompt_tokens: number; completion_tokens: number }[];
  const perProvider = (await db`
    SELECT
      provider,
      COUNT(*)::int AS requests,
      COALESCE(SUM(prompt_tokens + completion_tokens), 0)::int AS tokens
    FROM usage
    WHERE user_id = ${userId} AND created_at >= ${cutoff}
    GROUP BY provider
    ORDER BY requests DESC
  `) as { provider: string; requests: number; tokens: number }[];
  const t = totals[0] ?? { requests: 0, prompt_tokens: 0, completion_tokens: 0 };
  return {
    days,
    totalRequests: t.requests,
    totalPromptTokens: t.prompt_tokens,
    totalCompletionTokens: t.completion_tokens,
    totalTokens: t.prompt_tokens + t.completion_tokens,
    byProvider: perProvider.map((p) => ({
      provider: p.provider,
      requests: p.requests,
      tokens: p.tokens,
    })),
  };
}

export type ModelUsage = {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
};

/** Breakdown pemakaian per model (jendela N hari terakhir). */
export async function getModelBreakdown(userId: string, days = 7): Promise<ModelUsage[]> {
  const db = getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = (await db`
    SELECT
      model,
      provider,
      COUNT(*)::int AS requests,
      COALESCE(SUM(prompt_tokens + completion_tokens), 0)::int AS tokens
    FROM usage
    WHERE user_id = ${userId} AND created_at >= ${cutoff}
    GROUP BY model, provider
    ORDER BY requests DESC
  `) as ModelUsage[];
  return rows;
}

export type DailyUsage = {
  /** tanggal Jakarta, format YYYY-MM-DD */
  date: string;
  requests: number;
  tokens: number;
};

/** Pemakaian harian N hari terakhir (zona Asia/Jakarta, hari kosong diisi 0). */
export async function getDailyUsage(userId: string, days = 7): Promise<DailyUsage[]> {
  const db = getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = (await db`
    SELECT
      (created_at AT TIME ZONE 'Asia/Jakarta')::date::text AS day,
      COUNT(*)::int AS requests,
      COALESCE(SUM(prompt_tokens + completion_tokens), 0)::int AS tokens
    FROM usage
    WHERE user_id = ${userId} AND created_at >= ${cutoff}
    GROUP BY day
    ORDER BY day ASC
  `) as { day: string; requests: number; tokens: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out: DailyUsage[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const date = fmt.format(d); // YYYY-MM-DD
    const r = byDay.get(date);
    out.push({
      date,
      requests: r ? r.requests : 0,
      tokens: r ? r.tokens : 0,
    });
  }
  return out;
}

export type RecentRequest = {
  id: string;
  createdAt: string;
  model: string;
  provider: string;
  tokens: number;
  latencyMs: number | null;
  keyName: string | null;
  keyPrefix: string | null;
};

/** Request terakhir user (dengan nama API key yang dipakai). */
export async function getRecentRequests(
  userId: string,
  limit = 15,
): Promise<RecentRequest[]> {
  const db = getDb();
  if (!db) return [];
  const rows = (await db`
    SELECT
      u.id,
      u.created_at,
      u.model,
      u.provider,
      u.prompt_tokens,
      u.completion_tokens,
      u.latency_ms,
      k.name AS key_name,
      k.prefix AS key_prefix
    FROM usage u
    LEFT JOIN api_keys k ON k.id = u.api_key_id
    WHERE u.user_id = ${userId}
    ORDER BY u.created_at DESC
    LIMIT ${limit}
  `) as {
    id: string;
    created_at: string;
    model: string;
    provider: string;
    prompt_tokens: number;
    completion_tokens: number;
    latency_ms: number | null;
    key_name: string | null;
    key_prefix: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    model: r.model,
    provider: r.provider,
    tokens: r.prompt_tokens + r.completion_tokens,
    latencyMs: r.latency_ms,
    keyName: r.key_name,
    keyPrefix: r.key_prefix,
  }));
}

export type KeyUsage = {
  apiKeyId: string;
  keyName: string | null;
  keyPrefix: string | null;
  requests: number;
  tokens: number;
};

/** Pemakaian per API key (jendela N hari terakhir). */
export async function getKeyBreakdown(userId: string, days = 7): Promise<KeyUsage[]> {
  const db = getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = (await db`
    SELECT
      u.api_key_id,
      k.name AS key_name,
      k.prefix AS key_prefix,
      COUNT(*)::int AS requests,
      COALESCE(SUM(u.prompt_tokens + u.completion_tokens), 0)::int AS tokens
    FROM usage u
    LEFT JOIN api_keys k ON k.id = u.api_key_id
    WHERE u.user_id = ${userId} AND u.created_at >= ${cutoff}
    GROUP BY u.api_key_id, k.name, k.prefix
    ORDER BY requests DESC
  `) as {
    api_key_id: string;
    key_name: string | null;
    key_prefix: string | null;
    requests: number;
    tokens: number;
  }[];
  return rows.map((r) => ({
    apiKeyId: r.api_key_id,
    keyName: r.key_name,
    keyPrefix: r.key_prefix,
    requests: r.requests,
    tokens: r.tokens,
  }));
}

// ---- kuota harian gratis ----

/** Free plan: jumlah request /v1 ber-autentikasi per user per hari. */
export const DAILY_FREE_QUOTA = 100;

export type DailyQuota = {
  used: number;
  limit: number;
  remaining: number;
  /** ISO string tengah malam Jakarta berikutnya (waktu reset). */
  resetsAt: string;
  /** detik sampai reset (untuk header Retry-After). */
  retryAfterSeconds: number;
};

/**
 * Batas hari ini dalam zona Asia/Jakarta. Jakarta UTC+7 tanpa DST,
 * jadi awal hari UTC = tanggal Jakarta 00:00 dikurangi 7 jam.
 */
export function getJakartaDayBounds(now = new Date()): {
  dayStartUtc: Date;
  nextDayStartUtc: Date;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const dayStartUtc = new Date(Date.UTC(y, m - 1, d) - 7 * 60 * 60 * 1000);
  const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);
  return { dayStartUtc, nextDayStartUtc };
}

/**
 * Kuota /v1 hari ini untuk user (dihitung dari tabel usage, tanpa
 * migrasi baru). Mengembalikan null kalau DB tidak terkonfigurasi, dan
 * MELEMPAR kalau query gagal. Route /v1 mem-fail OPEN (request tetap
 * diizinkan) supaya gangguan DB tidak memblokir semua request.
 *
 * Catatan: request /api/ai/chat ber-autentikasi juga dicatat ke tabel
 * usage, jadi ikut menghabiskan kuota ini (tidak ada kolom `source`
 * untuk membedakannya).
 */
export async function getTodayQuota(
  userId: string,
  limit = DAILY_FREE_QUOTA,
  now = new Date(),
): Promise<DailyQuota | null> {
  const db = getDb();
  if (!db) return null;
  const { dayStartUtc, nextDayStartUtc } = getJakartaDayBounds(now);
  const rows = (await db`
    SELECT COUNT(*)::int AS count
    FROM usage
    WHERE user_id = ${userId} AND created_at >= ${dayStartUtc.toISOString()}
  `) as { count: number }[];
  const used = rows[0]?.count ?? 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: nextDayStartUtc.toISOString(),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((nextDayStartUtc.getTime() - now.getTime()) / 1000),
    ),
  };
}
