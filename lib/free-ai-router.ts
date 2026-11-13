/**
 * free-ai-router.ts — AI Router 100% gratis, tanpa dependency tambahan.
 *
 * Semua provider di bawah ini OpenAI-compatible, jadi satu client fetch
 * bisa dipakai untuk semuanya. Router mencoba provider secara berurutan
 * (fallback chain): kalau satu kena 429 / 5xx / timeout, lanjut ke
 * provider berikutnya. Tanpa API key pun sudah jalan lewat Kilo + LLM7.
 *
 * CARA PAKAI (server-side only — jangan pernah import ini di client):
 *
 *   import { chat } from "@/lib/free-ai-router";
 *   const res = await chat([{ role: "user", content: "halo" }]);
 *   console.log(res.provider, res.model, res.content);
 *
 * Key dibaca dari env (lihat .env.example). Provider yang butuh key tapi
 * key-nya tidak ada akan di-skip otomatis.
 *
 * Diverifikasi live dari VM, 2026-11-13:
 *   - Kilo (kilo-auto/free, tanpa key) .......... OK, HTTP 200
 *   - LLM7 (gpt-oss:20b, tanpa key) ............. OK, HTTP 200
 *   - OpenRouter :free (15 model, via /v1/models) OK, butuh key untuk chat
 *   - OVHcloud (gpt-oss-20b, tanpa key) .......... OK, HTTP 200 (lambat,
 *     ~15 detik; curl sempat gagal 2x, node berhasil)
 *   - Pollinations legacy lane (gpt-oss-20b) .... OK, HTTP 200 via node
 *     (curl sempat gagal 2x — koneksi VM kadang flaky ke host ini)
 * Key-required (Groq / Gemini / NVIDIA / Mistral / Cloudflare) diambil
 * dari dokumentasi resmi per Okt–Nov 2026, belum dites tanpa key.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderConfig = {
  /** id unik, dipakai di log & status */
  id: string;
  /** base URL OpenAI-compatible (tanpa /chat/completions) */
  baseUrl: string;
  /** model id default untuk provider ini */
  model: string;
  /** key dari env; undefined = provider di-skip (kecuali needsKey false) */
  apiKey?: string;
  /** false = bisa dipanggil tanpa key */
  needsKey: boolean;
  /** catatan limit / caveat, tampil di GET status */
  notes: string;
  /** timeout per request (ms) */
  timeoutMs: number;
};

