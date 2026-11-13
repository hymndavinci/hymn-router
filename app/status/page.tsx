/**
 * /status — status provider publik (tanpa login).
 *
 * Data dari tabel usage (24 jam terakhir) + konfigurasi provider dari
 * router. Hanya request ber-autentikasi yang tercatat di usage —
 * halaman ini mengatakannya dengan jelas, dan provider tanpa data
 * tertulis "belum ada data" (bukan angka karangan).
 */

import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Reveal from "@/components/reveal";
import { getDb } from "@/lib/db";
import { getProviderStatus } from "@/lib/free-ai-router";
import { dict, getLocale, type Dict, type Locale } from "@/lib/i18n";
import { dateLocaleOf } from "@/lib/i18n-utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLocale()];
  return { title: t.meta.statusTitle, description: t.meta.statusDescription };
}

type ProviderStats24h = {
  requests: number;
  lastSuccess: string | null;
  avgLatencyMs: number | null;
};

/** Agregasi usage 24 jam terakhir per provider (null kalau DB tidak ada / query gagal). */
async function getStats24h(): Promise<Map<string, ProviderStats24h> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = (await db`
      SELECT
        provider,
        COUNT(*)::int AS requests,
        MAX(created_at)::text AS last_success,
        AVG(latency_ms)::float AS avg_latency
      FROM usage
      WHERE created_at >= now() - interval '24 hours'
        AND provider IS NOT NULL
      GROUP BY provider
    `) as {
      provider: string;
      requests: number;
      last_success: string | null;
      avg_latency: number | null;
    }[];
    return new Map(
      rows.map((r) => [
        r.provider,
        {
          requests: r.requests,
          lastSuccess: r.last_success,
          avgLatencyMs: r.avg_latency === null ? null : Math.round(r.avg_latency),
        },
      ]),
    );
  } catch (err) {
    console.error("[status] gagal membaca usage 24 jam:", err);
    return null;
  }
}

function fmtDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocaleOf(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StatusPage() {
  const locale = await getLocale();
  const t: Dict = dict[locale];
  const s = t.status;
  const providers = getProviderStatus();
  const stats = await getStats24h();

  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-green px-2 py-1 text-white">{s.badge}</span>
        </p>
        <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight text-black">
          {s.title}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          {s.sub}
        </p>
        <p className="mt-4 max-w-[720px] border-2 border-black bg-yellow-soft p-4 font-mono text-[12px] leading-relaxed text-black shadow-brutal-sm">
          {s.dataNote}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((p, i) => {
            const st = stats?.get(p.id);
            return (
              <Reveal key={p.id} delay={Math.min(i * 50, 150)}>
                <div className="flex h-full min-w-0 flex-col border-2 border-black bg-white p-5 shadow-brutal-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-mono text-[16px] font-black text-black" title={p.id}>
                        {p.id}
                      </h2>
                      <p className="mt-1 break-all font-mono text-[12px] text-muted" title={p.model}>
                        {p.model}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border-2 border-black px-2.5 py-1 font-mono text-[11px] font-bold ${
                        p.configured ? "bg-green text-white" : "bg-yellow text-black"
                      }`}
                    >
                      {p.configured ? s.configuredBadge : s.lockedBadge}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-2 border-t-2 border-black pt-4 font-mono text-[13px] leading-relaxed">
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="shrink-0 text-faint">{s.requests24h}</dt>
                      <dd className="min-w-0 text-right font-bold text-black">
                        {st ? st.requests.toLocaleString(dateLocaleOf(locale)) : s.noData}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="shrink-0 text-faint">{s.lastSuccess}</dt>
                      <dd className="min-w-0 text-right font-bold text-black">
                        {st?.lastSuccess ? fmtDateTime(st.lastSuccess, locale) : s.noData}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="shrink-0 text-faint">{s.avgLatency}</dt>
                      <dd className="min-w-0 text-right font-bold text-black">
                        {st?.avgLatencyMs !== null && st?.avgLatencyMs !== undefined
                          ? `${st.avgLatencyMs.toLocaleString(dateLocaleOf(locale))} ms`
                          : s.noData}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-4 flex-1 text-[13px] leading-relaxed text-muted">
                    {dict[locale].providers.notes[p.id] ?? p.notes}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-8 font-mono text-[12px] text-faint">{s.updatedNow}</p>
      </div>
    </div>
  );
}
