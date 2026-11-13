/**
 * rate-limit.ts — fixed-window limiter in-memory, per proses server.
 *
 * Satu bucket per key (IP atau API key id), jendela 60 detik. Dipakai
 * untuk limit per key di /v1 dan /api/ai/chat (Bearer). Untuk produksi
 * serius (multi-instance), ganti dengan Redis/Upstash.
 */

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function gc(now: number): void {
  if (buckets.size < 10_000) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

/** True kalau key sudah melewati maxPerMinute dalam jendela berjalan. */
export function rateLimited(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  gc(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > maxPerMinute;
}
