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
