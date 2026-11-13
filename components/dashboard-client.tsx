/**
 * DashboardClient — dashboard interaktif: ringkasan usage, daftar API key,
 * buat key baru (key utuh tampil SEKALI), revoke, dan quickstart snippet.
 */

"use client";

import { useState } from "react";
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

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
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
              className="px-2 py-2 font-mono text-[13px] font-bold text-black underline underline-offset-4 hover:text-blue"
            >
              {t.guideChatLink}
            </a>
          </div>
        </div>
      )}

      {/* Ringkasan usage */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { v: String(usage.totalRequests), l: fill(t.requestsDays, { days: usage.days }) },
          { v: usage.totalTokens.toLocaleString(numLocale), l: t.tokensTotal },
          {
            v: usage.totalPromptTokens.toLocaleString(numLocale),
            l: t.tokensPrompt,
          },
          {
            v: usage.totalCompletionTokens.toLocaleString(numLocale),
            l: t.tokensCompletion,
          },
        ].map((s) => (
          <div key={s.l} className="border-2 border-black bg-white p-4 shadow-brutal-sm sm:p-5">
            <p className="break-words text-[28px] font-black leading-none tracking-tight text-black">
              {s.v}
            </p>
            <p className="mt-2 font-mono text-[11px] font-bold text-faint">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Kuota harian gratis */}
      {initialQuota && (
        <div className="mt-4 border-2 border-black bg-yellow-soft p-5 shadow-brutal-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[16px] font-black text-black">
              {t.quotaTitle}
            </h2>
            <span className="font-mono text-[13px] font-bold text-black">
              {fill(t.quotaUsed, { used: initialQuota.used, limit: initialQuota.limit })}
            </span>
          </div>
          <div className="mt-3 h-3.5 w-full border-2 border-black bg-white">
            <div
              className={`h-full ${initialQuota.remaining <= 0 ? "bg-bad" : initialQuota.remaining <= 20 ? "bg-yellow" : "bg-green"}`}
              style={{
                width: `${Math.min(100, Math.round((initialQuota.used / initialQuota.limit) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 font-mono text-[12px] leading-relaxed text-muted">
            {initialQuota.remaining > 0
              ? `${fill(t.quotaRemaining, { n: initialQuota.remaining })} `
              : `${t.quotaExhausted} `}
            {fill(t.quotaReset, {
              date: fmtDateTime(initialQuota.resetsAt, locale, t.neverUsed, "Asia/Jakarta"),
            })}
          </p>
        </div>
      )}

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

      {/* Per model */}
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

      {/* Grafik harian (bar chart CSS murni) */}
      <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
        <h2 className="text-[16px] font-black text-black">{t.last7days}</h2>
        {initialDailyUsage.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">{t.noDailyData}</p>
        ) : (
          <>
            <div className="mt-5 flex h-32 items-end gap-2 sm:gap-3">
              {initialDailyUsage.map((d) => {
                const max = Math.max(1, ...initialDailyUsage.map((x) => x.requests));
                const pct = Math.round((d.requests / max) * 100);
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
                    <span className="font-mono text-[11px] font-bold text-black">
                      {d.requests > 0 ? d.requests : ""}
                    </span>
                    <div
                      className="w-full max-w-[48px] border-2 border-black bg-yellow"
                      style={{ height: `${Math.max(d.requests > 0 ? 8 : 2, pct)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2 border-t-2 border-black pt-2 sm:gap-3">
              {initialDailyUsage.map((d) => (
                <span
                  key={d.date}
                  className="min-w-0 flex-1 text-center font-mono text-[10px] font-bold text-faint sm:text-[11px]"
                >
                  {fmtDayLabel(d.date, locale)}
                </span>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-faint">
              {t.chartNote}
            </p>
          </>
        )}
      </div>

      {/* Per API key */}
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
            className="btn-press h-11 border-2 border-black bg-yellow px-6 text-[14px] font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-40"
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
                className="btn-press h-10 shrink-0 border-2 border-black bg-black px-5 text-[13px] font-bold text-white shadow-brutal-sm"
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
                      <span className="shrink-0 border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
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
                      className="mt-3 h-9 border-2 border-bad bg-white px-4 font-mono text-[12px] font-bold text-bad hover:bg-bad hover:text-white disabled:opacity-50"
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
                          <span className="border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
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
                            className="border-2 border-bad bg-white px-3.5 py-1.5 font-mono text-[12px] font-bold text-bad hover:bg-bad hover:text-white disabled:opacity-50"
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
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-ondark">
{`curl ${baseUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "hymn/auto",
       "messages": [{"role": "user", "content": "Halo!"}]}'`}
        </pre>
      </div>
      <p className="mt-3 break-words font-mono text-[12px] leading-relaxed text-faint">
        {t.quickstartA}
        {baseUrl}
        {t.quickstartB}
        <code className="bg-yellow-soft px-1 font-bold text-black">&quot;stream&quot;: true</code>
        {t.quickstartC}
      </p>
    </div>
  );
}
