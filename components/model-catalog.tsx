/**
 * ModelCatalog — katalog model neo-brutalism.
 * Bagian 1: model router (9 provider + hymn/auto).
 * Bagian 2: model :free OpenRouter (data live, bisa dicari).
 * Context window hanya ditampilkan kalau ada datanya dari OpenRouter;
 * kalau tidak ada, tulis "tidak diketahui" — jangan mengarang angka.
 *
 * Catatan free tier per provider diterjemahkan di UI dari kamus
 * (lookup by provider id, fallback ke teks dari API).
 */

"use client";

import { useMemo, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import { dateLocaleOf, fill, useLocale } from "@/components/locale-provider";
import CopyButton from "./copy-button";

export type RouterModelInfo = {
  id: string;
  provider: string;
  providers: string[];
  configured: boolean;
  needsKey: boolean;
  freeTier: string;
  contextLength: number | null;
};

export type FreeModelInfo = {
  id: string;
  name: string;
  contextLength: number | null;
  description: string | null;
};

function formatContext(n: number | null, t: Dict["models"], locale: Locale): string {
  if (n === null) return t.unknownContext;
  return fill(t.contextTokens, { n: n.toLocaleString(dateLocaleOf(locale)) });
}

function StatusBadge({ configured }: { configured: boolean }) {
  const { dict } = useLocale();
  const t = dict.models;
  return (
    <span
      className={`shrink-0 border-2 border-black px-2.5 py-1 font-mono text-[11px] font-bold ${
        configured ? "bg-green text-white" : "bg-yellow text-black"
      }`}
    >
      {configured ? t.statusActive : t.statusNeedsKey}
    </span>
  );
}

function ModelString({ model }: { model: string }) {
  return (
    <div className="mt-4 flex items-center gap-2 border-t-2 border-black pt-3">
      <code className="min-w-0 flex-1 truncate bg-yellow-soft px-2 py-1.5 font-mono text-[12px] font-bold text-black" title={model}>
        {model}
      </code>
      <CopyButton text={model} />
    </div>
  );
}

export default function ModelCatalog({
  routerModels,
  freeModels,
  catalogOk,
  openRouterConfigured,
}: {
  routerModels: RouterModelInfo[];
  freeModels: FreeModelInfo[];
  catalogOk: boolean;
  openRouterConfigured: boolean;
}) {
  const { locale, dict } = useLocale();
  const t = dict.models;
  const [query, setQuery] = useState("");

  const filteredFree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return freeModels;
    return freeModels.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [freeModels, query]);

  return (
    <div className="flex flex-col gap-12">
      {/* ---- model router ---- */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[22px] font-black tracking-tight text-black">{t.routerTitle}</h2>
          <p className="font-mono text-[12px] text-muted">
            {fill(t.routerActive, {
              configured: routerModels.filter((m) => m.configured).length,
              total: routerModels.length,
            })}
          </p>
        </div>
        <p className="mt-1 max-w-[720px] text-[14px] leading-relaxed text-muted">
          {t.routerIntroA}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">hymn/auto</code>{" "}
          {t.routerIntroB}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">groq</code>
          {t.routerIntroC}
        </p>

        {/* hymn/auto — kartu sorot */}
        <div className="mt-6 border-2 border-black bg-yellow p-5 shadow-brutal-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-mono text-[16px] font-black text-black">hymn/auto</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-black">
                {t.autoDesc}
              </p>
            </div>
            <span className="shrink-0 border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
              {t.recommended}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t-2 border-black pt-3">
            <code className="min-w-0 flex-1 truncate bg-white px-2 py-1.5 font-mono text-[12px] font-bold text-black">
              hymn/auto
            </code>
            <CopyButton text="hymn/auto" />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routerModels.map((m) => (
            <div
              key={m.id}
              className="flex min-w-0 flex-col border-2 border-black bg-white p-5 shadow-brutal-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-mono text-[14px] font-bold text-black" title={m.id}>
                    {m.id}
                  </h3>
                  <p className="mt-1 font-mono text-[12px] text-muted">
                    provider: <span className="font-bold text-black">{m.providers.join(" · ")}</span>
                  </p>
                </div>
                <StatusBadge configured={m.configured} />
              </div>

              <dl className="mt-3 space-y-1.5 font-mono text-[12px] leading-relaxed">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-faint">{t.contextLabel}</dt>
                  <dd className="min-w-0 font-bold text-black">{formatContext(m.contextLength, t, locale)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-faint">{t.accessLabel}</dt>
                  <dd className="min-w-0 text-black">
                    {m.needsKey ? t.needsServerKey : t.noKey}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted">
                {dict.providers.notes[m.provider] ?? m.freeTier}
              </p>

              <ModelString model={m.id} />
            </div>
          ))}
        </div>
      </section>

      {/* ---- model :free OpenRouter ---- */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[22px] font-black tracking-tight text-black">{t.freeTitle}</h2>
          <span
            className={`border-2 border-black px-2.5 py-1 font-mono text-[11px] font-bold ${
              openRouterConfigured ? "bg-green text-white" : "bg-yellow text-black"
            }`}
          >
            OpenRouter {openRouterConfigured ? t.orConfigured : t.orNotConfigured}
          </span>
        </div>
        <p className="mt-1 max-w-[720px] text-[14px] leading-relaxed text-muted">
          {t.freeIntroA}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">model</code>{" "}
          {t.freeIntroB}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">:free</code>{" "}
          {t.freeIntroC}
          {!openRouterConfigured && (
            <>
              {" "}
              {t.freeNotConfiguredA}{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">OPENROUTER_API_KEY</code>
              {t.freeNotConfiguredB}
            </>
          )}
        </p>

        {!catalogOk ? (
          <div className="mt-6 border-2 border-black bg-yellow-soft p-5 text-[14px] leading-relaxed text-black shadow-brutal-sm">
            <p className="font-bold">{t.catalogErrorTitle}</p>
            <p className="mt-1 text-muted">
              {t.catalogErrorBody}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={fill(t.searchPlaceholder, { n: freeModels.length })}
                aria-label={t.searchAria}
                className="h-11 w-full border-2 border-black bg-white px-4 text-[16px] text-black shadow-brutal-sm outline-none placeholder:text-faint focus:bg-yellow-soft"
              />
            </div>
            {filteredFree.length === 0 ? (
              <p className="mt-6 font-mono text-[14px] text-muted">
                {fill(t.noMatch, { q: query })}
              </p>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredFree.map((m) => (
                  <div
                    key={m.id}
                    className="flex min-w-0 flex-col border-2 border-black bg-white p-5 shadow-brutal-sm"
                  >
                    <h3 className="truncate font-mono text-[14px] font-bold text-black" title={m.id}>
                      {m.id}
                    </h3>
                    <p className="mt-1 truncate text-[13px] text-muted" title={m.name}>
                      {m.name}
                    </p>
                    <p className="mt-3 font-mono text-[12px] text-black">
                      {t.contextLabel}: <span className="font-bold">{formatContext(m.contextLength, t, locale)}</span>
                    </p>
                    {m.description && (
                      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
                        {m.description.length > 160
                          ? `${m.description.slice(0, 160)}…`
                          : m.description}
                      </p>
                    )}
                    <div className={m.description ? "" : "flex-1"} />
                    <ModelString model={m.id} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
