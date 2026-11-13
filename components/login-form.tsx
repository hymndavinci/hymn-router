/**
 * LoginForm — form email + password untuk /login (client component).
 *
 * Toggle mode Masuk / Daftar. Submit ke POST /api/auth/login atau
 * /api/auth/signup; sukses -> navigasi penuh ke `next` (atau
 * /dashboard) supaya cookie session langsung terbaca server.
 * Pesan error dari API ditampilkan apa adanya.
 */

"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "login" | "signup";

export default function LoginForm({
  initialMode,
  next,
}: {
  initialMode: Mode;
  next: string | null;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Format email tidak valid.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (mode === "login" && password.length === 0) {
      setError("Password wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          ...(mode === "signup" && name.trim() ? { name: name.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      window.location.href = next ?? "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border-2 border-black bg-white px-4 py-3 text-[16px] font-medium text-black placeholder:text-faint focus:bg-yellow-soft focus:outline-none";

  return (
    <div>
      {/* Toggle mode */}
      <div className="flex border-2 border-black">
        {(["login", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className={`h-11 flex-1 text-[15px] font-bold text-black transition-colors ${
              mode === m ? "bg-yellow" : "bg-white hover:bg-yellow-soft"
            } ${m === "login" ? "border-r-2 border-black" : ""}`}
          >
            {m === "login" ? "Masuk" : "Daftar"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
        {mode === "signup" && (
          <div>
            <label
              htmlFor="login-name"
              className="mb-1.5 block text-[13px] font-bold text-black"
            >
              Nama <span className="font-medium text-muted">(opsional)</span>
            </label>
            <input
              id="login-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              maxLength={100}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-[13px] font-bold text-black"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            maxLength={254}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-[13px] font-bold text-black"
          >
            Password{" "}
            {mode === "signup" && (
              <span className="font-medium text-muted">(minimal 8 karakter)</span>
            )}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            maxLength={128}
            required
            className={inputClass}
          />
        </div>

        {error && (
          <div className="border-2 border-black bg-red-100 px-4 py-3 text-[14px] font-semibold leading-relaxed text-black">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-press h-12 w-full border-2 border-black bg-yellow text-[15px] font-bold text-black shadow-brutal-sm disabled:cursor-wait disabled:opacity-60"
        >
          {loading
            ? "Memproses…"
            : mode === "signup"
              ? "Buat akun"
              : "Masuk"}
        </button>
      </form>

      {mode === "signup" && (
        <p className="mt-4 text-[13px] leading-relaxed text-muted">
          Belum ada verifikasi email — akun langsung aktif setelah daftar.
        </p>
      )}
    </div>
  );
}
