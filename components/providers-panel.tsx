/**
 * ProvidersPanel — grid kartu provider neo-brutalism.
 * 3 kolom di desktop. Data live dari GET /api/ai/chat (atau dari server
 * lewat prop awal). Urutan kartu = urutan fallback.
 */

"use client";

import type { ProviderStatus } from "@/lib/free-ai-router";

const KEY_LINKS: Record<string, { label: string; url: string }> = {
  groq: { label: "console.groq.com/keys", url: "https://console.groq.com/keys" },
  nvidia: { label: "build.nvidia.com", url: "https://build.nvidia.com" },
  gemini: { label: "aistudio.google.com/apikey", url: "https://aistudio.google.com/apikey" },
  openrouter: { label: "openrouter.ai/keys", url: "https://openrouter.ai/keys" },
  mistral: { label: "console.mistral.ai/api-keys", url: "https://console.mistral.ai/api-keys" },
  kilo: { label: "kilo.ai (opsional)", url: "https://kilo.ai" },
  llm7: { label: "token.llm7.io (opsional)", url: "https://token.llm7.io" },
};

type Badge = { text: string; cls: string };

function badge(p: ProviderStatus): Badge {
  if (!p.configured) {
    return { text: "butuh key", cls: "border-black bg-yellow text-black" };
  }
  if (p.coolingDownUntil) {
    return { text: "cooldown", cls: "border-black bg-yellow text-black" };
  }
  return {
    text: p.needsKey ? "aktif" : "aktif · tanpa key",
    cls: "border-black bg-green text-white",
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
  if (error) {
    return (
      <div className="border-2 border-black bg-white p-5 text-[15px] font-medium text-bad shadow-brutal-sm">
        Gagal memuat status provider: <span className="font-mono text-[13px]">{error}</span>
        <div className="mt-4">
          <button
            onClick={onRefresh}
            className="btn-press h-10 border-2 border-black bg-yellow px-5 text-[14px] font-bold text-black shadow-brutal-sm"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (providers === null) {
    return <p className="font-mono text-[14px] text-muted">Memuat status provider…</p>;
  }

  const configured = providers.filter((p) => p.configured).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] leading-relaxed text-muted">
          <span className="font-mono font-bold text-black">{configured}/{providers.length}</span>{" "}
          provider aktif · urutan fallback mengikuti urutan kartu (kiri atas dicoba duluan) ·
          statistik per proses server, reset saat restart
        </p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="btn-press h-10 shrink-0 border-2 border-black bg-white px-5 text-[14px] font-bold text-black shadow-brutal-sm disabled:opacity-50"
        >
          {refreshing ? "Memuat…" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p, i) => {
          const b = badge(p);
          const keyLink = KEY_LINKS[p.id];
          const rate =
            p.requests > 0 ? `${Math.round((p.successes / p.requests) * 100)}% sukses` : "belum dipakai";
          return (
            <div
              key={p.id}
              className="flex min-w-0 flex-col border-2 border-black bg-white p-5 shadow-brutal-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-mono text-[15px] font-bold text-black">{p.id}</h3>
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

              <p className="mt-3 flex-1 text-[14px] leading-relaxed text-muted">{p.notes}</p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t-2 border-black pt-3 font-mono text-[11px] text-faint">
                <span>request: {p.requests}</span>
                <span>sukses: {p.successes}</span>
                <span>{rate}</span>
                {p.lastUsedAt && (
                  <span>terakhir: {new Date(p.lastUsedAt).toLocaleTimeString("id-ID")}</span>
                )}
              </div>

              {p.lastError && (
                <p className="mt-3 break-words border-2 border-black bg-white px-2.5 py-2 font-mono text-[11px] leading-relaxed text-bad">
                  {p.lastError.slice(0, 200)}
                </p>
              )}

              {!p.configured && keyLink && (
                <a
                  href={keyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 break-words font-mono text-[12px] font-bold text-blue underline underline-offset-4 hover:text-black"
                >
                  Dapatkan key gratis ↗ {keyLink.label}
                </a>
              )}
              {p.configured && !p.needsKey && keyLink && (
                <a
                  href={keyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 break-words font-mono text-[12px] font-bold text-faint hover:text-blue hover:underline"
                >
                  Token opsional ↗ {keyLink.label}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
