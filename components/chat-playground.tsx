"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ProviderStatus } from "@/lib/free-ai-router";
import type { Dict } from "@/lib/i18n";
import { codedError, errorCode } from "@/lib/api-error";
import { fill, useLocale } from "@/components/locale-provider";
import { stripThinkBlocks, ThinkStripper } from "@/lib/think-strip";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  tried?: { provider: string; error: string }[];
};

type ConversationItem = {
  id: string;
  title: string;
  updatedAt: string;
};

type ComparePanel = {
  content: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  done: boolean;
  error?: string;
};

type CompareRun = {
  id: string;
  prompt: string;
  a: ComparePanel;
  b: ComparePanel;
};

const STORAGE_KEY = "hymn-router-chat-v1";

/**
 * Sentinel judul default yang disimpan di DB (lihat lib/chat-history.ts
 * + migrasi 003). Lapisan tampilan menerjemahkannya ke bahasa aktif
 * supaya pengguna EN tidak melihat judul Indonesia.
 */
const DEFAULT_TITLE_SENTINEL = "Percakapan baru";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Judul percakapan dari pesan pertama (maks ~40 karakter). */
function titleFromMessage(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 40) return oneLine || DEFAULT_TITLE_SENTINEL;
  return `${oneLine.slice(0, 40).trimEnd()}…`;
}

type RunCallbacks = {
  onDelta: (delta: string) => void;
  onMeta: (meta: { provider?: string; model?: string; tried?: ChatMsg["tried"] }) => void;
};

/**
 * Petakan error request chat ke pesan lokal. Pesan mentah API sengaja
 * tidak ditampilkan: teksnya campuran Indonesia/Inggris dan tidak
 * diterjemahkan (keputusan lama) — `code` stabil yang dipakai.
 */
function chatErrorText(err: unknown, t: Dict["chat"]): string {
  switch (errorCode(err)) {
    case "rate_limited":
      return t.rateLimited;
    case "invalid_key":
      return t.invalidKey;
    case "server_not_configured":
      return t.serverNotConfigured;
    case "all_providers_failed":
      return t.allProvidersFailed;
    case "invalid_json":
    case "invalid_request":
      return t.invalidRequest;
    default:
      return t.sendFailed;
  }
}

/**
 * Satu request chat ke /api/ai/chat (SSE + fallback non-stream).
 * Mengembalikan isi jawaban lengkap + metadata. Melempar Error kalau
 * gagal. Delta yang masuk sudah dipotong blok <think>-nya (jaring
 * pengaman kedua — server juga memotong di router).
 */
async function runChatRequest(
  apiMessages: { role: string; content: string }[],
  opts: {
    temperature: number;
    maxTokens: number;
    preferProvider?: string;
    signal: AbortSignal;
  },
  cb: RunCallbacks,
): Promise<{
  content: string;
  provider?: string;
  model?: string;
  tried?: ChatMsg["tried"];
}> {
  const baseBody = {
    messages: apiMessages,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    ...(opts.preferProvider ? { preferProvider: opts.preferProvider } : {}),
  };
  const stripper = new ThinkStripper();
  let full = "";

  const sendNonStream = async () => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baseBody),
      signal: opts.signal,
    });
    const data = (await res.json()) as {
      provider?: string;
      model?: string;
      content?: string;
      tried?: { provider: string; error: string }[];
      error?: string;
      code?: string;
    };
    if (!res.ok) throw codedError(data.error ?? `HTTP ${res.status}`, data.code);
    const content = stripThinkBlocks(data.content ?? "");
    return {
      content,
      provider: data.provider,
      model: data.model,
      tried: data.tried,
    };
  };

  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baseBody, stream: true }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw codedError(data.error ?? `HTTP ${res.status}`, data.code);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    const r = await sendNonStream();
    if (r.content) {
      full = r.content;
      cb.onDelta(r.content);
    }
    cb.onMeta({ provider: r.provider, model: r.model, tried: r.tried });
    return r;
  }

  // Parse SSE: event `meta` di awal, lalu chunk delta OpenAI.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let meta: { provider?: string; model?: string; tried?: ChatMsg["tried"] } = {};
  let streamed = false;
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
        cb.onMeta(meta);
        continue;
      }
      const rawDelta = parsed.choices?.[0]?.delta?.content ?? "";
      if (rawDelta) {
        const delta = stripper.push(rawDelta);
        if (delta) {
          streamed = true;
          full += delta;
          cb.onDelta(delta);
        }
      }
    }
  }
  // Sisa buffer stripper (teks jawaban yang tertahan di akhir stream).
  const tail = stripper.flush();
  if (tail) {
    streamed = true;
    full += tail;
    cb.onDelta(tail);
  }

  if (!streamed) {
    // Stream selesai tanpa satu pun delta bersih — coba non-stream sekali.
    const r = await sendNonStream();
    if (r.content) {
      full = r.content;
      cb.onDelta(r.content);
    }
    cb.onMeta({ provider: r.provider, model: r.model, tried: r.tried });
    return r;
  }
  return { content: full, provider: meta.provider, model: meta.model, tried: meta.tried };
}

