"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStatus } from "@/lib/free-ai-router";
import { fill, useLocale } from "@/components/locale-provider";

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
  const { dict } = useLocale();
  const t = dict.chat;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [provider, setProvider] = useState("auto");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [sending, setSending] = useState(false);
  /** true sejak delta pertama stream diterima (sembunyikan "menunggu…"). */
  const [streaming, setStreaming] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollReadyRef = useRef(false);
  const prevCountRef = useRef(0);

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

  // Auto-scroll ke pesan terbaru — hanya saat ada pesan BARU atau saat
  // mulai mengirim. Jangan scroll saat halaman pertama dimuat (termasuk
  // saat riwayat dari localStorage selesai dimuat): user harus melihat
  // header & kontrol dulu, bukan langsung dijebloskan ke bawah.
  useEffect(() => {
    if (!loaded) return;
    if (!scrollReadyRef.current) {
      scrollReadyRef.current = true;
      prevCountRef.current = messages.length;
      return;
    }
    if (messages.length > prevCountRef.current || sending) {
      // Saat stream mengalir, scroll instan (smooth tiap delta bikin lag).
      bottomRef.current?.scrollIntoView({
        behavior: streaming ? "auto" : "smooth",
        block: "end",
      });
    }
    prevCountRef.current = messages.length;
  }, [messages, sending, streaming, loaded]);

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
    setStreaming(false);
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

    const baseBody = {
      messages: apiMessages,
      temperature,
      maxTokens,
      ...(provider !== "auto" ? { preferProvider: provider } : {}),
    };

    // Fallback non-stream: dipakai kalau streaming gagal SEBELUM token
    // pertama (mis. server/proxy tidak mendukung SSE).
    const sendNonStream = async () => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseBody),
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
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: data.content ?? t.emptyResponse,
          provider: data.provider,
          model: data.model,
          latencyMs: Date.now() - started,
          tried: data.tried,
        },
      ]);
    };

    // Pesan asisten diisi token demi token saat stream mengalir.
    const assistantId = uid();
    let streamed = false;
    let meta: { provider?: string; model?: string; tried?: ChatMsg["tried"] } = {};

    const appendDelta = (delta: string) => {
      if (!streamed) {
        streamed = true;
        setStreaming(true);
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: delta,
            provider: meta.provider,
            model: meta.model,
            tried: meta.tried,
          },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta } : m,
          ),
        );
      }
    };

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseBody, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Error validasi / rate limit / semua provider gagal — fallback
        // non-stream akan mengembalikan error yang sama, jadi langsung
        // lempar saja.
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream") || !res.body) {
        // Server membalas JSON (mis. deploy lama belum support stream).
        await sendNonStream();
        return;
      }

      // Parse SSE: event `meta` di awal, lalu chunk delta OpenAI.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line === "") {
            currentEvent = "";
            continue;
          }
          if (line.startsWith(":")) continue;
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
            continue;
          }
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          let parsed: {
            provider?: string;
            model?: string;
            tried?: ChatMsg["tried"];
            choices?: { delta?: { content?: string | null } }[];
          };
          try {
            parsed = JSON.parse(data) as typeof parsed;
          } catch {
            continue;
          }
          if (currentEvent === "meta") {
            meta = { provider: parsed.provider, model: parsed.model, tried: parsed.tried };
            continue;
          }
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) appendDelta(delta);
        }
      }

      if (streamed) {
        // Lengkapi metadata + latensi pada pesan yang sudah mengalir.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  latencyMs: Date.now() - started,
                  provider: meta.provider ?? m.provider,
                  model: meta.model ?? m.model,
                  tried: meta.tried ?? m.tried,
                }
              : m,
          ),
        );
      } else {
        // Stream selesai tanpa satu pun delta — coba non-stream sekali.
        await sendNonStream();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (streamed) {
          // Teks yang sudah terkirim tetap disimpan.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `${m.content}\n\n${t.stopped}`, latencyMs: Date.now() - started }
                : m,
            ),
          );
        } else {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "assistant", content: t.stopped },
          ]);
        }
      } else if (!streamed) {
        // Gagal sebelum token pertama (mis. SSE diblokir proxy): coba
        // non-stream sekali sebelum menampilkan error.
        try {
          await sendNonStream();
        } catch (err2) {
          setError(err2 instanceof Error ? err2.message : String(err2));
        }
      } else {
        // Gagal di tengah stream: simpan teks parsial + tandai.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `${m.content}\n\n${t.streamInterrupted}`, latencyMs: Date.now() - started }
              : m,
          ),
        );
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setSending(false);
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, sending, messages, systemPrompt, temperature, maxTokens, provider, t]);

  const configured = (providers ?? []).filter((p) => p.configured);
  const selectable = providers ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Kontrol */}
      <div className="flex flex-wrap items-end gap-3 border-2 border-black bg-yellow-soft p-3 shadow-brutal-sm">
        <label className="flex min-w-0 w-full flex-col gap-1 sm:w-auto">
          <span className="text-[11px] font-bold uppercase tracking-wide text-black">{t.providerLabel}</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="h-10 w-full max-w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-auto sm:max-w-[320px] sm:text-sm"
          >
            <option value="auto">{t.autoOption}</option>
            {selectable.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.configured}>
                {p.id} — {p.model}
                {!p.configured ? t.needsKeySuffix : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
          <span className="text-[11px] font-bold uppercase tracking-wide text-black">
            {fill(t.temperatureLabel, { t: temperature.toFixed(1) })}
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="h-10 w-full accent-[#0c0c0c] sm:w-32"
          />
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
          <span className="text-[11px] font-bold uppercase tracking-wide text-black">{t.maxTokensLabel}</span>
          <input
            type="number"
            min={1}
            max={8192}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="h-10 w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-24 sm:text-sm"
          />
        </label>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <button
            onClick={() => setShowSystem((v) => !v)}
            className="h-10 flex-1 border-2 border-black bg-white px-3 text-sm font-bold text-black hover:bg-yellow-soft sm:flex-none"
          >
            {showSystem ? t.systemHide : t.systemShow}
          </button>
          <button
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="h-10 flex-1 border-2 border-black bg-white px-3 text-sm font-bold text-black hover:bg-yellow-soft disabled:opacity-50 sm:flex-none"
            disabled={messages.length === 0}
          >
            {t.clearHistory}
          </button>
        </div>

        {showSystem && (
          <input
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={t.systemPlaceholder}
            className="h-10 w-full border-2 border-black bg-white px-2 text-base text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] sm:text-sm"
          />
        )}
      </div>

      {providers !== null && configured.length === 0 && (
        <div className="border-2 border-black bg-yellow p-3 text-sm font-medium text-black shadow-brutal-sm">
          {t.noProvidersWarning}
        </div>
      )}

      {/* Riwayat chat */}
      <div className="flex min-h-[320px] flex-col gap-3 border-2 border-black bg-white p-3 shadow-brutal-sm">
        {messages.length === 0 && !sending && (
          <div className="m-auto max-w-md py-10 text-center">
            <p className="font-mono text-sm font-bold text-black">{t.emptyTitle}</p>
            <p className="mt-1 text-sm text-faint">
              {t.emptyBody}
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`border-2 border-black px-3 py-2 ${
              m.role === "user" ? "bg-yellow-soft" : "bg-white"
            }`}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-wide ${
                  m.role === "user" ? "text-blue" : "text-green"
                }`}
              >
                {m.role === "user" ? t.youLabel : t.assistantLabel}
              </span>
              {m.provider && (
                <span className="break-all border border-black bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted">
                  {m.provider} · {m.model}
                </span>
              )}
              {typeof m.latencyMs === "number" && (
                <span className="font-mono text-[11px] text-faint">
                  {(m.latencyMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-black">{m.content}</p>
            {m.tried && m.tried.length > 0 && (
              <p className="mt-1.5 break-words font-mono text-[11px] leading-relaxed text-faint">
                fallback:{" "}
                {m.tried.map((t) => `${t.provider} (${t.error.slice(0, 60)})`).join(" → ")}
                {m.provider ? ` → ${m.provider} ✓` : ""}
              </p>
            )}
          </div>
        ))}

        {sending && !streaming && (
          <div className="border-2 border-black bg-white px-3 py-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-green">
              {t.assistantLabel}
            </span>
            <p className="text-sm text-muted">
              {t.waiting} {(elapsed / 1000).toFixed(1)}s
              <span className="animate-blink ml-1">▌</span>
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-2 border-black bg-white p-3 text-sm font-medium text-bad shadow-brutal-sm">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wide">error · </span>
          <span className="break-words font-mono text-xs">{error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="flex flex-col gap-2 border-2 border-black bg-yellow-soft p-3 shadow-brutal-sm">
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
          placeholder={t.composerPlaceholder}
          className="w-full resize-none border-2 border-black bg-white px-3 py-2 text-base text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] disabled:opacity-60 sm:text-sm"
          disabled={sending}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-bold text-black">
            {fill(t.footerStats, { configured: configured.length, total: selectable.length || 9 })}
          </span>
          {sending ? (
            <button
              onClick={stop}
              className="h-10 border-2 border-bad bg-white px-5 text-sm font-bold text-bad hover:bg-bad hover:text-white"
            >
              {t.stopBtn}
            </button>
          ) : (
            <button
              onClick={() => void send()}
              disabled={input.trim() === ""}
              className="btn-press h-10 border-2 border-black bg-yellow px-5 text-sm font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.sendBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
