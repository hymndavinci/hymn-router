/**
 * ChatPageClient — halaman /chat: fetch status provider + status login,
 * lalu render ChatPlayground. Riwayat chat user login tersimpan di
 * server (sidebar); user anonim memakai localStorage browser.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderStatus } from "@/lib/free-ai-router";
import { fill, useLocale } from "@/components/locale-provider";
import ChatPlayground from "@/components/chat-playground";

export default function ChatPageClient() {
  const { dict } = useLocale();
  const t = dict.chat;
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

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

  // Status login (untuk sidebar riwayat tersimpan). 401 = anonim.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me")
      .then((res) => {
        if (!cancelled) setLoggedIn(res.ok);
      })
      .catch(() => {
        // Tetap anonim.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const configured = (providers ?? []).filter((p) => p.configured).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-blue px-2 py-1 text-white">{t.badge}</span>
          </p>
          <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight text-black">
            {t.title}
          </h1>
          <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-muted">
            {loggedIn ? t.subLoggedIn : t.sub}
          </p>
          <p className="mt-3 max-w-[640px] border-2 border-black bg-yellow-soft p-3 text-[14px] leading-relaxed text-black shadow-brutal-sm">
            {t.tryLiveNote}
          </p>
        </div>
        <span className="border-2 border-black bg-white px-3.5 py-1.5 font-mono text-[12px] font-bold text-black shadow-brutal-xs">
          {providers === null
            ? t.loadingStatus
            : fill(t.providersActive, { configured, total: providers.length })}
        </span>
      </div>
      <div className="mt-8">
        <ChatPlayground providers={providers} loggedIn={loggedIn} />
      </div>
    </div>
  );
}
