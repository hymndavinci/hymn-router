/**
 * ProviderSection — client wrapper untuk grid provider di landing.
 * Data awal dari server (getProviderStatus), lalu refresh tiap 30 detik
 * lewat GET /api/ai/chat. Render kartu lewat ProvidersPanel.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderStatus } from "@/lib/free-ai-router";
import ProvidersPanel from "@/components/providers-panel";

export default function ProviderSection({ initial }: { initial: ProviderStatus[] }) {
  const [providers, setProviders] = useState<ProviderStatus[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/ai/chat");
      const data = (await res.json()) as { providers?: ProviderStatus[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setProviders(data.providers ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  return (
    <ProvidersPanel
      providers={providers}
      error={error}
      refreshing={refreshing}
      onRefresh={() => void fetchStatus()}
    />
  );
}
