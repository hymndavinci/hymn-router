"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStatus } from "@/lib/free-ai-router";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  tried?: { provider: string; error: string }[];
};

const STORAGE_KEY = "hymn-router-chat-v1";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatPlayground({ providers }: { providers: ProviderStatus[] | null }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [sending, setSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Muat riwayat dari localStorage (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed)) setMessages(parsed.slice(-100));
      }
    } catch {
      // abaikan — mulai dari kosong
    }
    setLoaded(true);
  }, []);

  // Simpan riwayat setiap berubah.
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // storage penuh / privat — abaikan
    }
  }, [messages, loaded]);

  // Auto-scroll ke pesan terbaru.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");

    const userMsg: ChatMsg = { id: uid(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setSending(true);
    setElapsed(0);

    const started = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - started), 100);
    const controller = new AbortController();
    abortRef.current = controller;

    const apiMessages: { role: string; content: string }[] =
      systemPrompt.trim() !== ""
        ? [{ role: "system", content: systemPrompt.trim() }]
        : [];
    for (const m of history) apiMessages.push({ role: m.role, content: m.content });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          temperature,
          maxTokens,
          ...(provider !== "auto" ? { preferProvider: provider } : {}),
        }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        provider?: string;
        model?: string;
        content?: string;
        tried?: { provider: string; error: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const assistantMsg: ChatMsg = {
        id: uid(),
        role: "assistant",
        content: data.content ?? "(respon kosong)",
        provider: data.provider,
        model: data.model,
        latencyMs: Date.now() - started,
        tried: data.tried,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: "(dihentikan)" },
        ]);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setSending(false);
      abortRef.current = null;
    }
  }, [input, sending, messages, systemPrompt, temperature, maxTokens, provider]);

  const configured = (providers ?? []).filter((p) => p.configured);
  const selectable = providers ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Kontrol */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-panel p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">Provider</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="h-9 rounded-md border border-line-2 bg-panel-2 px-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="auto">Auto (fallback chain)</option>
            {selectable.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.configured}>
                {p.id} — {p.model}
                {!p.configured ? " (butuh key)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            Temperature · {temperature.toFixed(1)}
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="h-9 w-32 accent-[#a78bfa]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">Max tokens</span>
          <input
            type="number"
            min={1}
            max={8192}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="h-9 w-24 rounded-md border border-line-2 bg-panel-2 px-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSystem((v) => !v)}
            className="h-9 rounded-md border border-line-2 bg-panel-2 px-3 text-sm text-muted hover:text-text"
          >
            {showSystem ? "Sembunyikan system prompt" : "System prompt"}
          </button>
          <button
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="h-9 rounded-md border border-line-2 bg-panel-2 px-3 text-sm text-muted hover:text-text"
            disabled={messages.length === 0}
          >
            Hapus riwayat
          </button>
        </div>

        {showSystem && (
          <input
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="System prompt (opsional), mis. Jawab singkat dalam Bahasa Indonesia."
            className="h-9 w-full rounded-md border border-line-2 bg-panel-2 px-2 text-sm text-text outline-none placeholder:text-faint focus:border-accent"
          />
        )}
      </div>

      {providers !== null && configured.length === 0 && (
        <div className="rounded-md border border-warn/40 bg-panel p-3 text-sm text-warn">
          Belum ada provider yang terkonfigurasi — ini seharusnya tidak terjadi, karena Kilo &amp;
          LLM7 keyless selalu aktif. Cek tab Providers.
        </div>
      )}

      {/* Riwayat chat */}
      <div className="flex min-h-[320px] flex-col gap-3 rounded-md border border-line bg-panel p-3">
        {messages.length === 0 && !sending && (
          <div className="m-auto max-w-md py-10 text-center">
            <p className="font-mono text-sm text-muted">Belum ada pesan.</p>
            <p className="mt-1 text-sm text-faint">
              Ketik di bawah untuk ngetes router. Tanpa API key pun langsung jalan lewat Kilo &amp;
              LLM7 — tambah key gratis (Groq, Gemini, dll) di <code className="font-mono text-muted">.env.local</code> kalau
              mau kapasitas lebih besar.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-md border border-line px-3 py-2 ${
              m.role === "user" ? "bg-panel-2" : "bg-panel"
            }`}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`font-mono text-[11px] font-semibold uppercase tracking-wide ${
                  m.role === "user" ? "text-accent" : "text-ok"
                }`}
              >
                {m.role === "user" ? "lu" : "asisten"}
              </span>
              {m.provider && (
                <span className="rounded border border-line-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  {m.provider} · {m.model}
                </span>
              )}
              {typeof m.latencyMs === "number" && (
                <span className="font-mono text-[11px] text-faint">
                  {(m.latencyMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{m.content}</p>
            {m.tried && m.tried.length > 0 && (
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-faint">
                fallback:{" "}
                {m.tried.map((t) => `${t.provider} (${t.error.slice(0, 60)})`).join(" → ")}
                {m.provider ? ` → ${m.provider} ✓` : ""}
              </p>
            )}
          </div>
        ))}

        {sending && (
          <div className="rounded-md border border-line bg-panel px-3 py-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ok">
              asisten
            </span>
            <p className="text-sm text-muted">
              menunggu jawaban… {(elapsed / 1000).toFixed(1)}s
              <span className="animate-blink ml-1">▌</span>
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="rounded-md border border-bad/40 bg-panel p-3 text-sm text-bad">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">error · </span>
          <span className="break-words font-mono text-xs">{error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="flex flex-col gap-2 rounded-md border border-line bg-panel p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          placeholder="Tulis pesan… (Enter untuk kirim, Shift+Enter untuk baris baru)"
          className="w-full resize-none rounded-md border border-line-2 bg-panel-2 px-3 py-2 text-sm text-text outline-none placeholder:text-faint focus:border-accent"
          disabled={sending}
        />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-faint">
            {configured.length}/{selectable.length || 9} provider aktif · POST /api/ai/chat
          </span>
          {sending ? (
            <button
              onClick={stop}
              className="h-9 rounded-md border border-bad/50 bg-panel-2 px-4 text-sm font-medium text-bad hover:bg-panel"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => void send()}
              disabled={input.trim() === ""}
              className="h-9 rounded-md bg-accent-dim px-4 text-sm font-medium text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kirim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
