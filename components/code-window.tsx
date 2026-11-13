/**
 * CodeWindow — jendela kode dengan tab cURL / Python / TypeScript + salin.
 * Contoh OpenAI-compatible ke /api/v1/chat/completions (model hymn/auto).
 */

"use client";

import { useState } from "react";

type TabId = "curl" | "python" | "typescript";

const TABS: { id: TabId; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "typescript", label: "TypeScript" },
];

function snippets(baseUrl: string): Record<TabId, string> {
  return {
    curl: `curl ${baseUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_KEY_LU" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "hymn/auto",
    "messages": [{ "role": "user", "content": "Halo!" }]
  }'`,
    python: `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["HYMN_ROUTER_API_KEY"],
    base_url="${baseUrl}/api/v1",
)

res = client.chat.completions.create(
    model="hymn/auto",
    messages=[{"role": "user", "content": "Halo!"}],
)

print(res.choices[0].message.content)`,
    typescript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.HYMN_ROUTER_API_KEY,
  baseURL: "${baseUrl}/api/v1",
});

const res = await client.chat.completions.create({
  model: "hymn/auto",
  messages: [{ role: "user", content: "Halo!" }],
});

console.log(res.choices[0].message.content);`,
  };
}

export default function CodeWindow({ baseUrl }: { baseUrl: string }) {
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
    <div className="overflow-hidden rounded-2xl border border-line-dark bg-dark-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line-dark px-4 py-2.5">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 font-mono text-[12px] transition-colors ${
                tab === t.id
                  ? "bg-white text-dark"
                  : "text-ondark-muted hover:text-ondark"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void copy()}
          className="rounded-full border border-line-dark px-3 py-1.5 font-mono text-[12px] text-ondark-muted transition-colors hover:text-ondark"
        >
          {copied ? "disalin ✓" : "salin"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ondark">
        {code}
      </pre>
    </div>
  );
}
