/**
 * ProvidersPanel — grid kartu provider neo-brutalism.
 * 3 kolom di desktop. Data live dari GET /api/ai/chat (atau dari server
 * lewat prop awal). Urutan kartu = urutan fallback.
 *
 * Catatan per provider diterjemahkan di UI dari kamus (lookup by provider
 * id, fallback ke notes dari API). Respons API sendiri tidak berubah.
 */

"use client";

import type { ProviderStatus } from "@/lib/free-ai-router";
import type { Dict } from "@/lib/i18n";
import { dateLocaleOf, fill, useLocale } from "@/components/locale-provider";
import Reveal from "@/components/reveal";

const KEY_LINKS: Record<string, { label: string; url: string }> = {
  groq: { label: "console.groq.com/keys", url: "https://console.groq.com/keys" },
  nvidia: { label: "build.nvidia.com", url: "https://build.nvidia.com" },
  gemini: { label: "aistudio.google.com/apikey", url: "https://aistudio.google.com/apikey" },
  openrouter: { label: "openrouter.ai/keys", url: "https://openrouter.ai/keys" },
  mistral: { label: "console.mistral.ai/api-keys", url: "https://console.mistral.ai/api-keys" },
  kilo: { label: "kilo.ai", url: "https://kilo.ai" },
  llm7: { label: "token.llm7.io", url: "https://token.llm7.io" },
};

type Badge = { text: string; cls: string };

function badge(p: ProviderStatus, t: Dict["providers"]): Badge {
  if (!p.configured) {
    return { text: t.badgeNeedsKey, cls: "border-black bg-yellow text-black" };
  }
  if (p.coolingDownUntil) {
    return { text: t.badgeCooldown, cls: "border-black bg-yellow text-black" };
  }
  return {
    text: p.needsKey ? t.badgeActive : t.badgeActiveKeyless,
    cls: "border-black bg-green text-black",
  };
}

export default function ProvidersPanel({
  providers,
  error,
  refreshing,
  onRefresh,
}: {
  providers: ProviderStatus[] | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.providers;

  if (error) {
    // Hanya tampilkan detail mentah kalau netral bahasa ("HTTP 500").
    // Pesan error jaringan/API (Inggris/Indonesia) tidak ditampilkan.
    const technical = /^HTTP \d+$/.test(error) ? error : null;
    return (
      <div className="border-2 border-black bg-white p-5 text-[15px] font-medium text-bad shadow-brutal-sm">
        {t.loadError}
        {technical && <span className="font-mono text-[13px]"> {technical}</span>}
        <div className="mt-4">
          <button
            onClick={onRefresh}
            className="btn-press h-11 border-2 border-black bg-yellow px-5 text-[14px] font-bold text-black shadow-brutal-sm"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (providers === null) {
    return <p className="font-mono text-[14px] text-muted">{t.loading}</p>;
  }

  const configured = providers.filter((p) => p.configured).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] leading-relaxed text-muted">
          {fill(t.summary, { configured, total: providers.length })}
        </p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-press h-11 shrink-0 border-2 border-black bg-white px-5 text-[14px] font-bold text-black shadow-brutal-sm disabled:opacity-50"
        >
          {refreshing ? t.refreshing : t.refresh}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p, i) => {
          const b = badge(p, t);
          const keyLink = KEY_LINKS[p.id];
          const rate =
            p.requests > 0
              ? fill(t.successRate, { pct: Math.round((p.successes / p.requests) * 100) })
              : t.neverUsed;
          return (
            <Reveal key={p.id} delay={Math.min(i * 50, 150)}>
              <div className="flex h-full min-w-0 flex-col border-2 border-black bg-white p-5 shadow-brutal-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="min-w-0 truncate font-mono text-[15px] font-bold text-black" title={p.id}>{p.id}</h3>
                  </div>
                  <p className="mt-1 truncate font-mono text-[12px] text-muted" title={p.model}>
                    {p.model}
                  </p>
                </div>
                <span
                  className={`shrink-0 border-2 px-2.5 py-1 font-mono text-[11px] font-bold ${b.cls}`}
                >
                  {b.text}
                </span>
              </div>

              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">
                {t.notes[p.id] ?? p.notes}
              </p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t-2 border-black pt-3 font-mono text-[11px] text-faint">
                <span>{t.requestsLabel} {p.requests}</span>
                <span>{t.successesLabel} {p.successes}</span>
                <span>{rate}</span>
                {p.lastUsedAt && (
                  <span>
                    {t.lastUsed}{" "}
                    {new Date(p.lastUsedAt).toLocaleTimeString(dateLocaleOf(locale))}
                  </span>
                )}
              </div>

              {p.lastError && (
                <p className="mt-3 break-words border-2 border-black bg-white px-2.5 py-2 font-mono text-[11px] leading-relaxed text-bad">
                  <span className="font-bold">{t.lastErrorLabel}</span> {p.lastError.slice(0, 200)}
                </p>
              )}

              {!p.configured && keyLink && (
                <a
                  href={keyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-[44px] items-center break-words font-mono text-[12px] font-bold text-blue underline underline-offset-4 hover:text-black"
                >
                  {t.getKey} {keyLink.label}
                </a>
              )}
              {p.configured && !p.needsKey && keyLink && (
                <a
                  href={keyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-[44px] items-center break-words font-mono text-[12px] font-bold text-faint hover:text-blue hover:underline"
                >
                  {t.optionalToken} {keyLink.label} {t.optional}
                </a>
              )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
