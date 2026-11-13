/**
 * ApiDocs — dokumentasi lengkap: gateway /api/v1 (OpenAI-compatible)
 * + endpoint sederhana /api/ai/chat. Code window hitam neo-brutalism.
 */

"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={() => void copy()}
      className="shrink-0 border-2 border-white/40 px-3 py-1.5 font-mono text-[12px] font-bold text-ondark-muted transition-colors hover:border-white hover:text-ondark"
    >
      {copied ? "disalin ✓" : "salin"}
    </button>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="shadow-yellow min-w-0 overflow-hidden border-2 border-black bg-dark shadow-brutal">
      <div className="flex items-center justify-between gap-2 border-b-2 border-white/25 px-4 py-2.5">
        <span className="min-w-0 font-mono text-[12px] font-bold text-ondark-muted">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ondark">
        {code}
      </pre>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[24px] font-black leading-tight tracking-tight text-black">
        {title}
      </h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function InfoCard({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div className="border-2 border-black bg-white p-5 shadow-brutal-sm">
      <h3 className="text-[16px] font-black text-black">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 break-words pl-5 text-[15px] leading-relaxed text-muted">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

const V1_CURL = `curl <domain>/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_KEY_LU" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "hymn/auto",
    "messages": [{ "role": "user", "content": "Halo!" }],
    "temperature": 0.7,
    "max_tokens": 1024
  }'`;

const V1_PYTHON = `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["HYMN_ROUTER_API_KEY"],
    base_url="<domain>/api/v1",
)

res = client.chat.completions.create(
    model="hymn/auto",  # atau "groq", atau id model
    messages=[{"role": "user", "content": "Halo!"}],
)

print(res.choices[0].message.content)`;

const V1_RESPONSE = `{
  "id": "chatcmpl-9f2ab41c...",
  "object": "chat.completion",
  "created": 1794569000,
  "model": "openai/gpt-oss-120b",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "Halo!" },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 12, "completion_tokens": 8, "total_tokens": 20 }
}`;

const V1_MODELS = `curl <domain>/api/v1/models

# -> { "object": "list", "data": [
#      { "id": "hymn/auto", "object": "model", "owned_by": "hymn-router",
#        "provider": "hymn-router", "configured": true, "needs_key": false,
#        "free_tier": "Fallback chain 9 provider..." },
#      { "id": "openai/gpt-oss-120b", "object": "model", "owned_by": "groq",
#        "provider": "groq", "configured": true, "needs_key": true,
#        "free_tier": "Free: 30 RPM, 1000 req/hari..." },
#      ... ] }
# Field tambahan (provider, configured, needs_key, free_tier) aman
# diabaikan client OpenAI. Versi visualnya ada di halaman /models.`;

const V1_STREAM_CURL = `curl -N <domain>/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_KEY_LU" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "hymn/auto",
    "messages": [{ "role": "user", "content": "Cerita singkat tentang kucing." }],
    "stream": true
  }'

# -> data: {"id":"chatcmpl-...","object":"chat.completion.chunk",
#      "model":"...","choices":[{"index":0,
#      "delta":{"role":"assistant","content":""},"finish_reason":null}]}
# -> data: {"id":"...","object":"chat.completion.chunk",
#      "choices":[{"index":0,"delta":{"content":"Dulu"},"finish_reason":null}]}
# -> ... (satu chunk per delta teks)
# -> data: {"id":"...","object":"chat.completion.chunk",
#      "choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}
# -> data: [DONE]`;

const V1_STREAM_PYTHON = `from openai import OpenAI

client = OpenAI(api_key="hr_KEY_LU", base_url="<domain>/api/v1")

stream = client.chat.completions.create(
    model="hymn/auto",
    messages=[{"role": "user", "content": "Cerita singkat tentang kucing."}],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;

const CURL_CHAT = `curl -X POST <domain>/api/ai/chat \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"halo, jawab singkat"}]}'

# Dengan API key (limit 60/menit/key, tercatat di dashboard):
#   -H "Authorization: Bearer hr_KEY_LU"`;

const REQUEST_JSON = `{
  "messages": [
    { "role": "system", "content": "Jawab singkat." },
    { "role": "user", "content": "Apa itu LLM?" }
  ],
  "temperature": 0.7,        // opsional, 0–2, default 0.7
  "maxTokens": 1024,         // opsional, 1–8192, default 1024
  "preferProvider": "groq"   // opsional, tetap fallback kalau gagal
}`;

const RESPONSE_JSON = `{
  "provider": "groq",
  "model": "openai/gpt-oss-120b",
  "content": "LLM adalah ...",
  "tried": [],               // provider yang gagal sebelum yang berhasil
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 42,
    "total_tokens": 60
  }
}`;

