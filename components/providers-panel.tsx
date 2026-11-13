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
    return { text: "butuh key", cls: "border-warn/50 text-warn" };
  }
  if (p.coolingDownUntil) {
    return { text: "cooldown", cls: "border-warn/50 text-warn" };
  }
  return {
    text: p.needsKey ? "aktif" : "aktif · tanpa key",
    cls: "border-ok/50 text-ok",
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
      <div className="rounded-md border border-bad/40 bg-panel p-4 text-sm text-bad">
        Gagal memuat status provider: <span className="font-mono text-xs">{error}</span>
        <div className="mt-3">
          <button
            onClick={onRefresh}
            className="h-9 rounded-md border border-line-2 bg-panel-2 px-3 text-sm text-text"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (providers === null) {
    return <p className="font-mono text-sm text-muted">Memuat status provider…</p>;
  }

  const configured = providers.filter((p) => p.configured).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          <span className="font-mono text-text">{configured}/{providers.length}</span> provider aktif
          · urutan fallback mengikuti urutan kartu di bawah (atas = dicoba duluan) · statistik
          per proses server, reset saat restart
        </p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="h-9 rounded-md border border-line-2 bg-panel-2 px-3 text-sm text-muted hover:text-text disabled:opacity-50"
        >
          {refreshing ? "Memuat…" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {providers.map((p, i) => {
          const b = badge(p);
          const keyLink = KEY_LINKS[p.id];
          const rate =
            p.requests > 0 ? `${Math.round((p.successes / p.requests) * 100)}% sukses` : "belum dipakai";
          return (
            <div key={p.id} className="rounded-md border border-line bg-panel p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-mono text-sm font-semibold text-text">{p.id}</h3>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted" title={p.model}>
                    {p.model}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] ${b.cls}`}
                >
                  {b.text}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted">{p.notes}</p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-faint">
                <span>request: {p.requests}</span>
                <span>sukses: {p.successes}</span>
                <span>{rate}</span>
                {p.lastUsedAt && <span>terakhir: {new Date(p.lastUsedAt).toLocaleTimeString("id-ID")}</span>}
              </div>

              {p.lastError && (
                <p className="mt-2 break-words rounded border border-line bg-panel-2 px-2 py-1 font-mono text-[11px] text-bad">
                  {p.lastError.slice(0, 200)}
                </p>
              )}

              {!p.configured && keyLink && (
                <a
                  href={keyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-mono text-[11px] text-accent hover:underline"
                >
                  Dapatkan key gratis ↗ {keyLink.label}
                </a>
              )}
              {p.configured && !p.needsKey && keyLink && (
                <a
                  href={keyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-mono text-[11px] text-faint hover:text-muted hover:underline"
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
