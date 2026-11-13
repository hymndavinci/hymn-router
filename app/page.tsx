"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderStatus } from "@/lib/free-ai-router";
import ChatPlayground from "@/components/chat-playground";
import ProvidersPanel from "@/components/providers-panel";
import ApiDocs from "@/components/api-docs";

type Tab = "chat" | "providers" | "api";

const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "providers", label: "Providers" },
  { id: "api", label: "API Docs" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("chat");
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/ai/chat");
      const data = (await res.json()) as { providers?: ProviderStatus[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setProviders(data.providers ?? []);
      setStatusError(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const timer = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const configured = (providers ?? []).filter((p) => p.configured).length;
  const total = providers?.length ?? 9;
  const apiOnline = providers !== null && statusError === null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/50 bg-panel font-mono text-sm font-bold text-accent">
            {"<>"}
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-text">Hymn Router</h1>
            <p className="font-mono text-xs text-faint">
              9 free LLM providers · one endpoint · $0
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${apiOnline ? "bg-ok" : "bg-bad"}`}
            title={apiOnline ? "API online" : "API offline"}
          />
          <span className="font-mono text-xs text-muted">
            {statusError
              ? "API offline"
              : providers === null
                ? "memuat status…"
                : `${configured}/${total} provider aktif`}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mt-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-accent text-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
            {t.id === "providers" && providers !== null && (
              <span className="ml-1.5 rounded border border-line-2 bg-panel-2 px-1 py-0.5 font-mono text-[10px] text-muted">
                {configured}/{total}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Konten */}
      <main className="flex-1 py-4">
        {tab === "chat" && <ChatPlayground providers={providers} />}
        {tab === "providers" && (
          <ProvidersPanel
            providers={providers}
            error={statusError}
            refreshing={refreshing}
            onRefresh={() => void fetchStatus()}
          />
        )}
        {tab === "api" && <ApiDocs />}
      </main>

      <footer className="border-t border-line pt-3">
        <p className="font-mono text-[11px] leading-relaxed text-faint">
          Hymn Router · free tiers berubah-ubah — cek dokumentasi tiap provider sebelum mengandalkan
          satu model. Jangan kirim data sensitif lewat endpoint gratis.
        </p>
      </footer>
    </div>
  );
}