const CURL_STATUS = `curl <domain>/api/ai/chat`;

export default function ApiDocs() {
  return (
    <div className="flex flex-col gap-12">
      <p className="-mb-4 font-mono text-[13px] text-faint">
        Ganti <code className="font-bold text-muted">&lt;domain&gt;</code> dengan domain
        deploy lu, mis. https://hymn-router.vercel.app
      </p>

      <Section eyebrow="Gateway" title="API v1 — OpenAI-compatible">
        <InfoCard
          title="Cara kerja"
          items={[
            <>
              Satu gateway{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                POST /api/v1/chat/completions
              </code>{" "}
              dengan format request/response OpenAI. SDK OpenAI, cURL, dan
              fetch biasa langsung jalan — ganti base URL saja.
            </>,
            <>
              Wajib header{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                Authorization: Bearer hr_...
              </code>{" "}
              dengan API key dari dashboard. Tanpa key / key tidak valid → 401.
            </>,
            <>
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">model</code>{" "}
              bisa <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">hymn/auto</code>{" "}
              (default, fallback chain penuh), id provider (mis.{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">groq</code>),
              id model (mis.{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                openai/gpt-oss-120b
              </code>
              ), atau model OpenRouter berakhiran{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">:free</code>{" "}
              (mis.{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                google/gemma-4-26b-a4b-it:free
              </code>
              ). Model tidak dikenal → 404. Daftar lengkap (live, bisa berubah)
              ada di halaman /models.
            </>,
            <>
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">stream: true</code>{" "}
              mengembalikan SSE OpenAI-compatible (chunk{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">choices[0].delta</code>,
              diakhiri <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">[DONE]</code>).
              Lihat section Streaming di bawah.
            </>,
            <>
              Rate limit: 60 request/menit per API key (melebihi itu → 429).
              Kuota harian Free plan: 100 request/hari per user, reset 00:00
              WIB (habis → 429 <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">quota_exceeded</code>).
              Sisa kuota terlihat di dashboard dan header{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">X-Quota-Remaining</code>.
            </>,
            <>
              Pemakaian tercatat di dashboard: request, token, provider, model,
              grafik harian, dan request terakhir.
            </>,
            <>
              Kalau semua provider gagal → 502 beserta alasan tiap provider.
            </>,
          ]}
        />
        <CodeBlock title="POST /api/v1/chat/completions — cURL" code={V1_CURL} />
        <CodeBlock title="POST /api/v1/chat/completions — Python (OpenAI SDK)" code={V1_PYTHON} />
        <CodeBlock title="POST /api/v1/chat/completions — response sukses (200)" code={V1_RESPONSE} />
        <CodeBlock title="GET /api/v1/models — daftar model (tanpa auth)" code={V1_MODELS} />
      </Section>

      <Section eyebrow="Real-time" title="Streaming (SSE)">
        <InfoCard
          title="Cara kerja"
          items={[
            <>
              Kirim{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">stream: true</code>{" "}
              di body /v1 (atau /api/ai/chat) untuk menerima token demi token
              lewat Server-Sent Events. Format chunk sama seperti OpenAI:
              delta teks di{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">choices[0].delta.content</code>,
              chunk terakhir berisi{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">finish_reason</code>,
              lalu baris{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">data: [DONE]</code>.
            </>,
            <>
              Router menunggu token pertama dari provider sebelum merespons —
              jadi kalau provider pertama gagal, fallback ke provider
              berikutnya tetap jalan sebelum stream dimulai.
            </>,
            <>
              Kalau provider tidak mendukung stream, router memakai respons
              non-stream lalu mengirimnya sebagai satu chunk delta. Client
              tidak perlu menangani dua format.
            </>,
            <>
              Usage token di dashboard: kalau provider melaporkan usage di
              stream, angka itu yang dipakai; kalau tidak, token diestimasi
              dari panjang teks (±4 karakter per token). Estimasi ini hanya
              untuk dashboard, tidak dikirim ke client.
            </>,
            <>
              Endpoint /api/ai/chat mengirim satu event tambahan di awal
              stream:{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">event: meta</code>{" "}
              berisi provider, model, dan provider yang sempat gagal. Endpoint
              /v1 tidak mengirim meta (strict OpenAI-compatible).
            </>,
          ]}
        />
        <CodeBlock title="Streaming — cURL (pakai -N supaya tidak di-buffer)" code={V1_STREAM_CURL} />
        <CodeBlock title="Streaming — Python (OpenAI SDK, stream=True)" code={V1_STREAM_PYTHON} />
      </Section>

      <Section eyebrow="Referensi" title="Kode error">
        <div className="border-2 border-black bg-white shadow-brutal-sm">
          {[
            { code: "400", name: "invalid_request_error", desc: "Body tidak valid: messages kosong / >50 pesan, role tidak dikenal, konten >20000 karakter, temperature di luar 0–2, max_tokens di luar 1–8192, atau stream bukan boolean." },
            { code: "401", name: "invalid_api_key", desc: "Header Authorization kosong, key tidak valid, atau key sudah di-revoke. Buat key baru di dashboard." },
            { code: "404", name: "model_not_found", desc: "Model tidak dikenal. Pakai \"hymn/auto\", id provider, id model dari GET /api/v1/models, atau model OpenRouter berakhiran \":free\"." },
            { code: "429", name: "rate_limit_exceeded", desc: "Melebihi 60 request/menit per API key (atau 20/menit per IP untuk /api/ai/chat anonim)." },
            { code: "429", name: "quota_exceeded", desc: "Kuota harian gratis (100 request/hari) habis. Respons menyertakan retry_after (detik) dan header Retry-After; reset 00:00 WIB." },
            { code: "502", name: "all_providers_failed", desc: "Semua provider gagal (429 / 5xx / timeout). Pesan error berisi alasan tiap provider." },
            { code: "503", name: "model_unavailable", desc: "Model :free diminta tapi server belum mengonfigurasi OPENROUTER_API_KEY." },
            { code: "503", name: "server_not_configured", desc: "DATABASE_URL belum diisi di server — API key belum bisa divalidasi." },
          ].map((e) => (
            <div
              key={`${e.code}-${e.name}`}
              className="flex flex-col gap-1 border-b-2 border-black p-4 last:border-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="flex shrink-0 items-center gap-2">
                <span className="border-2 border-black bg-yellow px-2 py-0.5 font-mono text-[13px] font-bold text-black">
                  {e.code}
                </span>
                <span className="font-mono text-[13px] font-bold text-black">{e.name}</span>
              </span>
              <span className="text-[14px] leading-relaxed text-muted">{e.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Sederhana" title="API /api/ai/chat">
        <InfoCard
          title="Cara kerja"
          items={[
            <>
              Endpoint sederhana{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                POST /api/ai/chat
              </code>{" "}
              menembak 9 provider gratis (Groq, NVIDIA, Gemini, OpenRouter,
              Mistral, Kilo, LLM7, Pollinations, OVH) secara berurutan sampai
              ada yang berhasil.
            </>,
            <>
              Anonim: rate limit 20 request/menit per IP, tidak kena kuota
              harian. Dengan header{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                Authorization: Bearer hr_...
              </code>
              : limit 60/menit per key + pemakaian tercatat di dashboard dan
              ikut menghabiskan kuota harian 100 request/hari.
              Bearer tidak valid → 401 (tidak fallback anonim).
            </>,
            <>
              Tambah{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">stream: true</code>{" "}
              di body untuk SSE (format sama seperti /v1, plus satu{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">event: meta</code>{" "}
              di awal berisi provider/model). Playground /chat memakai mode ini.
            </>,
            <>
              Provider yang kena 429 / 5xx / timeout masuk cooldown 60 detik,
              lalu dicoba lagi di request berikutnya.
            </>,
            <>
              Semua API key provider hanya dibaca server-side dari env. Tidak
              ada key yang dikirim ke browser.
            </>,
            <>
              Kalau semua provider gagal, responsnya 502 beserta alasan tiap
              provider — jadi gampang di-debug.
            </>,
          ]}
        />
        <CodeBlock title="POST /api/ai/chat — curl" code={CURL_CHAT} />
        <CodeBlock title="POST /api/ai/chat — request body" code={REQUEST_JSON} />
        <CodeBlock title="POST /api/ai/chat — response sukses (200)" code={RESPONSE_JSON} />
        <CodeBlock
          title="GET /api/ai/chat — status provider (tanpa key, aman dibuka)"
          code={CURL_STATUS}
        />
      </Section>

      <Section eyebrow="Catatan" title="Limit & privasi">
        <InfoCard
          title="Yang perlu diingat"
          items={[
            <>
              Free tier berubah-ubah: model{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">:free</code>{" "}
              OpenRouter bisa hilang / jadi berbayar sewaktu-waktu. Cek{" "}
              <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">
                https://openrouter.ai/api/v1/models
              </code>{" "}
              kalau ada model yang 404.
            </>,
            <>
              Jangan kirim data sensitif lewat router ini — prompt di free tier
              bisa dipakai provider untuk improve produk / di-log. Server ini
              sendiri tidak menyimpan prompt atau response; yang dicatat hanya
              jumlah request, token, provider, dan latensi.
            </>,
            <>
              Statistik di section Provider bersifat per proses server dan
              reset saat restart. Histori pemakaian per user (dashboard)
              tersimpan permanen di database.
            </>,
          ]}
        />
      </Section>
    </div>
  );
}
