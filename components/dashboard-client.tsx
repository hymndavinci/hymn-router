/**
 * DashboardClient — dasbor interaktif dengan layout Activity ala OpenRouter:
 * header + pemilih rentang (7/30 hari) + tab Overview/Trends/Explore,
 * stat card bersparkline, tabel Top API Keys / Top Models berdampingan,
 * lalu manajemen API key dan quickstart seperti sebelumnya.
 *
 * Tema tetap neo-brutalist (putih, kuning, hijau, biru, hitam, border 2px,
 * hard shadow, sudut tajam). Semua angka nyata dari tabel usage — tidak ada
 * cache hit rate atau biaya (kita tidak punya data itu).
 */

"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import type { ApiKeyInfo, CreatedApiKey } from "@/lib/api-keys";
import type {
  DailyQuota,
  DailyUsage,
  KeyUsage,
  ModelUsage,
  RecentRequest,
  UsageSummary,
} from "@/lib/usage";
import type { Dict, Locale } from "@/lib/i18n";
import { codedError, errorCode } from "@/lib/api-error";
import { dateLocaleOf, fill, useLocale } from "@/components/locale-provider";

export type DashboardTab = "overview" | "trends" | "explore";

function fmtDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(dateLocaleOf(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(
  iso: string | null,
  locale: Locale,
  neverUsed: string,
  timeZone?: string,
): string {
  if (!iso) return neverUsed;
  return new Date(iso).toLocaleString(dateLocaleOf(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    // Zona waktu eksplisit bila diminta — tanggal reset kuota dilabeli
    // "WIB", jadi harus diformat dalam Asia/Jakarta, bukan zona waktu
    // browser penonton (yang bisa berbeda dan menampilkan jam salah).
    ...(timeZone ? { timeZone } : {}),
  });
}

/** Label hari untuk grafik harian, mis. "Jum 13". Parse manual supaya
    tidak bergeser zona waktu (string YYYY-MM-DD diparse sebagai UTC). */
function fmtDayLabel(date: string, locale: Locale): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = dt
    .toLocaleDateString(dateLocaleOf(locale), { weekday: "short" })
    .replace(".", "");
  return `${weekday} ${d}`;
}

/** Sparkline SVG murni dari series harian. Hari tanpa data (null) dilewati
    tapi posisi-x hari lainnya dipertahankan, supaya garis tidak menukik ke
    nol secara menyesatkan. Semua nol → garis datar di bawah. */
function Sparkline({
  values,
  stroke,
}: {
  values: (number | null)[];
  stroke: string;
}) {
  const W = 100;
  const H = 36;
  const nums = values.filter((v): v is number => v !== null);
  const max = nums.length > 0 ? Math.max(0, ...nums) : 0;
  const pts = values
    .map((v, i) => {
      if (v === null) return null;
      const x = values.length <= 1 ? W / 2 : (i / (values.length - 1)) * W;
      const y = max > 0 ? H - 2 - (v / max) * (H - 4) : H - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((p): p is string => p !== null);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-9 w-full"
      aria-hidden="true"
    >
      {pts.length >= 2 ? (
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <line
          x1="0"
          y1={H - 2}
          x2={W}
          y2={H - 2}
          stroke={stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/** Satu stat card: label, angka besar, sub-teks, dan visual di bawah
    (sparkline atau progress bar kuota). */
function StatCard({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border-2 border-black bg-white p-4 shadow-brutal-sm sm:p-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
        {label}
      </p>
      <p className="mt-2 break-words text-[28px] font-black leading-none tracking-tight text-black">
        {value}
      </p>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">{sub}</p>
      <div className="mt-auto pt-3">{children}</div>
    </div>
  );
}

/** Bar horizontal reuse untuk breakdown (per provider / per model / per key). */
function BreakdownRows({
  rows,
  totalRequests,
  barClass,
}: {
  rows: { key: string; label: string; sub?: string; requests: number; tokens: number }[];
  totalRequests: number;
  barClass: string;
}) {
  const { locale, dict } = useLocale();
  const t = dict.dashboard;
  return (
    <div className="mt-4 space-y-3">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="min-w-0 font-mono text-[13px] font-bold text-muted sm:w-56 sm:shrink-0">
            <span className="block truncate text-black" title={r.label}>
              {r.label}
            </span>
            {r.sub && (
              <span className="block truncate text-[11px] font-normal text-faint" title={r.sub}>
                {r.sub}
              </span>
            )}
          </span>
          <div className="h-2.5 w-full border border-black bg-neutral-200 sm:w-auto sm:flex-1">
            <div
              className={`h-full ${barClass}`}
              style={{
                width: `${totalRequests > 0 ? Math.max(4, Math.round((r.requests / totalRequests) * 100)) : 0}%`,
              }}
            />
          </div>
          <span className="font-mono text-[12px] text-muted sm:w-40 sm:shrink-0 sm:text-right">
            {r.requests} req ·{" "}
            {fill(t.tokensCount, { n: r.tokens.toLocaleString(dateLocaleOf(locale)) })}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Petakan error API key ke pesan lokal. Pesan mentah API sengaja tidak
 * ditampilkan: teksnya campuran Indonesia/Inggris dan tidak
 * diterjemahkan (keputusan lama) — `code` stabil yang dipakai.
 */
function keyErrorText(
  err: unknown,
  t: Dict["dashboard"],
  action: "create" | "revoke",
): string {
  switch (errorCode(err)) {
    case "invalid_name":
      return t.keyInvalidName;
    case "key_not_found":
      return t.keyNotFound;
    case "unauthorized":
      return t.sessionExpired;
    case "server_not_configured":
    case "database_error":
      return t.serverError;
    default:
      return action === "create" ? t.keyCreateFailed : t.keyRevokeFailed;
  }
}

export default function DashboardClient({
  user,
  loginMethods,
  initialKeys,
  initialUsage,
  initialModelUsage,
  initialDailyUsage,
  initialRecent,
  initialKeyUsage,
  initialQuota,
  baseUrl,
  days,
  tab,
}: {
  user: SessionUser;
  loginMethods: string[] | null;
  initialKeys: ApiKeyInfo[];
  initialUsage: UsageSummary;
  initialModelUsage: ModelUsage[];
  initialDailyUsage: DailyUsage[];
  initialRecent: RecentRequest[];
  initialKeyUsage: KeyUsage[];
  initialQuota: DailyQuota | null;
  baseUrl: string;
  days: 7 | 30;
  tab: DashboardTab;
}) {
  const { locale, dict } = useLocale();
  const t = dict.dashboard;
  const numLocale = dateLocaleOf(locale);
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyInfo[]>(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"requests" | "tokens">("requests");

  /** Pindah rentang/tab lewat soft navigation (tanpa reload penuh);
      server me-render ulang dengan query data yang baru. */
  function goTo(nextDays: 7 | 30, nextTab: DashboardTab) {
    if (nextDays === days && nextTab === tab) return;
    router.push(`/dashboard?days=${nextDays}&tab=${nextTab}`);
  }

  async function refreshKeys() {
    try {
      const res = await fetch("/api/dashboard/keys");
      const data = (await res.json()) as { keys?: ApiKeyInfo[] };
      if (res.ok && data.keys) setKeys(data.keys);
    } catch {
      // Abaikan — daftar lama tetap tampil.
    }
  }

  async function createKey() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as { key?: CreatedApiKey; error?: string; code?: string };
      if (!res.ok) throw codedError(data.error ?? `HTTP ${res.status}`, data.code);
      if (data.key) {
        setNewKey(data.key);
        setName("");
        await refreshKeys();
        router.refresh();
      }
    } catch (err) {
      setError(keyErrorText(err, t, "create"));
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (revoking) return;
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/keys/${id}/revoke`, { method: "POST" });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw codedError(data.error ?? `HTTP ${res.status}`, data.code);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(keyErrorText(err, t, "revoke"));
    } finally {
      setRevoking(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const usage = initialUsage;
  const activeKeys = keys.filter((k) => !k.revokedAt).length;
  const rangeSub = fill(t.statRangeSub, { days: usage.days });
  const topKeys = initialKeyUsage.slice(0, 5);
  const topModels = initialModelUsage.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-8">
      {/* Header user */}
      <div className="flex flex-wrap items-center gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full border-2 border-black object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center border-2 border-black bg-yellow text-[18px] font-black text-black">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-tight tracking-tight text-black">
            {t.greeting} {user.name ?? t.nameFallback}
          </h1>
          <p className="break-all font-mono text-[13px] text-muted">{user.email}</p>
          {loginMethods && loginMethods.length > 0 && (
            <p className="mt-1 font-mono text-[12px] text-faint">
              {t.signedInWith} {loginMethods.join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Banner panduan — hanya untuk user baru (0 API key aktif):
          langkah berikutnya yang jelas + tombol langsung ke form buat key. */}
      {activeKeys === 0 && (
        <div className="mt-8 border-2 border-black bg-yellow p-5 shadow-brutal-sm">
          <h2 className="text-[18px] font-black text-black">{t.guideTitle}</h2>
          <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-black/80">
            {t.guideBody}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href="#api-keys"
              className="btn-press inline-block border-2 border-black bg-black px-6 py-2.5 text-[14px] font-bold text-white shadow-brutal-sm"
            >
              {t.guideCta} ↓
            </a>
            <a
              href="/chat"
              className="inline-flex min-h-[44px] items-center px-2 font-mono text-[13px] font-bold text-black underline underline-offset-4 hover:text-blue"
            >
              {t.guideChatLink}
            </a>
          </div>
        </div>
      )}

      {/* Header aktivitas + pemilih rentang */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-black leading-tight tracking-tight text-black">
          {t.activityTitle}
        </h2>
        <div className="flex items-center gap-2">
          <span className="border-2 border-black bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-black">
            WIB
          </span>
          <div
            className="flex border-2 border-black bg-white shadow-brutal-xs"
            role="group"
            aria-label={t.rangeLabel}
          >
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => goTo(d, tab)}
                aria-pressed={days === d}
                className={`h-11 px-4 font-mono text-[13px] font-bold ${
                  days === d
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-yellow-soft"
                }`}
              >
                {d === 7 ? t.range7 : t.range30}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t.activityTitle}
        className="mt-4 flex border-2 border-black bg-white shadow-brutal-sm"
      >
        {(
          [
            ["overview", t.tabOverview],
            ["trends", t.tabTrends],
            ["explore", t.tabExplore],
          ] as [DashboardTab, string][]
        ).map(([id, label], i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => goTo(days, id)}
            className={`h-11 flex-1 px-4 text-[14px] font-bold sm:flex-none sm:px-6 ${
              i > 0 ? "border-l-2 border-black" : ""
            } ${tab === id ? "bg-yellow text-black" : "bg-white text-muted hover:text-black"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Stat cards */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t.statRequests}
              value={String(usage.totalRequests)}
              sub={rangeSub}
            >
              <Sparkline
                values={initialDailyUsage.map((d) => d.requests)}
                stroke="#2563eb"
              />
            </StatCard>
            <StatCard
              label={t.statTokens}
              value={usage.totalTokens.toLocaleString(numLocale)}
              sub={`${usage.totalPromptTokens.toLocaleString(numLocale)} ${t.tokensPrompt} · ${usage.totalCompletionTokens.toLocaleString(numLocale)} ${t.tokensCompletion}`}
            >
              <Sparkline
                values={initialDailyUsage.map((d) => d.tokens)}
                stroke="#00c853"
              />
            </StatCard>
            <StatCard
              label={t.statLatency}
              value={
                usage.avgLatencyMs === null
                  ? "—"
                  : `${usage.avgLatencyMs.toLocaleString(numLocale)} ms`
              }
              sub={fill(t.statLatencySub, { days: usage.days })}
            >
              <Sparkline
                values={initialDailyUsage.map((d) => d.avgLatencyMs)}
                stroke="#0c0c0c"
              />
            </StatCard>
            <StatCard
              label={t.statQuota}
              value={
                initialQuota
                  ? `${initialQuota.used}/${initialQuota.limit}`
                  : "—"
              }
              sub={
                initialQuota
                  ? initialQuota.remaining > 0
                    ? fill(t.quotaRemaining, { n: initialQuota.remaining })
                    : t.quotaExhausted
                  : ""
              }
            >
              {initialQuota && (
                <>
                  <div className="h-3.5 w-full border-2 border-black bg-white">
                    <div
                      className={`h-full ${initialQuota.remaining <= 0 ? "bg-bad" : initialQuota.remaining <= 20 ? "bg-yellow" : "bg-green"}`}
                      style={{
                        width: `${Math.min(100, Math.round((initialQuota.used / initialQuota.limit) * 100))}%`,
                      }}
                    />
                  </div>
                  <p
                    className="mt-1.5 truncate font-mono text-[11px] leading-relaxed text-muted"
                    title={fill(t.quotaReset, {
                      date: fmtDateTime(initialQuota.resetsAt, locale, t.neverUsed, "Asia/Jakarta"),
                    })}
                  >
                    {fill(t.quotaReset, {
                      date: fmtDateTime(initialQuota.resetsAt, locale, t.neverUsed, "Asia/Jakarta"),
                    })}
                  </p>
                </>
              )}
            </StatCard>
          </div>

          {/* Top API Keys | Top Models */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="border-2 border-black bg-white p-5 shadow-brutal-sm">
              <h2 className="text-[16px] font-black text-black">{t.topKeys}</h2>
              {topKeys.length === 0 ? (
                <div className="mt-2">
                  <p className="text-[14px] text-muted">
                    {fill(t.noRequestsShort, { days: usage.days })}
                  </p>
                  <a
                    href="/chat"
                    className="mt-3 inline-flex min-h-[44px] items-center font-mono text-[13px] font-bold text-black underline underline-offset-4 hover:text-blue"
                  >
                    {t.guideChatLink}
                  </a>
                </div>
              ) : (
                <>
                  <BreakdownRows
                    rows={topKeys.map((k) => ({
                      key: k.apiKeyId,
                      label: k.keyName ?? t.unnamedKey,
                      sub: k.keyPrefix ? `${k.keyPrefix}…` : undefined,
                      requests: k.requests,
                      tokens: k.tokens,
                    }))}
                    totalRequests={usage.totalRequests}
                    barClass="bg-yellow"
                  />
                  {initialKeyUsage.length > 5 && (
                    <button
                      type="button"
                      onClick={() => goTo(days, "explore")}
                      className="mt-4 inline-flex min-h-[44px] items-center font-mono text-[13px] font-bold text-black underline underline-offset-4 hover:text-blue"
                    >
                      {t.viewAllExplore}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="border-2 border-black bg-white p-5 shadow-brutal-sm">
              <h2 className="text-[16px] font-black text-black">{t.topModels}</h2>
              {topModels.length === 0 ? (
                <div className="mt-2">
                  <p className="text-[14px] text-muted">
                    {fill(t.noRequestsShort, { days: usage.days })}
                  </p>
                  <a
                    href="/chat"
                    className="mt-3 inline-flex min-h-[44px] items-center font-mono text-[13px] font-bold text-black underline underline-offset-4 hover:text-blue"
                  >
                    {t.guideChatLink}
                  </a>
                </div>
              ) : (
                <>
                  <BreakdownRows
                    rows={topModels.map((m) => ({
                      key: `${m.provider}:${m.model}`,
                      label: m.model,
                      sub: m.provider,
                      requests: m.requests,
                      tokens: m.tokens,
                    }))}
                    totalRequests={usage.totalRequests}
                    barClass="bg-green"
                  />
                  {initialModelUsage.length > 5 && (
                    <button
                      type="button"
                      onClick={() => goTo(days, "explore")}
                      className="mt-4 inline-flex min-h-[44px] items-center font-mono text-[13px] font-bold text-black underline underline-offset-4 hover:text-blue"
                    >
                      {t.viewAllExplore}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Request terakhir — kartu di mobile, tabel di sm+ */}
          <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
            <h2 className="text-[16px] font-black text-black">{t.recentTitle}</h2>
            {initialRecent.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted">{t.noRecent}</p>
            ) : (
              <>
                <div className="mt-4 flex flex-col gap-3 sm:hidden">
                  {initialRecent.map((r) => (
                    <div key={r.id} className="border-2 border-black bg-white p-3 shadow-brutal-xs">
                      <p className="truncate font-mono text-[13px] font-bold text-black" title={r.model}>
                        {r.model}
                      </p>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-faint">
                        {fmtDateTime(r.createdAt, locale, t.neverUsed)} · {r.provider}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        {fill(t.tokensCount, { n: r.tokens.toLocaleString(numLocale) })} ·{" "}
                        {r.latencyMs !== null ? `${r.latencyMs.toLocaleString(numLocale)} ms` : "—"}
                        {r.keyName ? ` · ${r.keyName}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[640px] text-left text-[14px]">
                    <thead>
                      <tr className="border-b-2 border-black font-mono text-[11px] uppercase tracking-[0.12em] text-black">
                        <th className="py-2.5 pr-4 font-bold">{t.thTime}</th>
                        <th className="py-2.5 pr-4 font-bold">{t.thModel}</th>
                        <th className="py-2.5 pr-4 font-bold">{t.thProvider}</th>
                        <th className="py-2.5 pr-4 font-bold">{t.thTokens}</th>
                        <th className="py-2.5 pr-4 font-bold">{t.thLatency}</th>
                        <th className="py-2.5 font-bold">{t.thKey}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialRecent.map((r) => (
                        <tr key={r.id} className="border-b border-neutral-300 last:border-0">
                          <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                            {fmtDateTime(r.createdAt, locale, t.neverUsed)}
                          </td>
                          <td className="max-w-[220px] truncate py-3 pr-4 font-mono text-[13px] font-bold text-black" title={r.model}>
                            {r.model}
                          </td>
                          <td className="py-3 pr-4 font-mono text-[12px] text-muted">{r.provider}</td>
                          <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                            {r.tokens.toLocaleString(numLocale)}
                          </td>
                          <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                            {r.latencyMs !== null ? `${r.latencyMs.toLocaleString(numLocale)} ms` : "—"}
                          </td>
                          <td className="py-3 font-mono text-[12px] text-muted">
                            {r.keyName ?? (r.keyPrefix ? `${r.keyPrefix}…` : "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === "trends" && (
        <>
          {/* Grafik harian (bar chart CSS murni) + toggle metrik */}
          <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[16px] font-black text-black">
                {chartMetric === "requests"
                  ? fill(t.dailyChartTitle, { days: usage.days })
                  : fill(t.dailyChartTokensTitle, { days: usage.days })}
              </h2>
              <div
                className="flex border-2 border-black bg-white"
                role="group"
                aria-label={chartMetric === "requests" ? t.chartMetricRequests : t.chartMetricTokens}
              >
                {(["requests", "tokens"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChartMetric(m)}
                    aria-pressed={chartMetric === m}
                    className={`h-11 px-3 font-mono text-[12px] font-bold ${
                      chartMetric === m
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-yellow-soft"
                    }`}
                  >
                    {m === "requests" ? t.chartMetricRequests : t.chartMetricTokens}
                  </button>
                ))}
              </div>
            </div>
            {initialDailyUsage.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted">{t.noDailyData}</p>
            ) : (
              <>
                <div className="mt-5 flex h-40 items-stretch gap-1.5 sm:gap-2.5">
                  {initialDailyUsage.map((d, i) => {
                    const values = initialDailyUsage.map((x) =>
                      chartMetric === "requests" ? x.requests : x.tokens,
                    );
                    const max = Math.max(1, ...values);
                    const v = chartMetric === "requests" ? d.requests : d.tokens;
                    const pct = Math.round((v / max) * 100);
                    // Rentang 30 hari: angka di atas bar hanya tiap 5 hari
                    // (kolom ~11px di mobile — angka tiap bar akan bertumpuk).
                    const showValue =
                      initialDailyUsage.length <= 7 ||
                      i % 5 === 0 ||
                      i === initialDailyUsage.length - 1;
                    return (
                      <div
                        key={d.date}
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                        title={fill(t.chartTooltip, {
                          date: d.date,
                          requests: d.requests,
                          tokens: d.tokens.toLocaleString(numLocale),
                        })}
                      >
                        <span className="whitespace-nowrap font-mono text-[11px] font-bold text-black">
                          {showValue && v > 0 ? v.toLocaleString(numLocale) : ""}
                        </span>
                        <div
                          className="w-full max-w-[48px] border-2 border-black bg-yellow"
                          style={{ height: `${Math.max(v > 0 ? 8 : 2, pct)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-1.5 border-t-2 border-black pt-2 sm:gap-2.5">
                  {initialDailyUsage.map((d, i) => (
                    <span
                      key={d.date}
                      className="min-w-0 flex-1 overflow-hidden text-center font-mono text-[10px] font-bold text-faint sm:text-[11px]"
                    >
                      {initialDailyUsage.length <= 7 ||
                      i % 5 === 0 ||
                      i === initialDailyUsage.length - 1
                        ? fmtDayLabel(d.date, locale)
                        : ""}
                    </span>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[11px] text-faint">
                  {chartMetric === "requests" ? t.chartNote : t.chartNoteTokens}
                </p>
              </>
            )}
          </div>

          {/* Per provider */}
          <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
            <h2 className="text-[16px] font-black text-black">{t.perProvider}</h2>
            {usage.byProvider.length === 0 ? (
              <div className="mt-2">
                <p className="text-[14px] text-muted">
                  {fill(t.noRequests, { days: usage.days })}
                </p>
                {activeKeys === 0 && (
                  <a
                    href="#api-keys"
                    className="mt-3 inline-block border-2 border-black bg-yellow px-4 py-2 text-[13px] font-bold text-black shadow-brutal-xs"
                  >
                    {t.guideCta} ↓
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {usage.byProvider.map((p) => (
                  <div
                    key={p.provider}
                    className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="font-mono text-[13px] font-bold text-muted sm:w-24 sm:shrink-0">
                      {p.provider}
                    </span>
                    <div className="h-2.5 w-full border border-black bg-neutral-200 sm:w-auto sm:flex-1">
                      <div
                        className="h-full bg-blue"
                        style={{
                          width: `${Math.max(4, Math.round((p.requests / usage.totalRequests) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[12px] text-muted sm:w-40 sm:shrink-0 sm:text-right">
                      {p.requests} req ·{" "}
                      {fill(t.tokensCount, { n: p.tokens.toLocaleString(numLocale) })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "explore" && (
        <>
          {/* Per model (semua) */}
          <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
            <h2 className="text-[16px] font-black text-black">{t.perModel}</h2>
            {initialModelUsage.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted">
                {fill(t.noRequestsShort, { days: usage.days })}
              </p>
            ) : (
              <BreakdownRows
                rows={initialModelUsage.map((m) => ({
                  key: `${m.provider}:${m.model}`,
                  label: m.model,
                  sub: m.provider,
                  requests: m.requests,
                  tokens: m.tokens,
                }))}
                totalRequests={usage.totalRequests}
                barClass="bg-green"
              />
            )}
          </div>

          {/* Per API key (semua) */}
          <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
            <h2 className="text-[16px] font-black text-black">{t.perKey}</h2>
            {initialKeyUsage.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted">
                {fill(t.noRequestsShort, { days: usage.days })}
              </p>
            ) : (
              <BreakdownRows
                rows={initialKeyUsage.map((k) => ({
                  key: k.apiKeyId,
                  label: k.keyName ?? t.unnamedKey,
                  sub: k.keyPrefix ? `${k.keyPrefix}…` : undefined,
                  requests: k.requests,
                  tokens: k.tokens,
                }))}
                totalRequests={usage.totalRequests}
                barClass="bg-yellow"
              />
            )}
          </div>

          {/* Per provider (semua — salinan dari Trends agar Explore lengkap) */}
          <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
            <h2 className="text-[16px] font-black text-black">{t.perProvider}</h2>
            {usage.byProvider.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted">
                {fill(t.noRequestsShort, { days: usage.days })}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {usage.byProvider.map((p) => (
                  <div
                    key={p.provider}
                    className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="font-mono text-[13px] font-bold text-muted sm:w-24 sm:shrink-0">
                      {p.provider}
                    </span>
                    <div className="h-2.5 w-full border border-black bg-neutral-200 sm:w-auto sm:flex-1">
                      <div
                        className="h-full bg-blue"
                        style={{
                          width: `${Math.max(4, Math.round((p.requests / usage.totalRequests) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[12px] text-muted sm:w-40 sm:shrink-0 sm:text-right">
                      {p.requests} req ·{" "}
                      {fill(t.tokensCount, { n: p.tokens.toLocaleString(numLocale) })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* API keys */}
      <div id="api-keys" className="mt-8 scroll-mt-20 border-2 border-black bg-white p-5 shadow-brutal-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-black text-black">
            {t.keysTitle}{" "}
            <span className="font-mono text-[13px] font-bold text-faint">
              · {fill(t.keysActive, { n: activeKeys })}
            </span>
          </h2>
          <p className="font-mono text-[12px] font-bold text-faint">
            {t.keysLimit}
          </p>
        </div>

        {/* Form buat key */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createKey();
            }}
            placeholder={t.keyNamePlaceholder}
            aria-label={t.keyNamePlaceholder}
            maxLength={64}
            className="h-11 flex-1 border-2 border-black bg-white px-4 text-[16px] text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] sm:text-[14px]"
          />
          <button
            onClick={() => void createKey()}
            disabled={!name.trim() || creating}
            className="btn-press h-11 border-2 border-black bg-yellow px-6 text-[14px] font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? t.creating : t.createKey}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 break-words border-2 border-black bg-white px-4 py-3 text-[14px] font-medium text-bad">
            {error}
          </p>
        )}

        {/* Key baru — tampil sekali */}
        {newKey && (
          <div className="mt-4 border-2 border-black bg-yellow p-4 shadow-brutal-sm">
            <p className="text-[14px] font-bold text-black">
              {t.copyNewKey}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 break-all border-2 border-black bg-white px-3 py-2.5 font-mono text-[13px] font-bold text-black">
                {newKey.key}
              </code>
              <button
                onClick={() => void copy(newKey.key)}
                className="btn-press h-11 shrink-0 border-2 border-black bg-black px-5 text-[13px] font-bold text-white shadow-brutal-sm"
              >
                {copied ? t.copiedBtn : t.copyKeyBtn}
              </button>
            </div>
          </div>
        )}

        {/* Daftar key — kartu di mobile, tabel di sm+ (tabel 640px tidak
            muat di layar HP dan memaksa scroll horizontal untuk revoke). */}
        {keys.length === 0 ? (
          <p className="mt-5 py-4 text-[14px] text-muted">
            {t.noKeys}
          </p>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3 sm:hidden">
              {keys.map((k) => (
                <div key={k.id} className="border-2 border-black bg-white p-4 shadow-brutal-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-bold text-black">
                      {k.prefix}…
                    </span>
                    {k.revokedAt ? (
                      <span className="shrink-0 border-2 border-black bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-faint">
                        {t.revoked}
                      </span>
                    ) : (
                      <span className="shrink-0 border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-black">
                        {t.active}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 break-words text-[14px] font-medium text-muted">{k.name}</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-faint">
                    {t.createdLabel} {fmtDate(k.createdAt, locale)} · {t.lastUsedLabel}{" "}
                    {fmtDateTime(k.lastUsedAt, locale, t.neverUsed)}
                  </p>
                  {!k.revokedAt && (
                    <button
                      onClick={() => void revokeKey(k.id)}
                      aria-label={`${t.revokeBtn}: ${k.name}`}
                      disabled={revoking === k.id}
                      className="mt-3 h-11 border-2 border-bad bg-white px-4 font-mono text-[12px] font-bold text-bad hover:bg-bad hover:text-white disabled:opacity-50"
                    >
                      {revoking === k.id ? "…" : t.revokeBtn}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b-2 border-black font-mono text-[11px] uppercase tracking-[0.12em] text-black">
                    <th className="py-2.5 pr-4 font-bold">{t.thKey}</th>
                    <th className="py-2.5 pr-4 font-bold">{t.thName}</th>
                    <th className="py-2.5 pr-4 font-bold">{t.thCreated}</th>
                    <th className="py-2.5 pr-4 font-bold">{t.thLastUsed}</th>
                    <th className="py-2.5 pr-4 font-bold">{t.thStatus}</th>
                    <th className="py-2.5 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-neutral-300 last:border-0">
                      <td className="py-3 pr-4 font-mono text-[13px] font-bold text-black">
                        {k.prefix}…
                      </td>
                      <td className="py-3 pr-4 font-medium text-muted">{k.name}</td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                        {fmtDate(k.createdAt, locale)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                        {fmtDateTime(k.lastUsedAt, locale, t.neverUsed)}
                      </td>
                      <td className="py-3 pr-4">
                        {k.revokedAt ? (
                          <span className="border-2 border-black bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-faint">
                            {t.revoked}
                          </span>
                        ) : (
                          <span className="border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-black">
                            {t.active}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {!k.revokedAt && (
                          <button
                            onClick={() => void revokeKey(k.id)}
                            aria-label={`${t.revokeBtn}: ${k.name}`}
                            disabled={revoking === k.id}
                            className="inline-flex h-11 items-center border-2 border-bad bg-white px-3.5 font-mono text-[12px] font-bold text-bad hover:bg-bad hover:text-white disabled:opacity-50"
                          >
                            {revoking === k.id ? "…" : t.revokeBtn}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Quickstart */}
      <div className="shadow-yellow mt-4 overflow-hidden border-2 border-black bg-dark text-ondark shadow-brutal">
        <div className="border-b-2 border-white/25 px-5 py-3.5">
          <span className="font-mono text-[12px] font-bold text-ondark-muted">
            {t.quickstartTitle}
          </span>
        </div>
        <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-relaxed text-ondark sm:p-5 sm:text-[13px]">
{`BASE="${baseUrl}"
curl $BASE/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "hymn/auto",
    "messages": [
      {"role": "user", "content": "Halo!"}
    ]
  }'`}
        </pre>
      </div>
      <p className="mt-3 break-words font-mono text-[13px] leading-relaxed text-faint">
        {t.quickstartA}
        {baseUrl}
        {t.quickstartB}
        <code className="bg-yellow-soft px-1 font-bold text-black">&quot;stream&quot;: true</code>
        {t.quickstartC}
      </p>
    </div>
  );
}