export default function ChatPlayground({
  providers,
  loggedIn,
}: {
  providers: ProviderStatus[] | null;
  loggedIn: boolean;
}) {
  const { dict } = useLocale();
  const t = dict.chat;

  // Judul tampil: sentinel default diterjemahkan ke bahasa aktif.
  const displayTitle = (title: string) =>
    title === DEFAULT_TITLE_SENTINEL ? t.newConversationTitle : title;
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
  const compareAbortRef = useRef<AbortController[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollReadyRef = useRef(false);
  const prevCountRef = useRef(0);

  // ---- riwayat tersimpan (user login saja) ----
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // ---- mode banding ----
  const [compareMode, setCompareMode] = useState(false);
  const [providerB, setProviderB] = useState("kilo");
  const [compares, setCompares] = useState<CompareRun[]>([]);

  const setActive = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  // Muat riwayat dari localStorage (client only) — untuk user ANONIM.
  // User login memakai riwayat server (sidebar); localStorage tetap
  // dipakai sebagai fallback kalau mereka membuka percakapan lama di
  // perangkat ini sebelum login.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(parsed)) {
          // Potong blok <think> dari pesan lama (sebelum fix reasoning).
          setMessages(
            parsed
              .slice(-100)
              .map((m) => ({ ...m, content: stripThinkBlocks(m.content) })),
          );
        }
      }
    } catch {
      // abaikan — mulai dari kosong
    }
    setLoaded(true);
  }, []);

  // Simpan riwayat setiap berubah — hanya untuk user anonim. User login
  // menyimpan ke server (per percakapan); menulis localStorage juga
  // akan mencampur dua sumber riwayat.
  useEffect(() => {
    if (!loaded || loggedIn) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // storage penuh / privat — abaikan
    }
  }, [messages, loaded, loggedIn]);

  // Muat daftar percakapan tersimpan (user login).
  const fetchConversations = useCallback(async () => {
    if (!loggedIn) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = (await res.json()) as { conversations?: ConversationItem[] };
      if (!res.ok) throw new Error("list failed");
      setConversations(data.conversations ?? []);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

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
    for (const c of compareAbortRef.current) c.abort();
  }, []);

  // ---- persistence (user login) ----

  /** Pastikan ada percakapan aktif; buat baru dari pesan pertama bila belum ada. */
  const ensureConversation = useCallback(
    async (firstMessage: string): Promise<string | null> => {
      if (activeIdRef.current) return activeIdRef.current;
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleFromMessage(firstMessage) }),
        });
        const data = (await res.json()) as { conversation?: ConversationItem };
        if (!res.ok || !data.conversation) return null;
        setActive(data.conversation.id);
        setConversations((prev) => [data.conversation as ConversationItem, ...prev]);
        return data.conversation.id;
      } catch {
        return null;
      }
    },
    [setActive],
  );

  /** Simpan satu pesan ke percakapan. Gagal simpan tidak menggagalkan chat. */
  const persistMessage = useCallback(
    async (conversationId: string, role: "user" | "assistant", content: string) => {
      if (!content.trim()) return;
      try {
        const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content: content.slice(0, 20_000) }),
        });
        const data = (await res.json()) as { title?: string };
        if (!res.ok) {
          setSaveFailed(true);
          return;
        }
        // Judul bisa berubah (otomatis dari pesan pertama) — selaraskan daftar.
        if (data.title) {
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, title: data.title as string } : c)),
          );
        }
      } catch {
        setSaveFailed(true);
      }
    },
    [],
  );

  const newChat = useCallback(() => {
    setMessages([]);
    setCompares([]);
    setError(null);
    setActive(null);
  }, [setActive]);

  const openConversation = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/chat/conversations/${id}`);
        const data = (await res.json()) as {
          conversation?: ConversationItem;
          messages?: { id: string; role: string; content: string }[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setMessages(
          (data.messages ?? []).map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: stripThinkBlocks(m.content),
          })),
        );
        setCompares([]);
        setActive(id);
        setHistoryOpen(false);
      } catch (err) {
        setError(t.historyError);
      }
    },
    [setActive, t],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeIdRef.current === id) {
          setMessages([]);
          setCompares([]);
          setActive(null);
        }
      } catch (err) {
        setError(t.deleteFailed);
      }
    },
    [setActive, t],
  );

  // ---- kirim (mode normal) ----

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSaveFailed(false);
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

    // Simpan pesan user (user login) — jalan paralel, tidak memblokir chat.
    const convPromise = loggedIn
      ? ensureConversation(text).then((id) => {
          if (id) void persistMessage(id, "user", text);
          return id;
        })
      : Promise.resolve(null);

    const apiMessages: { role: string; content: string }[] =
      systemPrompt.trim() !== ""
        ? [{ role: "system", content: systemPrompt.trim() }]
        : [];
    for (const m of history) apiMessages.push({ role: m.role, content: m.content });

    const assistantId = uid();
    let streamed = false;
    let finalContent = "";
    const appendDelta = (delta: string) => {
      if (!streamed) {
        streamed = true;
        setStreaming(true);
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: delta },
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
      const result = await runChatRequest(
        apiMessages,
        {
          temperature,
          maxTokens,
          preferProvider: provider !== "auto" ? provider : undefined,
          signal: controller.signal,
        },
        {
          onDelta: appendDelta,
          onMeta: (meta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, provider: meta.provider, model: meta.model, tried: meta.tried }
                  : m,
              ),
            );
          },
        },
      );
      finalContent = result.content;
      // Lengkapi metadata + latensi pada pesan yang sudah mengalir.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                latencyMs: Date.now() - started,
                provider: result.provider ?? m.provider,
                model: result.model ?? m.model,
                tried: result.tried ?? m.tried,
              }
            : m,
        ),
      );
      if (!streamed && result.content) {
        // Non-stream fallback mengembalikan konten tanpa delta (seharusnya
        // tidak terjadi karena runChatRequest memanggil onDelta, tapi jaga).
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: result.content,
            provider: result.provider,
            model: result.model,
            latencyMs: Date.now() - started,
            tried: result.tried,
          },
        ]);
      }
      if (!streamed && !result.content) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: t.emptyResponse },
        ]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (streamed) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `${m.content}\n\n${t.stopped}`, latencyMs: Date.now() - started }
                : m,
            ),
          );
          finalContent = `${finalContent}\n\n${t.stopped}`;
        } else {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "assistant", content: t.stopped },
          ]);
        }
      } else if (streamed) {
        // Gagal di tengah stream: simpan teks parsial + tandai.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `${m.content}\n\n${t.streamInterrupted}`, latencyMs: Date.now() - started }
              : m,
          ),
        );
        finalContent = `${finalContent}\n\n${t.streamInterrupted}`;
      } else {
        setError(chatErrorText(err, t));
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setSending(false);
      setStreaming(false);
      abortRef.current = null;
      // Simpan jawaban asisten (user login) — setelah stream selesai.
      if (loggedIn && finalContent.trim()) {
        const convId = await convPromise;
        if (convId) void persistMessage(convId, "assistant", finalContent);
      }
    }
  }, [input, sending, messages, systemPrompt, temperature, maxTokens, provider, t, loggedIn, ensureConversation, persistMessage]);

  // ---- kirim (mode banding) ----

  const sendCompare = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSaveFailed(false);
    setInput("");
    setSending(true);
    setElapsed(0);

    const started = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - started), 100);

    const runId = uid();
    const emptyPanel = (): ComparePanel => ({ content: "", done: false });
    setCompares((prev) => [...prev, { id: runId, prompt: text, a: emptyPanel(), b: emptyPanel() }]);

    const convPromise = loggedIn
      ? ensureConversation(text).then((id) => {
          if (id) void persistMessage(id, "user", text);
          return id;
        })
      : Promise.resolve(null);

    const apiMessages: { role: string; content: string }[] =
      systemPrompt.trim() !== ""
        ? [{ role: "system", content: systemPrompt.trim() }]
        : [];
    for (const m of messages) apiMessages.push({ role: m.role, content: m.content });
    apiMessages.push({ role: "user", content: text });

    const updatePanel = (side: "a" | "b", patch: Partial<ComparePanel>) => {
      setCompares((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, [side]: { ...r[side], ...patch } } : r)),
      );
    };

    const runSide = async (side: "a" | "b", preferProvider: string | undefined) => {
      const controller = new AbortController();
      compareAbortRef.current.push(controller);
      let content = "";
      try {
        const result = await runChatRequest(
          apiMessages,
          {
            temperature,
            maxTokens,
            preferProvider,
            signal: controller.signal,
          },
          {
            onDelta: (delta) => {
              content += delta;
              updatePanel(side, { content });
            },
            onMeta: (meta) => {
              updatePanel(side, { provider: meta.provider, model: meta.model });
            },
          },
        );
        content = result.content;
        updatePanel(side, {
          content: result.content || t.compareNoAnswer,
          provider: result.provider,
          model: result.model,
          latencyMs: Date.now() - started,
          done: true,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          updatePanel(side, { content: content || t.stopped, done: true });
        } else {
          updatePanel(side, {
            content: content || t.compareNoAnswer,
            error: chatErrorText(err, t),
            done: true,
          });
        }
      }
      return content;
    };

    const [contentA, contentB] = await Promise.all([
      runSide("a", provider !== "auto" ? provider : undefined),
      runSide("b", providerB !== "auto" ? providerB : undefined),
    ]);

    if (timerRef.current) clearInterval(timerRef.current);
    setSending(false);
    compareAbortRef.current = [];

    // Simpan kedua jawaban (user login) — masing-masing dengan label model.
    if (loggedIn) {
      const convId = await convPromise;
      if (convId) {
        const label = (side: "a" | "b") =>
          side === "a"
            ? provider !== "auto"
              ? provider
              : "auto"
            : providerB !== "auto"
              ? providerB
              : "auto";
        if (contentA.trim()) {
          await persistMessage(convId, "assistant", `[${label("a")}]\n\n${contentA}`);
        }
        if (contentB.trim()) {
          await persistMessage(convId, "assistant", `[${label("b")}]\n\n${contentB}`);
        }
      }
    }
  }, [input, sending, messages, systemPrompt, temperature, maxTokens, provider, providerB, t, loggedIn, ensureConversation, persistMessage]);

  const handleSend = useCallback(() => {
    if (compareMode) void sendCompare();
    else void send();
  }, [compareMode, send, sendCompare]);

  const configured = (providers ?? []).filter((p) => p.configured);
  const selectable = providers ?? [];

  /** Label model yang dipakai saat ini (untuk hint di bawah input). */
  const currentModelLabel =
    provider === "auto"
      ? t.autoOption
      : (() => {
          const p = selectable.find((x) => x.id === provider);
          return p ? `${p.id} · ${p.model}` : provider;
        })();

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Tombol riwayat (mobile saja) */}
      <div className="lg:hidden">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="h-11 w-full border-2 border-black bg-white px-3 text-sm font-bold text-black shadow-brutal-sm"
        >
          {t.toggleHistory} {historyOpen ? "▴" : "▾"}
        </button>
      </div>

      {/* Sidebar riwayat */}
      <aside
        className={`${
          historyOpen ? "flex" : "hidden"
        } min-w-0 flex-col border-2 border-black bg-white shadow-brutal-sm lg:flex lg:w-64 lg:shrink-0`}
      >
        <div className="flex items-center justify-between gap-2 border-b-2 border-black px-4 py-3">
          <h2 className="text-[14px] font-black text-black">{t.historyTitle}</h2>
          <button
            onClick={newChat}
            className="flex h-11 shrink-0 items-center border-2 border-black bg-yellow px-3 text-[12px] font-bold text-black"
          >
            {t.newChat}
          </button>
        </div>
        {!loggedIn ? (
          <div className="p-4">
            <p className="text-[13px] leading-relaxed text-muted">{t.signInToSave}</p>
            <Link
              href="/login?next=/chat"
              className="mt-2 inline-flex min-h-[44px] items-center font-mono text-[13px] font-bold text-blue underline underline-offset-4 hover:text-black"
            >
              {t.signInLink}
            </Link>
          </div>
        ) : historyLoading ? (
          <p className="p-4 font-mono text-[12px] text-muted">{t.loadingConversations}</p>
        ) : historyError ? (
          <p className="p-4 text-[13px] leading-relaxed text-bad">{t.historyError}</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-[13px] leading-relaxed text-muted">{t.noConversations}</p>
        ) : (
          <ul className="flex flex-col">
            {conversations.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-1 border-b border-neutral-300 last:border-0 ${
                  c.id === activeId ? "bg-yellow-soft" : ""
                }`}
              >
                <button
                  onClick={() => void openConversation(c.id)}
                  title={displayTitle(c.title)}
                  className="min-w-0 flex-1 truncate px-4 py-3 text-left text-[13px] font-bold text-black hover:text-blue"
                >
                  {displayTitle(c.title)}
                </button>
                <button
                  onClick={() => void deleteConversation(c.id)}
                  aria-label={`${t.deleteConversation}: ${displayTitle(c.title)}`}
                  title={t.deleteConversation}
                  className="mr-2 flex h-11 min-w-[44px] shrink-0 items-center justify-center border border-black bg-white px-2 font-mono text-[11px] font-bold text-bad hover:bg-bad hover:text-white"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Kolom chat utama */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Kontrol */}
        <div className="flex flex-wrap items-end gap-3 border-2 border-black bg-yellow-soft p-3 shadow-brutal-sm">
          <label className="flex min-w-0 w-full flex-col gap-1 sm:w-auto">
            <span className="text-[11px] font-bold uppercase tracking-wide text-black">
              {compareMode ? t.compareModelA : t.providerLabel}
            </span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-11 w-full max-w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-auto sm:max-w-[320px] sm:text-sm"
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

          {compareMode && (
            <label className="flex min-w-0 w-full flex-col gap-1 sm:w-auto">
              <span className="text-[11px] font-bold uppercase tracking-wide text-black">
                {t.compareModelB}
              </span>
              <select
                value={providerB}
                onChange={(e) => setProviderB(e.target.value)}
                className="h-11 w-full max-w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-auto sm:max-w-[320px] sm:text-sm"
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
          )}

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
              className="h-11 w-full accent-[#0c0c0c] sm:w-32"
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
              className="h-11 w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-24 sm:text-sm"
            />
          </label>

          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <button
              onClick={() => setCompareMode((v) => !v)}
              aria-pressed={compareMode}
              className={`h-11 flex-1 whitespace-nowrap border-2 border-black px-3 text-sm font-bold text-black sm:flex-none ${
                compareMode ? "bg-yellow shadow-brutal-xs" : "bg-white hover:bg-yellow-soft"
              }`}
            >
              {t.compareToggle}
            </button>
            <button
              onClick={() => setShowSystem((v) => !v)}
              className="h-11 flex-1 whitespace-nowrap border-2 border-black bg-white px-3 text-sm font-bold text-black hover:bg-yellow-soft sm:flex-none"
            >
              {showSystem ? t.systemHide : t.systemShow}
            </button>
            <button
              onClick={() => {
                setMessages([]);
                setCompares([]);
                setError(null);
              }}
              className="h-11 flex-1 whitespace-nowrap border-2 border-black bg-white px-3 text-sm font-bold text-black hover:bg-yellow-soft disabled:opacity-50 sm:flex-none"
              disabled={messages.length === 0 && compares.length === 0}
            >
              {t.clearHistory}
            </button>
          </div>

          {showSystem && (
            <input
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t.systemPlaceholder}
              aria-label={t.systemShow}
              className="h-11 w-full border-2 border-black bg-white px-2 text-base text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] sm:text-sm"
            />
          )}

          {compareMode && (
            <p className="w-full font-mono text-[12px] leading-relaxed text-black">
              {t.compareQuotaNote}
            </p>
          )}
        </div>

        {providers !== null && configured.length === 0 && (
          <div className="border-2 border-black bg-yellow p-3 text-sm font-medium text-black shadow-brutal-sm">
            {t.noProvidersWarning}
          </div>
        )}

        {/* Riwayat chat */}
        <div className="flex min-h-[320px] flex-col gap-3 border-2 border-black bg-white p-3 shadow-brutal-sm">
          {messages.length === 0 && compares.length === 0 && !sending && (
            <div className="m-auto max-w-md py-10 text-center">
              <p className="font-mono text-sm font-bold text-black">{t.emptyTitle}</p>
              <p className="mt-1 text-sm text-faint">
                {loggedIn ? t.emptyBodyLoggedIn : t.emptyBody}
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
                    m.role === "user" ? "text-blue" : "text-green-dark"
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
                  {t.triedLabel}{" "}
                  {m.tried.map((t) => `${t.provider} (${t.error.slice(0, 60)})`).join(" → ")}
                  {m.provider ? ` → ${m.provider} ✓` : ""}
                </p>
              )}
            </div>
          ))}

          {/* Hasil mode banding: dua panel berdampingan per prompt */}
          {compares.map((run) => (
            <div key={run.id} className="flex flex-col gap-2 border-2 border-black bg-yellow-soft p-3">
              <p className="whitespace-pre-wrap break-words text-sm font-bold leading-relaxed text-black">
                {run.prompt}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {(
                  [
                    { side: "a" as const, panel: run.a },
                    { side: "b" as const, panel: run.b },
                  ] as const
                ).map(({ side, panel }) => (
                  <div key={side} className="min-w-0 border-2 border-black bg-white px-3 py-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="border-2 border-black bg-yellow px-1.5 py-0.5 font-mono text-[11px] font-bold text-black">
                        {side === "a" ? "A" : "B"}
                      </span>
                      {panel.provider && (
                        <span className="break-all border border-black bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted">
                          {panel.provider} · {panel.model}
                        </span>
                      )}
                      {typeof panel.latencyMs === "number" && (
                        <span className="font-mono text-[11px] text-faint">
                          {(panel.latencyMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    {panel.content ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-black">
                        {panel.content}
                      </p>
                    ) : (
                      <p className="text-sm text-muted">
                        {panel.done ? t.compareNoAnswer : t.waiting}
                      </p>
                    )}
                    {panel.error && (
                      <p className="mt-1.5 break-words font-mono text-[11px] leading-relaxed text-bad">
                        {panel.error.slice(0, 200)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {sending && !streaming && !compareMode && (
            <div className="border-2 border-black bg-white px-3 py-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-green-dark">
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
          <div role="alert" className="border-2 border-black bg-white p-3 text-sm font-medium text-bad shadow-brutal-sm">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wide">{t.errorLabel} · </span>
            <span className="break-words font-mono text-xs">{error}</span>
          </div>
        )}

        {saveFailed && (
          <div className="border-2 border-black bg-yellow-soft p-3 text-sm font-medium text-black shadow-brutal-sm">
            {t.saveFailedNote}
          </div>
        )}

        {/* Composer */}
        <div className="flex flex-col gap-2 border-2 border-black bg-yellow-soft p-3 shadow-brutal-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={t.composerLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={3}
            placeholder={t.composerPlaceholder}
            className="w-full resize-none border-2 border-black bg-white px-3 py-2 text-base text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] disabled:opacity-60 sm:text-sm"
            disabled={sending}
          />
          <p className="font-mono text-[12px] leading-relaxed text-black">
            {fill(t.modelHint, { model: currentModelLabel })}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold text-black">
              {providers === null
                ? t.loadingStatus
                : fill(t.footerStats, { configured: configured.length, total: selectable.length })}
            </span>
            {sending ? (
              <button
                onClick={stop}
                className="h-11 border-2 border-bad bg-white px-5 text-sm font-bold text-bad hover:bg-bad hover:text-white"
              >
                {t.stopBtn}
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={input.trim() === ""}
                className="btn-press h-11 border-2 border-black bg-yellow px-5 text-sm font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.sendBtn}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
