/**
 * ModelCatalog — katalog model neo-brutalism.
 * Bagian 1: model router (9 provider + hymn/auto).
 * Bagian 2: model :free OpenRouter (data live, bisa dicari).
 * Context window hanya ditampilkan kalau ada datanya dari OpenRouter;
 * kalau tidak ada, tulis "tidak diketahui" — jangan mengarang angka.
 */

"use client";

import { useMemo, useState } from "react";
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

function formatContext(n: number | null): string {
  if (n === null) return "tidak diketahui";
  return `${n.toLocaleString("id-ID")} token`;
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className={`shrink-0 border-2 border-black px-2.5 py-1 font-mono text-[11px] font-bold ${
        configured ? "bg-green text-white" : "bg-yellow text-black"
      }`}
    >
      {configured ? "aktif" : "butuh key"}
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
          <h2 className="text-[22px] font-black tracking-tight text-black">Model Router</h2>
          <p className="font-mono text-[12px] text-muted">
            {routerModels.filter((m) => m.configured).length}/{routerModels.length} aktif
          </p>
        </div>
        <p className="mt-1 max-w-[720px] text-[14px] leading-relaxed text-muted">
          Model default tiap provider. Gunakan{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">hymn/auto</code>{" "}
          untuk fallback otomatis, id provider (mis.{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">groq</code>) untuk
          memprioritaskan satu provider, atau id model persis seperti di bawah.
        </p>

        {/* hymn/auto — kartu sorot */}
        <div className="mt-6 border-2 border-black bg-yellow p-5 shadow-brutal-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-mono text-[16px] font-black text-black">hymn/auto</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-black">
                Router otomatis — mencoba 9 provider berurutan sampai ada yang berhasil.
                Pilihan default jika Anda belum yakin model apa yang akan digunakan.
              </p>
            </div>
            <span className="shrink-0 border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
              rekomendasi
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
                  <dt className="shrink-0 text-faint">konteks</dt>
                  <dd className="min-w-0 font-bold text-black">{formatContext(m.contextLength)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-faint">akses</dt>
                  <dd className="min-w-0 text-black">
                    {m.needsKey ? "butuh API key server" : "tanpa key"}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted">{m.freeTier}</p>

              <ModelString model={m.id} />
            </div>
          ))}
        </div>
      </section>

      {/* ---- model :free OpenRouter ---- */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[22px] font-black tracking-tight text-black">Model :free OpenRouter</h2>
          <span
            className={`border-2 border-black px-2.5 py-1 font-mono text-[11px] font-bold ${
              openRouterConfigured ? "bg-green text-white" : "bg-yellow text-black"
            }`}
          >
            OpenRouter {openRouterConfigured ? "terkonfigurasi" : "belum ada key"}
          </span>
        </div>
        <p className="mt-1 max-w-[720px] text-[14px] leading-relaxed text-muted">
          Model gratis dari OpenRouter — kirim id-nya persis seperti di bawah ke field{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">model</code>{" "}
          di /v1 dan router meneruskannya ke OpenRouter. Hanya model berakhiran{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">:free</code>{" "}
          yang diizinkan. Daftar ini live dari OpenRouter (cache 1 jam) dan bisa berubah
          sewaktu-waktu.
          {!openRouterConfigured && (
            <>
              {" "}
              Saat ini server belum mengonfigurasi{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">OPENROUTER_API_KEY</code>,
              jadi model-model ini belum bisa dipakai.
            </>
          )}
        </p>

        {!catalogOk ? (
          <div className="mt-6 border-2 border-black bg-yellow-soft p-5 text-[14px] leading-relaxed text-black shadow-brutal-sm">
            <p className="font-bold">Katalog OpenRouter tidak bisa dimuat saat ini.</p>
            <p className="mt-1 text-muted">
              Silakan muat ulang halaman nanti. Model router di atas tetap bisa dipakai seperti biasa.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Cari dari ${freeModels.length} model :free…`}
                aria-label="Cari model :free"
                className="h-11 w-full border-2 border-black bg-white px-4 text-[16px] text-black shadow-brutal-sm outline-none placeholder:text-faint focus:bg-yellow-soft"
              />
            </div>
            {filteredFree.length === 0 ? (
              <p className="mt-6 font-mono text-[14px] text-muted">
                Tidak ada model yang cocok dengan &ldquo;{query}&rdquo;.
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
                      konteks: <span className="font-bold">{formatContext(m.contextLength)}</span>
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
