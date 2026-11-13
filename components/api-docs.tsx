/**
 * ApiDocs — dokumentasi lengkap: gateway /api/v1 (OpenAI-compatible)
 * + endpoint sederhana /api/ai/chat. Code window gelap gaya Dahono.
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
      className="shrink-0 rounded-full border border-line-dark px-3 py-1.5 font-mono text-[12px] text-ondark-muted transition-colors hover:text-ondark"
    >
      {copied ? "disalin ✓" : "salin"}
    </button>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line-dark bg-dark">
      <div className="flex items-center justify-between gap-2 border-b border-line-dark px-4 py-2.5">
        <span className="font-mono text-[12px] text-ondark-muted">{title}</span>
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
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-text">
        {title}
      </h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function InfoCard({ title, items }: { title: string; items: React.ReactNode[] }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2 p-5">
      <h3 className="text-[16px] font-semibold text-text">{title}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted">
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
#      { "id": "hymn/auto", "object": "model", "owned_by": "hymn-router" },
#      { "id": "openai/gpt-oss-120b", "object": "model", "owned_by": "groq" },
#      ... ] }`;

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
        Ganti <code className="text-muted">&lt;domain&gt;</code> dengan domain
        deploy lu, mis. https://hymn-router.vercel.app
      </p>

      <Section eyebrow="Gateway" title="API v1 — OpenAI-compatible">
        <InfoCard
          title="Cara kerja"
          items={[
            <>
              Satu gateway{" "}
              <code className="font-mono text-[13px] text-text">
                POST /api/v1/chat/completions
              </code>{" "}
              dengan format request/response OpenAI. SDK OpenAI, cURL, dan
              fetch biasa langsung jalan — ganti base URL saja.
            </>,
            <>
              Wajib header{" "}
              <code className="font-mono text-[13px] text-text">
                Authorization: Bearer hr_...
              </code>{" "}
              dengan API key dari dashboard. Tanpa key / key tidak valid → 401.
            </>,
            <>
              <code className="font-mono text-[13px] text-text">model</code>{" "}
              bisa <code className="font-mono text-[13px] text-text">hymn/auto</code>{" "}
              (default, fallback chain penuh), id provider (mis.{" "}
              <code className="font-mono text-[13px] text-text">groq</code>),
              atau id model (mis.{" "}
              <code className="font-mono text-[13px] text-text">
                openai/gpt-oss-120b
              </code>
              ). Model tidak dikenal → 404.
            </>,
            <>
              <code className="font-mono text-[13px] text-text">stream: true</code>{" "}
              belum didukung → 400. Respons selalu dikirim sekaligus.
            </>,
            <>
              Rate limit: 60 request/menit per API key (melebihi itu → 429).
              Pemakaian tercatat di dashboard: request, token, provider.
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

      <Section eyebrow="Sederhana" title="API /api/ai/chat">
        <InfoCard
          title="Cara kerja"
          items={[
            <>
              Endpoint sederhana{" "}
              <code className="font-mono text-[13px] text-text">
                POST /api/ai/chat
              </code>{" "}
              menembak 9 provider gratis (Groq, NVIDIA, Gemini, OpenRouter,
              Mistral, Kilo, LLM7, Pollinations, OVH) secara berurutan sampai
              ada yang berhasil.
            </>,
            <>
              Anonim: rate limit 20 request/menit per IP. Dengan header{" "}
              <code className="font-mono text-[13px] text-text">
                Authorization: Bearer hr_...
              </code>
              : limit 60/menit per key + pemakaian tercatat di dashboard.
              Bearer tidak valid → 401 (tidak fallback anonim).
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
              <code className="font-mono text-[13px] text-text">:free</code>{" "}
              OpenRouter bisa hilang / jadi berbayar sewaktu-waktu. Cek{" "}
              <code className="font-mono text-[13px] text-text">
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
