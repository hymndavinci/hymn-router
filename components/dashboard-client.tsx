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
            className="h-12 w-12 rounded-full border-2 border-black object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center border-2 border-black bg-yellow text-[18px] font-black text-black">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-tight tracking-tight text-black">
            Halo, {user.name ?? "di sana"}
          </h1>
          <p className="break-all font-mono text-[13px] text-muted">{user.email}</p>
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
          <div key={s.l} className="border-2 border-black bg-white p-4 shadow-brutal-sm sm:p-5">
            <p className="break-words text-[28px] font-black leading-none tracking-tight text-black">
              {s.v}
            </p>
            <p className="mt-2 font-mono text-[11px] font-bold text-faint">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Per provider */}
      <div className="mt-4 border-2 border-black bg-white p-5 shadow-brutal-sm">
        <h2 className="text-[16px] font-black text-black">Per provider</h2>
        {usage.byProvider.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">
            Belum ada request tercatat dalam {usage.days} hari terakhir. Buat
            API key di bawah dan kirim request pertama lu.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {usage.byProvider.map((p) => (
              <div
                key={p.provider}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="font-mono text-[13px] font-bold text-muted sm:w-24 sm:shrink-0">
                  {p.provider}
                </span>
                <div className="h-2.5 w-full border border-black bg-neutral-200 sm:w-auto sm:flex-1">
                  <div
                    className="h-full bg-blue"
                    style={{
                      width: `${Math.max(4, Math.round((p.requests / usage.totalRequests) * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[12px] text-muted sm:w-40 sm:shrink-0 sm:text-right">
                  {p.requests} req · {p.tokens.toLocaleString("id-ID")} token
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API keys */}
      <div className="mt-8 border-2 border-black bg-white p-5 shadow-brutal-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-black text-black">
            API key <span className="font-mono text-[13px] font-bold text-faint">· {activeKeys} aktif</span>
          </h2>
          <p className="font-mono text-[12px] font-bold text-faint">
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
            className="h-11 flex-1 border-2 border-black bg-white px-4 text-[16px] text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] sm:text-[14px]"
          />
          <button
            onClick={() => void createKey()}
            disabled={!name.trim() || creating}
            className="btn-press h-11 border-2 border-black bg-yellow px-6 text-[14px] font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Membuat…" : "Buat key baru"}
          </button>
        </div>

        {error && (
          <p className="mt-3 break-words border-2 border-black bg-white px-4 py-3 text-[14px] font-medium text-bad">
            {error}
          </p>
        )}

        {/* Key baru — tampil sekali */}
        {newKey && (
          <div className="mt-4 border-2 border-black bg-yellow p-4 shadow-brutal-sm">
            <p className="text-[14px] font-bold text-black">
              Salin key ini sekarang — tidak bisa dilihat lagi sesudahnya.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 break-all border-2 border-black bg-white px-3 py-2.5 font-mono text-[13px] font-bold text-black">
                {newKey.key}
              </code>
              <button
                onClick={() => void copy(newKey.key)}
                className="btn-press h-10 shrink-0 border-2 border-black bg-black px-5 text-[13px] font-bold text-white shadow-brutal-sm"
              >
                {copied ? "disalin ✓" : "Salin key"}
              </button>
            </div>
          </div>
        )}

        {/* Daftar key — kartu di mobile, tabel di sm+ (tabel 640px tidak
            muat di layar HP dan memaksa scroll horizontal untuk revoke). */}
        {keys.length === 0 ? (
          <p className="mt-5 py-4 text-[14px] text-muted">
            Belum ada API key. Buat satu di atas untuk mulai memakai gateway.
          </p>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3 sm:hidden">
              {keys.map((k) => (
                <div key={k.id} className="border-2 border-black bg-white p-4 shadow-brutal-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-bold text-black">
                      {k.prefix}…
                    </span>
                    {k.revokedAt ? (
                      <span className="shrink-0 border-2 border-black bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-faint">
                        revoked
                      </span>
                    ) : (
                      <span className="shrink-0 border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                        aktif
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 break-words text-[14px] font-medium text-muted">{k.name}</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-faint">
                    Dibuat {fmtDate(k.createdAt)} · Terakhir dipakai{" "}
                    {fmtDateTime(k.lastUsedAt)}
                  </p>
                  {!k.revokedAt && (
                    <button
                      onClick={() => void revokeKey(k.id)}
                      disabled={revoking === k.id}
                      className="mt-3 h-9 border-2 border-bad bg-white px-4 font-mono text-[12px] font-bold text-bad hover:bg-bad hover:text-white disabled:opacity-50"
                    >
                      {revoking === k.id ? "…" : "Revoke"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b-2 border-black font-mono text-[11px] uppercase tracking-[0.12em] text-black">
                    <th className="py-2.5 pr-4 font-bold">Key</th>
                    <th className="py-2.5 pr-4 font-bold">Nama</th>
                    <th className="py-2.5 pr-4 font-bold">Dibuat</th>
                    <th className="py-2.5 pr-4 font-bold">Terakhir dipakai</th>
                    <th className="py-2.5 pr-4 font-bold">Status</th>
                    <th className="py-2.5 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-neutral-300 last:border-0">
                      <td className="py-3 pr-4 font-mono text-[13px] font-bold text-black">
                        {k.prefix}…
                      </td>
                      <td className="py-3 pr-4 font-medium text-muted">{k.name}</td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                        {fmtDate(k.createdAt)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-muted">
                        {fmtDateTime(k.lastUsedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        {k.revokedAt ? (
                          <span className="border-2 border-black bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-faint">
                            revoked
                          </span>
                        ) : (
                          <span className="border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                            aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {!k.revokedAt && (
                          <button
                            onClick={() => void revokeKey(k.id)}
                            disabled={revoking === k.id}
                            className="border-2 border-bad bg-white px-3.5 py-1.5 font-mono text-[12px] font-bold text-bad hover:bg-bad hover:text-white disabled:opacity-50"
                          >
                            {revoking === k.id ? "…" : "Revoke"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Quickstart */}
      <div className="shadow-yellow mt-4 overflow-hidden border-2 border-black bg-dark text-ondark shadow-brutal">
        <div className="border-b-2 border-white/25 px-5 py-3.5">
          <span className="font-mono text-[12px] font-bold text-ondark-muted">
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
      <p className="mt-3 break-words font-mono text-[12px] leading-relaxed text-faint">
        Ganti hr_KEY_LU dengan API key dari tabel di atas. Model juga bisa
        berupa id provider (mis. &quot;groq&quot;) atau id model dari GET{" "}
        {baseUrl}/api/v1/models. Streaming belum didukung.
      </p>
    </div>
  );
}
