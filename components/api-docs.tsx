"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback untuk browser / konteks tanpa clipboard API.
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
      className="shrink-0 rounded border border-line-2 bg-panel-2 px-2 py-1 font-mono text-[11px] text-muted hover:text-text"
    >
      {copied ? "disalin ✓" : "salin"}
    </button>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="font-mono text-xs text-muted">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-text">{code}</pre>
    </div>
  );
}

const CURL_CHAT = `curl -X POST <domain>/api/ai/chat \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"halo, jawab singkat"}]}'`;

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
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-line bg-panel p-3">
        <h3 className="font-mono text-sm font-semibold text-text">Cara kerja</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          <li>
            Satu endpoint <code className="font-mono text-xs text-text">POST /api/ai/chat</code> menembak
            9 provider gratis (Groq, NVIDIA, Gemini, OpenRouter, Mistral, Kilo, LLM7, Pollinations,
            OVH) secara berurutan sampai ada yang berhasil.
          </li>
          <li>
            Provider yang kena 429 / 5xx / timeout masuk cooldown 60 detik, lalu dicoba lagi di
            request berikutnya.
          </li>
          <li>
            Semua API key hanya dibaca server-side dari env. Tidak ada key yang dikirim ke browser.
          </li>
          <li>
            Rate limit default: 20 request/menit per IP (diatur lewat{" "}
            <code className="font-mono text-xs text-text">AI_ROUTER_IP_RPM</code>). Melebihi itu
            dibalas 429.
          </li>
          <li>
            Kalau semua provider gagal, responsnya 502 beserta alasan tiap provider — jadi gampang
            di-debug.
          </li>
        </ul>
      </div>

      <CodeBlock title="POST /api/ai/chat — curl (ganti <domain> dengan domain deploy lu)" code={CURL_CHAT} />
      <CodeBlock title="POST /api/ai/chat — request body" code={REQUEST_JSON} />
      <CodeBlock title="POST /api/ai/chat — response sukses (200)" code={RESPONSE_JSON} />
      <CodeBlock title="GET /api/ai/chat — status provider (tanpa key, aman dibuka)" code={CURL_STATUS} />

      <div className="rounded-md border border-line bg-panel p-3">
        <h3 className="font-mono text-sm font-semibold text-text">Catatan</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
          <li>
            Free tier berubah-ubah: model <code className="font-mono text-xs text-text">:free</code>{" "}
            OpenRouter bisa hilang / jadi berbayar sewaktu-waktu. Cek{" "}
            <code className="font-mono text-xs text-text">https://openrouter.ai/api/v1/models</code>{" "}
            kalau ada model yang 404.
          </li>
          <li>
            Jangan kirim data sensitif lewat router ini — prompt di free tier bisa dipakai provider
            untuk improve produk / di-log.
          </li>
          <li>
            Statistik di tab Providers bersifat per proses server dan reset saat restart. Untuk
            histori permanen, simpan log ke database.
          </li>
        </ul>
      </div>
    </div>
  );
}
