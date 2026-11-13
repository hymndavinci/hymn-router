/**
 * DashboardClient — dashboard interaktif: ringkasan usage, daftar API key,
 * buat key baru (key utuh tampil SEKALI), revoke, dan quickstart snippet.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import type { ApiKeyInfo, CreatedApiKey } from "@/lib/api-keys";
import type { UsageSummary } from "@/lib/usage";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "belum pernah";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardClient({
  user,
  initialKeys,
  initialUsage,
  baseUrl,
}: {
  user: SessionUser;
  initialKeys: ApiKeyInfo[];
  initialUsage: UsageSummary;
  baseUrl: string;
}) {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyInfo[]>(initialKeys);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function refreshKeys() {
    try {
      const res = await fetch("/api/dashboard/keys");
      const data = (await res.json()) as { keys?: ApiKeyInfo[] };
      if (res.ok && data.keys) setKeys(data.keys);
    } catch {
      // Abaikan — daftar lama tetap tampil.
    }
  }

  async function createKey() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    setNewKey(null);
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as { key?: CreatedApiKey; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.key) {
        setNewKey(data.key);
        setName("");
        await refreshKeys();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (revoking) return;
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/keys/${id}/revoke`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(null);
    }
  }

  async function copy(text: string) {
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

  const usage = initialUsage;
  const activeKeys = keys.filter((k) => !k.revokedAt).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
      {/* Header user */}
      <div className="flex flex-wrap items-center gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-dark text-[18px] font-semibold text-white">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-text">
            Halo, {user.name ?? "di sana"}
          </h1>
          <p className="font-mono text-[13px] text-muted">{user.email}</p>
        </div>
      </div>

      {/* Ringkasan usage */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { v: String(usage.totalRequests), l: `request · ${usage.days} hari terakhir` },
          { v: usage.totalTokens.toLocaleString("id-ID"), l: "token total" },
          {
            v: usage.totalPromptTokens.toLocaleString("id-ID"),
            l: "token prompt",
          },
          {
            v: usage.totalCompletionTokens.toLocaleString("id-ID"),
            l: "token completion",
          },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-panel-2 p-5">
            <p className="text-[28px] font-bold leading-none tracking-tight text-text">
              {s.v}
            </p>
            <p className="mt-2 font-mono text-[11px] text-faint">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Per provider */}
      <div className="mt-4 rounded-2xl border border-line bg-panel-2 p-5">
        <h2 className="text-[16px] font-semibold text-text">Per provider</h2>
        {usage.byProvider.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">
            Belum ada request tercatat dalam {usage.days} hari terakhir. Buat
            API key di bawah dan kirim request pertama lu.
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {usage.byProvider.map((p) => (
              <div key={p.provider} className="flex items-center gap-3">
                <span className="w-24 font-mono text-[13px] text-muted">{p.provider}</span>
                <div className="h-2 flex-1 rounded-full bg-panel">
                  <div
                    className="h-2 rounded-full bg-dark"
                    style={{
                      width: `${Math.max(4, Math.round((p.requests / usage.totalRequests) * 100))}%`,
                    }}
                  />
                </div>
                <span className="w-40 text-right font-mono text-[12px] text-muted">
                  {p.requests} req · {p.tokens.toLocaleString("id-ID")} token
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API keys */}
      <div className="mt-8 rounded-2xl border border-line bg-panel-2 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-text">
            API key <span className="font-mono text-[13px] font-normal text-faint">· {activeKeys} aktif</span>
          </h2>
          <p className="font-mono text-[12px] text-faint">
            limit 60 req/menit per key
          </p>
        </div>

        {/* Form buat key */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createKey();
            }}
            placeholder="Nama key, mis. bot-discord"
            maxLength={64}
            className="h-11 flex-1 rounded-full border border-line-2 bg-bg px-4 text-[14px] text-text outline-none placeholder:text-faint focus:border-text"
          />
          <button
            onClick={() => void createKey()}
            disabled={!name.trim() || creating}
            className="h-11 rounded-full bg-dark px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Membuat…" : "Buat key baru"}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-bad/40 bg-panel px-4 py-3 text-[14px] text-bad">
            {error}
          </p>
        )}

        {/* Key baru — tampil sekali */}
        {newKey && (
          <div className="mt-4 rounded-xl border border-warn/50 bg-beige/60 p-4">
            <p className="text-[14px] font-semibold text-text">
              Salin key ini sekarang — tidak bisa dilihat lagi sesudahnya.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 break-all rounded-lg border border-line-2 bg-panel-2 px-3 py-2.5 font-mono text-[13px] text-text">
                {newKey.key}
              </code>
              <button
                onClick={() => void copy(newKey.key)}
                className="h-10 shrink-0 rounded-full bg-dark px-5 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
              >
                {copied ? "disalin ✓" : "Salin key"}
              </button>
            </div>
          </div>
        )}

        {/* Daftar key */}
        <div className="mt-5 overflow-x-auto">
          {keys.length === 0 ? (
            <p className="py-4 text-[14px] text-muted">
              Belum ada API key. Buat satu di atas untuk mulai memakai gateway.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
                  <th className="py-2.5 pr-4 font-medium">Key</th>
                  <th className="py-2.5 pr-4 font-medium">Nama</th>
                  <th className="py-2.5 pr-4 font-medium">Dibuat</th>
                  <th className="py-2.5 pr-4 font-medium">Terakhir dipakai</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 font-mono text-[13px] text-text">
                      {k.prefix}…
                    </td>
                    <td className="py-3 pr-4 text-muted">{k.name}</td>
                    <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                      {fmtDate(k.createdAt)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                      {fmtDateTime(k.lastUsedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {k.revokedAt ? (
                        <span className="rounded-full border border-line-2 px-2.5 py-1 font-mono text-[11px] text-faint">
                          revoked
                        </span>
                      ) : (
                        <span className="rounded-full border border-ok/40 px-2.5 py-1 font-mono text-[11px] text-ok">
                          aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {!k.revokedAt && (
                        <button
                          onClick={() => void revokeKey(k.id)}
                          disabled={revoking === k.id}
                          className="rounded-full border border-bad/40 px-3.5 py-1.5 font-mono text-[12px] text-bad transition-colors hover:bg-bad hover:text-white disabled:opacity-50"
                        >
                          {revoking === k.id ? "…" : "Revoke"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quickstart */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-dark text-ondark">
        <div className="border-b border-line-dark px-5 py-3.5">
          <span className="font-mono text-[12px] text-ondark-muted">
            quickstart — cURL
          </span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-ondark">
{`curl ${baseUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer hr_KEY_LU" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "hymn/auto",
       "messages": [{"role": "user", "content": "Halo!"}]}'`}
        </pre>
      </div>
      <p className="mt-3 font-mono text-[12px] leading-relaxed text-faint">
        Ganti hr_KEY_LU dengan API key dari tabel di atas. Model juga bisa
        berupa id provider (mis. &quot;groq&quot;) atau id model dari GET{" "}
        {baseUrl}/api/v1/models. Streaming belum didukung.
      </p>
    </div>
  );
}
