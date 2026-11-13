/**
 * rate-limit.ts — fixed-window limiter in-memory, per proses server.
 *
 * Satu bucket per key (IP atau API key id), jendela 60 detik. Dipakai
 * untuk limit per key di /v1 dan /api/ai/chat (Bearer). Untuk produksi
 * serius (multi-instance), ganti dengan Redis/Upstash.
 */

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();
const windowedBuckets = new Map<string, { count: number; resetAt: number }>();

function gc(map: Map<string, { count: number; resetAt: number }>, now: number): void {
  if (map.size < 10_000) return;
  for (const [k, v] of map) {
    if (v.resetAt <= now) map.delete(k);
  }
}

/** True kalau key sudah melewati maxPerMinute dalam jendela berjalan. */
export function rateLimited(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  gc(buckets, now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > maxPerMinute;
}

/**
 * Seperti rateLimited, tapi dengan jendela bebas — dipakai untuk
 * login/signup (10 percobaan per 15 menit per IP) supaya brute force
 * password tidak bisa jalan cepat. Jendela 60 detik terlalu longgar
 * untuk endpoint auth.
 */
export function rateLimitedWindow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  gc(windowedBuckets, now);
  const b = windowedBuckets.get(key);
  if (!b || b.resetAt <= now) {
    windowedBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > max;
}
