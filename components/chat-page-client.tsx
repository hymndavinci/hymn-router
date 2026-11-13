/**
 * ChatPageClient — halaman /chat: fetch status provider lalu render
 * ChatPlayground. Riwayat chat tetap di localStorage browser.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderStatus } from "@/lib/free-ai-router";
import ChatPlayground from "@/components/chat-playground";

export default function ChatPageClient() {
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat");
      const data = (await res.json()) as { providers?: ProviderStatus[] };
      if (res.ok) setProviders(data.providers ?? []);
    } catch {
      // Biarkan null — ChatPlayground tetap jalan (mode Auto).
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const timer = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const configured = (providers ?? []).filter((p) => p.configured).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-blue px-2 py-1 text-white">Playground</span>
          </p>
          <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight text-black">
            Coba router secara langsung.
          </h1>
          <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-muted">
            Tanpa login, tanpa key. Anonim dibatasi 20 request/menit per IP —
            masuk dan gunakan API key untuk limit 60/menit.
          </p>
        </div>
        <span className="border-2 border-black bg-white px-3.5 py-1.5 font-mono text-[12px] font-bold text-black shadow-brutal-xs">
          {providers === null
            ? "memuat status…"
            : `${configured}/${providers.length} provider aktif`}
        </span>
      </div>
      <div className="mt-8">
        <ChatPlayground providers={providers} />
      </div>
    </div>
  );
}
