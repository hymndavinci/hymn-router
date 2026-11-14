/**
 * CodeWindow — jendela kode dengan tab cURL / Python / TypeScript + salin.
 * Contoh OpenAI-compatible ke /api/v1/chat/completions (model hymn/auto).
 * Hitam dengan border putih + hard shadow kuning (di atas section gelap).
 */

"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";

type TabId = "curl" | "python" | "typescript";

const TABS: { id: TabId; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "typescript", label: "TypeScript" },
];

/**
 * Potongan kode memakai variabel BASE supaya baris terpanjang ≤ 47 karakter
 * — muat di layar 390px dengan font 11px tanpa scroll horizontal.
 */
function snippets(baseUrl: string): Record<TabId, string> {
  return {
    curl: `BASE="${baseUrl}"
curl $BASE/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "hymn/auto",
    "messages": [
      {"role": "user", "content": "Halo!"}
    ]
  }'`,
    python: `import os
from openai import OpenAI

BASE = "${baseUrl}/api/v1"

client = OpenAI(
    api_key=os.environ["HYMN_ROUTER_API_KEY"],
    base_url=BASE,
)

res = client.chat.completions.create(
    model="hymn/auto",
    messages=[
        {"role": "user", "content": "Halo!"},
    ],
)

print(res.choices[0].message.content)`,
    typescript: `import OpenAI from "openai";

const BASE = "${baseUrl}/api/v1";

const ai = new OpenAI({
  apiKey: process.env.HYMN_ROUTER_API_KEY,
  baseURL: BASE,
});

const completions = ai.chat.completions;

const res = await completions.create({
  model: "hymn/auto",
  messages: [
    { role: "user", content: "Halo!" },
  ],
});

console.log(res.choices[0].message.content);`,
  };
}

export default function CodeWindow({ baseUrl }: { baseUrl: string }) {
  const { dict } = useLocale();
  const [tab, setTab] = useState<TabId>("curl");
  const [copied, setCopied] = useState(false);
  const code = snippets(baseUrl)[tab];

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="shadow-yellow min-w-0 overflow-hidden border-2 border-white bg-dark-panel shadow-brutal">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white/25 px-3 py-2.5 sm:px-4">
        <div className="flex gap-1" role="tablist" aria-label="Code sample language">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex h-11 items-center border-2 px-2.5 font-mono text-[11px] font-bold transition-colors sm:px-3 sm:text-[12px] ${
                tab === t.id
                  ? "border-yellow bg-yellow text-black"
                  : "border-transparent text-ondark-muted hover:text-ondark"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void copy()}
          className="flex h-11 shrink-0 items-center border-2 border-white/40 px-2.5 font-mono text-[11px] font-bold text-ondark-muted transition-colors hover:border-white hover:text-ondark sm:px-3 sm:text-[12px]"
        >
          {copied ? dict.common.copied : dict.common.copy}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-relaxed text-ondark sm:p-4 sm:text-[13px]">
        {code}
      </pre>
    </div>
  );
}