export type ChatResult = {
  provider: string;
  model: string;
  content: string;
  /** provider yang gagal sebelum yang berhasil, beserta alasannya */
  tried: { provider: string; error: string }[];
  /** token usage kalau provider mengembalikannya */
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type ProviderStatus = {
  id: string;
  model: string;
  configured: boolean;
  needsKey: boolean;
  notes: string;
  requests: number;
  successes: number;
  lastError?: string;
  lastUsedAt?: string;
  coolingDownUntil?: string;
};

/** Cooldown setelah 429 / 5xx: jangan hantam provider yang baru gagal. */
const COOLDOWN_MS = 60_000;
/** Default timeout per provider. */
const DEFAULT_TIMEOUT_MS = 25_000;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Urutan fallback default. Keyed provider dulu (kapasitas & model lebih
 * bagus), keyless di belakang sebagai jaring pengaman. OpenRouter ditaruh
 * setelah Gemini supaya kuota 50 req/hari-nya hemat.
 */
export function getProviders(): ProviderConfig[] {
  return [
    {
      id: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "openai/gpt-oss-120b",
      apiKey: env("GROQ_API_KEY"),
      needsKey: true,
      notes: "Free: 30 RPM, 1000 req/hari, 200K token/hari per model. Tanpa kartu.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "nvidia",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      apiKey: env("NVIDIA_API_KEY"),
      needsKey: true,
      notes: "Free: ~40 RPM, 10K req/hari per model. Trial/eval only, bukan produksi.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite",
      apiKey: env("GEMINI_API_KEY"),
      needsKey: true,
      notes: "Free: Flash-Lite 500 req/hari; Flash 20 req/hari. Prompt free-tier bisa dipakai Google untuk improve produk.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: env("OPENROUTER_MODEL") ?? "nvidia/nemotron-3-ultra-550b-a55b:free",
      apiKey: env("OPENROUTER_API_KEY"),
      needsKey: true,
      notes: "Free: 20 RPM, 50 req/hari (1000/hari setelah top-up $10 sekali). Model :free bisa berubah sewaktu-waktu.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "mistral",
      baseUrl: "https://api.mistral.ai/v1",
      model: "mistral-small-latest",
      apiKey: env("MISTRAL_API_KEY"),
      needsKey: true,
      notes: "Free mode: $10 kredit/bulan. Tanpa kartu.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "kilo",
      baseUrl: "https://api.kilo.ai/api/gateway",
      model: "kilo-auto/free",
      apiKey: env("KILO_API_KEY"),
      needsKey: false,
      notes: "Tanpa key: 200 req/jam per IP. Auto-router bisa kirim ke provider yang me-log prompt.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "llm7",
      baseUrl: "https://api.llm7.io/v1",
      model: "gpt-oss:20b",
      apiKey: env("LLM7_API_KEY"),
      needsKey: false,
      notes: "Tanpa key bisa panggil model turbo. Token gratis di token.llm7.io: 60 RPM, 250 req/jam, 100K token/24 jam.",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    {
      id: "pollinations",
      baseUrl: "https://text.pollinations.ai/openai",
      model: "gpt-oss-20b",
      needsKey: false,
      notes: "Legacy lane tanpa key, ~1 req/15 detik. Terverifikasi OK via node 2026-11-13.",
      timeoutMs: 45_000,
    },
    {
      id: "ovh",
      baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
      model: "gpt-oss-20b",
      needsKey: false,
      notes: "Tanpa key: 2 req/menit per IP per model. Terverifikasi OK via node 2026-11-13, tapi lambat (~15 detik).",
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
  ];
}

// ---- statistik & cooldown in-memory (per proses server) ----

type Stats = {
  requests: number;
  successes: number;
  lastError?: string;
  lastUsedAt?: string;
  coolingDownUntil: number;
};

const stats = new Map<string, Stats>();

function getStats(id: string): Stats {
  let s = stats.get(id);
  if (!s) {
    s = { requests: 0, successes: 0, coolingDownUntil: 0 };
    stats.set(id, s);
  }
  return s;
}

export function getProviderStatus(): ProviderStatus[] {
  return getProviders().map((p) => {
    const s = getStats(p.id);
    return {
      id: p.id,
      model: p.model,
      configured: !p.needsKey || !!p.apiKey,
      needsKey: p.needsKey,
      notes: p.notes,
      requests: s.requests,
      successes: s.successes,
      lastError: s.lastError,
      lastUsedAt: s.lastUsedAt,
      coolingDownUntil:
        s.coolingDownUntil > Date.now()
          ? new Date(s.coolingDownUntil).toISOString()
          : undefined,
    };
  });
}

/** Header umum untuk memanggil provider (auth + OpenRouter extras). */
function providerHeaders(p: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (p.apiKey) headers["Authorization"] = `Bearer ${p.apiKey}`;
  // OpenRouter minta referer + title (opsional tapi disarankan).
  if (p.id === "openrouter") {
    if (process.env.SITE_URL) headers["HTTP-Referer"] = process.env.SITE_URL;
    headers["X-Title"] = process.env.SITE_TITLE ?? "AI Router";
  }
  return headers;
}

/** Model yang dipakai untuk provider ini (dengan override OpenRouter bila ada). */
function resolveModel(p: ProviderConfig, opts: { modelOverride?: string }): string {
  return p.id === "openrouter" && opts.modelOverride ? opts.modelOverride : p.model;
}

async function callProvider(
  p: ProviderConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal; modelOverride?: string },
): Promise<{ content: string; usage?: ChatResult["usage"] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), p.timeoutMs);
  // Gabungkan signal luar (kalau ada) dengan timeout internal.
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: providerHeaders(p),
      body: JSON.stringify({
        model: resolveModel(p, opts),
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null; reasoning?: string } }[];
      usage?: ChatResult["usage"];
    };
    const choice = data.choices?.[0]?.message;
    // Beberapa model reasoning (mis. lewat Kilo) mengembalikan reasoning
    // dan content null — pakai reasoning sebagai fallback terakhir.
    const content = choice?.content ?? choice?.reasoning ?? "";
    if (!content) throw new Error("empty response from provider");
    return { content, usage: data.usage };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`timeout after ${p.timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

export type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
  /** batasi chain ke provider tertentu saja, mis. ["groq", "kilo"] */
  onlyProviders?: string[];
  /** paksa provider pertama, tetap fallback ke sisanya kalau gagal */
  preferProvider?: string;
  /**
   * Override model HANYA untuk provider OpenRouter (mis. model :free lain).
   * Dipakai bersama preferProvider "openrouter". Provider lain tetap
   * memakai model defaultnya masing-masing.
   */
  modelOverride?: string;
  signal?: AbortSignal;
};

/** Token usage hasil stream: dari provider, atau estimasi dari panjang teks. */
export type StreamUsage = {
  promptTokens: number;
  completionTokens: number;
  /** true kalau token diestimasi (chars/4) karena provider tidak melaporkannya */
  estimated: boolean;
};

export type ChatStreamResult = {
  provider: string;
  model: string;
  /** provider yang gagal sebelum yang berhasil, beserta alasannya */
  tried: { provider: string; error: string }[];
  /** Baca delta teks berikutnya. done=true saat stream selesai. */
  read: () => Promise<{ done: boolean; value?: string }>;
  /** Batalkan stream (mis. client disconnect). */
  cancel: () => void;
  /** Usage setelah stream selesai dikonsumsi. */
  getUsage: () => StreamUsage;
  /** finish_reason dari provider ("stop" | "length" | ...), null kalau tidak ada. */
  getFinishReason: () => string | null;
  /** Teks lengkap yang terakumulasi selama stream. */
  getFullText: () => string;
};

/** Jeda maksimum antar chunk SSE sebelum stream dianggap macet. */
const STREAM_IDLE_TIMEOUT_MS = 60_000;
/**
 * Provider yang mendukung stream_options.include_usage (jadi usage token
 * dilaporkan di chunk terakhir). Provider lain tidak dikirimi field ini —
 * server yang ketat bisa menolak field yang tidak dikenal.
 */
const INCLUDE_USAGE_PROVIDERS = new Set(["groq", "nvidia", "openrouter"]);

/**
 * Kirim chat ke provider gratis pertama yang berhasil.
 * Melempar Error kalau SEMUA provider gagal — pesannya berisi daftar
 * provider yang dicoba + alasannya, jadi gampang di-debug.
 */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  let providers = getProviders().filter(
    (p) => !p.needsKey || p.apiKey, // skip provider ber-key yang key-nya kosong
  );

  if (opts.onlyProviders?.length) {
    const allow = new Set(opts.onlyProviders);
    providers = providers.filter((p) => allow.has(p.id));
  }
  if (opts.preferProvider) {
    providers.sort((a, b) =>
      a.id === opts.preferProvider ? -1 : b.id === opts.preferProvider ? 1 : 0,
    );
  }
  if (providers.length === 0) {
    throw new Error(
      "no providers configured — setidaknya satu dari GROQ_API_KEY / GEMINI_API_KEY / NVIDIA_API_KEY / OPENROUTER_API_KEY, atau biarkan Kilo/LLM7 keyless aktif",
    );
  }

  const tried: ChatResult["tried"] = [];
  const now = Date.now();

  for (const p of providers) {
    const s = getStats(p.id);
    if (s.coolingDownUntil > now) {
      tried.push({ provider: p.id, error: "cooling down after recent 429/5xx" });
      continue;
    }

    s.requests += 1;
    s.lastUsedAt = new Date().toISOString();
    try {
      const { content, usage } = await callProvider(p, messages, opts);
      s.successes += 1;
      s.lastError = undefined;
      return { provider: p.id, model: resolveModel(p, opts), content, tried, usage };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      s.lastError = msg;
      tried.push({ provider: p.id, error: msg });
      // 429 / 5xx / timeout -> cooldown, jangan langsung dihantam lagi.
      if (/429|5\d\d|timeout/i.test(msg)) s.coolingDownUntil = Date.now() + COOLDOWN_MS;
    }
  }

  throw new Error(
    `all providers failed: ${tried.map((t) => `${t.provider} (${t.error})`).join(" | ")}`,
  );
}

// ---- streaming (SSE) ----

type StreamState = {
  reportedUsage?: ChatResult["usage"];
  finishReason: string | null;
  fullText: string;
  error?: string;
};

/** Estimasi kasar token dari panjang teks (±4 karakter per token). */
function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

type SseChunk = {
  choices?: {
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
    };
    finish_reason?: string | null;
  }[];
  usage?: ChatResult["usage"];
  error?: { message?: string } | string;
};

type StreamPump = {
  read: () => Promise<{ done: boolean; value?: string }>;
  cancel: () => void;
};

/**
 * Pompa SSE: membaca body response di background, mem-parsing baris
 * `data:` menjadi delta teks. read() menunggu delta berikutnya.
 * Error di tengah stream (termasuk idle timeout & client disconnect)
 * menutup pompa dengan rapi — teks yang sudah terkirim tidak hilang.
 */
function createSsePump(
  body: ReadableStream<Uint8Array>,
  controller: AbortController,
  state: StreamState,
  onFinish: () => void,
): StreamPump {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const queue: string[] = [];
  const waiters: ((r: { done: boolean; value?: string }) => void)[] = [];
  let finished = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (idleTimer) clearTimeout(idleTimer);
    onFinish();
    for (const w of waiters.splice(0)) w({ done: true });
  };
  const push = (text: string) => {
    const w = waiters.shift();
    if (w) w({ done: false, value: text });
    else queue.push(text);
  };
  const armIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT_MS);
  };

  void (async () => {
    let buffer = "";
    armIdle();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdle();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line.startsWith(":") || !line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            finish();
            return;
          }
          let parsed: SseChunk;
          try {
            parsed = JSON.parse(data) as SseChunk;
          } catch {
            continue;
          }
          if (parsed.error) {
            throw new Error(
              typeof parsed.error === "string"
                ? parsed.error
                : (parsed.error.message ?? "stream error"),
            );
          }
          if (parsed.usage) state.reportedUsage = parsed.usage;
          const choice = parsed.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) state.finishReason = choice.finish_reason;
          const delta = choice.delta ?? {};
          const text =
            delta.content ?? delta.reasoning_content ?? delta.reasoning ?? "";
          if (text) {
            state.fullText += text;
            push(text);
          }
        }
      }
    } catch (err) {
      // Abort (idle timeout / client disconnect) bukan error; error lain
      // dicatat supaya caller tahu stream berhenti prematur.
      if (!(err instanceof Error && err.name === "AbortError")) {
        state.error = err instanceof Error ? err.message : String(err);
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // abaikan
      }
      finish();
    }
  })();

  return {
    read() {
      const v = queue.shift();
      if (v !== undefined) return Promise.resolve({ done: false, value: v });
      if (finished) return Promise.resolve({ done: true });
      return new Promise((resolve) => waiters.push(resolve));
    },
    cancel() {
      controller.abort();
    },
  };
}

/** Pompa sekali-pakai untuk provider yang membalas JSON (mengabaikan stream:true). */
function singleChunkPump(content: string): StreamPump {
  let used = false;
  return {
    read() {
      if (used) return Promise.resolve({ done: true });
      used = true;
      return Promise.resolve({ done: false, value: content });
    },
    cancel() {
      used = true;
    },
  };
}

/**
 * Coba satu provider dalam mode stream. Menunggu delta PERTAMA sebelum
 * kembali — jadi kegagalan provider (termasuk error SSE langsung) masih
 * bisa fallback ke provider berikutnya. Melempar kalau provider gagal
 * sebelum ada satu pun delta.
 */
async function attemptStream(
  p: ProviderConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal; modelOverride?: string },
): Promise<{ pump: StreamPump; state: StreamState; model: string }> {
  const model = resolveModel(p, opts);
  const controller = new AbortController();
  const state: StreamState = { finishReason: null, fullText: "" };
  let timedOut = false;
  const ttftTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, p.timeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort, { once: true });
  const cleanup = () => {
    clearTimeout(ttftTimer);
    opts.signal?.removeEventListener("abort", onAbort);
  };

  let res: Response;
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
      stream: true,
    };
    if (INCLUDE_USAGE_PROVIDERS.has(p.id)) {
      body.stream_options = { include_usage: true };
    }
    res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: providerHeaders(p),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    cleanup();
    if (timedOut || (err instanceof Error && err.name === "AbortError")) {
      throw new Error(`timeout after ${p.timeoutMs}ms`);
    }
    throw err;
  }

  if (!res.ok) {
    cleanup();
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Provider mengabaikan stream:true dan membalas JSON biasa.
  if (!contentType.includes("text/event-stream")) {
    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string | null; reasoning?: string } }[];
      usage?: ChatResult["usage"];
      error?: { message?: string } | string;
    } | null;
    cleanup();
    if (!data) throw new Error("invalid JSON response from provider");
    if (data.error) {
      throw new Error(
        typeof data.error === "string" ? data.error : (data.error.message ?? "provider error"),
      );
    }
    const choice = data.choices?.[0]?.message;
    const content = choice?.content ?? choice?.reasoning ?? "";
    if (!content) throw new Error("empty response from provider");
    state.reportedUsage = data.usage;
    state.finishReason = "stop";
    state.fullText = content;
    return { pump: singleChunkPump(content), state, model };
  }

  const body = res.body;
  if (!body) {
    cleanup();
    throw new Error("empty response body from provider");
  }

  const pump = createSsePump(body, controller, state, cleanup);
  // Tunggu delta pertama dengan timer TTFT masih aktif.
  const first = await pump.read();
  if (first.done) {
    pump.cancel();
    cleanup();
    if (timedOut) throw new Error(`timeout after ${p.timeoutMs}ms (no token)`);
    if (state.error) throw new Error(state.error);
    throw new Error("empty response from provider");
  }
  // Stream mengalir: matikan timer TTFT (idle timer di dalam pompa yang
  // mengambil alih). Listener signal luar dibersihkan saat pompa selesai.
  clearTimeout(ttftTimer);

  // Bungkus pompa supaya delta pertama tidak hilang.
  let firstValue: string | undefined = first.value;
  const wrapped: StreamPump = {
    async read() {
      if (firstValue !== undefined) {
        const v = firstValue;
        firstValue = undefined;
        return { done: false, value: v };
      }
      return pump.read();
    },
    cancel() {
      pump.cancel();
    },
  };
  return { pump: wrapped, state, model };
}

/**
 * Kirim chat dalam mode stream ke provider gratis pertama yang berhasil.
 * Fallback chain sama seperti chat() — provider dicoba sampai ada yang
 * mengalirkan token. Melempar Error kalau SEMUA provider gagal sebelum
 * ada satu pun token.
 *
 * Konsumsi dengan `read()` berulang sampai done. Setelah selesai,
 * getUsage() mengembalikan token (dari provider, atau estimasi chars/4
 * kalau provider tidak melaporkannya).
 */
export async function chatStream(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatStreamResult> {
  let providers = getProviders().filter(
    (p) => !p.needsKey || p.apiKey, // skip provider ber-key yang key-nya kosong
  );

  if (opts.onlyProviders?.length) {
    const allow = new Set(opts.onlyProviders);
    providers = providers.filter((p) => allow.has(p.id));
  }
  if (opts.preferProvider) {
    providers.sort((a, b) =>
      a.id === opts.preferProvider ? -1 : b.id === opts.preferProvider ? 1 : 0,
    );
  }
  if (providers.length === 0) {
    throw new Error(
      "no providers configured — setidaknya satu dari GROQ_API_KEY / GEMINI_API_KEY / NVIDIA_API_KEY / OPENROUTER_API_KEY, atau biarkan Kilo/LLM7 keyless aktif",
    );
  }

  const promptEstimate = estimateTokens(messages.map((m) => m.content).join("\n"));
  const tried: ChatResult["tried"] = [];
  const now = Date.now();

  for (const p of providers) {
    if (opts.signal?.aborted) throw new Error("request aborted");
    const s = getStats(p.id);
    if (s.coolingDownUntil > now) {
      tried.push({ provider: p.id, error: "cooling down after recent 429/5xx" });
      continue;
    }

    s.requests += 1;
    s.lastUsedAt = new Date().toISOString();
    try {
      const { pump, state, model } = await attemptStream(p, messages, opts);
      s.successes += 1;
      s.lastError = undefined;
      return {
        provider: p.id,
        model,
        tried,
        read: () => pump.read(),
        cancel: () => pump.cancel(),
        getUsage: () => {
          const u = state.reportedUsage;
          if (
            u &&
            typeof u.prompt_tokens === "number" &&
            typeof u.completion_tokens === "number"
          ) {
            return {
              promptTokens: u.prompt_tokens,
              completionTokens: u.completion_tokens,
              estimated: false,
            };
          }
          return {
            promptTokens: promptEstimate,
            completionTokens: estimateTokens(state.fullText),
            estimated: true,
          };
        },
        getFinishReason: () => state.finishReason,
        getFullText: () => state.fullText,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      s.lastError = msg;
      tried.push({ provider: p.id, error: msg });
      // 429 / 5xx / timeout -> cooldown, jangan langsung dihantam lagi.
      if (/429|5\d\d|timeout/i.test(msg)) s.coolingDownUntil = Date.now() + COOLDOWN_MS;
    }
  }

  throw new Error(
    `all providers failed: ${tried.map((t) => `${t.provider} (${t.error})`).join(" | ")}`,
  );
}
