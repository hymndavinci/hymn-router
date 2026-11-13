/**
 * ApiDocs — dokumentasi lengkap: gateway /api/v1 (OpenAI-compatible)
 * + endpoint sederhana /api/ai/chat. Code window hitam neo-brutalism.
 *
 * Teks penjelasan diterjemahkan dari kamus (segmen Rich: teks biasa +
 * inline <code>). Contoh kode / curl TIDAK diterjemahkan.
 */

"use client";

import { Fragment, useState } from "react";
import type { Rich } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";
import Reveal from "@/components/reveal";

function CopyButton({ text }: { text: string }) {
  const { dict } = useLocale();
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
      {copied ? dict.common.copied : dict.common.copy}
    </button>
  );
}

/** Render satu item kamus Rich: segmen {t} teks biasa, {c} inline code. */
function renderRich(rich: Rich, key: number): React.ReactNode {
  return (
    <Fragment key={key}>
      {rich.map((seg, i) =>
        "c" in seg ? (
          <code
            key={i}
            className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black"
          >
            {seg.c}
          </code>
        ) : (
          <Fragment key={i}>{seg.t}</Fragment>
        ),
      )}
    </Fragment>
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
    <Reveal as="section">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[24px] font-black leading-tight tracking-tight text-black">
        {title}
      </h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </Reveal>
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
  -H "Authorization: Bearer hr_KEY_ANDA" \\
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
  -H "Authorization: Bearer hr_KEY_ANDA" \\
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

client = OpenAI(api_key="hr_KEY_ANDA", base_url="<domain>/api/v1")

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

# Dengan API key (limit 60/menit/key, tercatat di dasbor):
#   -H "Authorization: Bearer hr_KEY_ANDA"`;

const REQUEST_JSON = `{
  "messages": [
    { "role": "system", "content": "Jawab singkat." },
    { "role": "user", "content": "Apa itu LLM?" }
  ],
  "temperature": 0.7,        // opsional, 0–2, default 0.7
  "maxTokens": 1024,         // opsional, 1–8192, default 1024
  "preferProvider": "groq"   // opsional, tetap fallback jika gagal
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
  const { dict } = useLocale();
  const t = dict.docs;

  return (
    <div className="flex flex-col gap-12">
      <p className="-mb-4 font-mono text-[13px] text-faint">
        {t.domainNoteA}{" "}
        <code className="font-bold text-muted">&lt;domain&gt;</code>{" "}
        {t.domainNoteB}
      </p>

      <Section eyebrow={t.loginEyebrow} title={t.loginTitle}>
        <InfoCard
          title={t.loginCardTitle}
          items={t.loginItems.map((it, i) => renderRich(it, i))}
        />
      </Section>

      <Section eyebrow={t.v1Eyebrow} title={t.v1Title}>
        <InfoCard
          title={t.v1CardTitle}
          items={t.v1Items.map((it, i) => renderRich(it, i))}
        />
        <CodeBlock title={t.v1CodeTitles[0]} code={V1_CURL} />
        <CodeBlock title={t.v1CodeTitles[1]} code={V1_PYTHON} />
        <CodeBlock title={t.v1CodeTitles[2]} code={V1_RESPONSE} />
        <CodeBlock title={t.v1CodeTitles[3]} code={V1_MODELS} />
      </Section>

      <Section eyebrow={t.streamEyebrow} title={t.streamTitle}>
        <InfoCard
          title={t.streamCardTitle}
          items={t.streamItems.map((it, i) => renderRich(it, i))}
        />
        <CodeBlock title={t.streamCodeTitles[0]} code={V1_STREAM_CURL} />
        <CodeBlock title={t.streamCodeTitles[1]} code={V1_STREAM_PYTHON} />
      </Section>

      <Section eyebrow={t.errorsEyebrow} title={t.errorsTitle}>
        <div className="border-2 border-black bg-white shadow-brutal-sm">
          {t.errors.map((e) => (
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

      <Section eyebrow={t.chatEyebrow} title={t.chatTitle}>
        <InfoCard
          title={t.chatCardTitle}
          items={t.chatItems.map((it, i) => renderRich(it, i))}
        />
        <CodeBlock title={t.chatCodeTitles[0]} code={CURL_CHAT} />
        <CodeBlock title={t.chatCodeTitles[1]} code={REQUEST_JSON} />
        <CodeBlock title={t.chatCodeTitles[2]} code={RESPONSE_JSON} />
        <CodeBlock title={t.chatCodeTitles[3]} code={CURL_STATUS} />
      </Section>

      <Section eyebrow={t.limitsEyebrow} title={t.limitsTitle}>
        <InfoCard
          title={t.limitsCardTitle}
          items={t.limitsItems.map((it, i) => renderRich(it, i))}
        />
      </Section>
    </div>
  );
}
