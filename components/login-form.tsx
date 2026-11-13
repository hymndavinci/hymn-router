/**
 * LoginForm — form email + password untuk /login (client component).
 *
 * Langkah-langkah:
 * - "form": toggle mode Masuk / Daftar. Submit ke POST /api/auth/login
 *   atau /api/auth/signup; sukses -> navigasi penuh ke `next` (atau
 *   /dashboard) supaya cookie session langsung terbaca server.
 *   Signup yang mengembalikan verificationRequired (202) pindah ke
 *   langkah "verify" (bukan langsung masuk).
 * - "verify": masukkan kode 6 digit dari email (POST /api/auth/verify),
 *   kirim ulang dengan cooldown 60 detik (POST /api/auth/verify/resend),
 *   atau kembali ke form bila salah email.
 * - "forgot-email" / "forgot-reset": lupa password 2 langkah — minta
 *   kode reset (POST /api/auth/forgot-password, respons selalu generik),
 *   lalu masukkan kode + password baru (POST /api/auth/reset-password).
 *
 * Pesan error API dipetakan ke teks i18n bila dikenali, kalau tidak
 * ditampilkan apa adanya (pesan server berbahasa Indonesia).
 */

"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { fill } from "@/lib/i18n-utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;
const RESEND_COOLDOWN_SECONDS = 60;

type Mode = "login" | "signup";
type Step = "form" | "verify" | "forgot-email" | "forgot-reset";

type ApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  verificationRequired?: boolean;
  email?: string;
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
};

export default function LoginForm({
  initialMode,
  next,
  emailVerificationEnabled = false,
}: {
  initialMode: Mode;
  next: string | null;
  emailVerificationEnabled?: boolean;
}) {
  const { dict } = useLocale();
  const t = dict.login;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Langkah verifikasi signup.
  const [code, setCode] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Lupa password.
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (step !== "verify" || cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [step, cooldown]);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  function backToForm(m: Mode) {
    setStep("form");
    setMode(m);
    setError(null);
    setCode("");
    setCooldown(0);
  }

  /** Pesan error API -> teks i18n (fallback: pesan server). */
  function verifyErrorMessage(data: ApiResult): string {
    switch (data.error) {
      case "invalid_code":
        return typeof data.attemptsRemaining === "number"
          ? fill(t.errInvalidCode, { remaining: data.attemptsRemaining })
          : (data.message ?? t.errInvalidCode);
      case "verification_expired":
        return t.errExpired;
      case "too_many_attempts":
        return t.errTooMany;
      case "verification_not_found":
        return t.errNotFound;
      case "email_send_failed":
        return t.errSendFailed;
      default:
        return data.message ?? data.error ?? t.errSendFailed;
    }
  }

  function resetErrorMessage(data: ApiResult): string {
    switch (data.error) {
      case "invalid_code":
        return typeof data.attemptsRemaining === "number"
          ? fill(t.errInvalidCode, { remaining: data.attemptsRemaining })
          : (data.message ?? t.errInvalidCode);
      case "reset_expired":
        return t.errResetExpired;
      case "reset_not_found":
        return t.errResetNotFound;
      case "too_many_attempts":
        return t.errResetTooMany;
      default:
        return data.message ?? data.error ?? t.errSendFailed;
    }
  }

  async function postJson(url: string, body: unknown): Promise<{ res: Response; data: ApiResult }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult;
    return { res, data };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t.invalidEmail);
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError(t.passwordShort);
      return;
    }
    if (mode === "login" && password.length === 0) {
      setError(t.passwordRequired);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { res, data } = await postJson(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        {
          email: trimmedEmail,
          password,
          ...(mode === "signup" && name.trim() ? { name: name.trim() } : {}),
        },
      );
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      // Signup dengan verifikasi email: lanjut ke langkah kode.
      if (mode === "signup" && data.verificationRequired) {
        setVerifyEmail(data.email ?? trimmedEmail);
        setCode("");
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setStep("verify");
        return;
      }
      if (!data.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      window.location.href = next ?? "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!CODE_RE.test(code)) {
      setError(t.codeInvalid);
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { res, data } = await postJson("/api/auth/verify", {
        email: verifyEmail,
        code,
      });
      if (!res.ok || !data.ok) {
        throw new Error(verifyErrorMessage(data));
      }
      window.location.href = next ?? "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const { res, data } = await postJson("/api/auth/verify/resend", {
        email: verifyEmail,
      });
      if (!res.ok) {
        if (data.error === "resend_too_soon" && typeof data.retryAfterSeconds === "number") {
          setCooldown(data.retryAfterSeconds);
          throw new Error(fill(t.errResendSoon, { seconds: data.retryAfterSeconds }));
        }
        throw new Error(verifyErrorMessage(data));
      }
      setNotice(t.codeSent);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResending(false);
    }
  }

  async function submitForgotEmail(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t.invalidEmail);
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { res, data } = await postJson("/api/auth/forgot-password", {
        email: trimmedEmail,
      });
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      setEmail(trimmedEmail);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(t.forgotSent);
      setStep("forgot-reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!CODE_RE.test(code)) {
      setError(t.codeInvalid);
      return;
    }
    if (newPassword.length < 8) {
      setError(t.passwordShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.forgotPasswordMismatch);
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { res, data } = await postJson("/api/auth/reset-password", {
        email: email.trim(),
        code,
        newPassword,
      });
      if (!res.ok || !data.ok) {
        throw new Error(resetErrorMessage(data));
      }
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCode("");
      setStep("form");
      setMode("login");
      setNotice(t.forgotSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendResetCode() {
    if (resending) return;
    setResending(true);
    setError(null);
    try {
      const { res, data } = await postJson("/api/auth/forgot-password", {
        email: email.trim(),
      });
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
      }
      setNotice(t.forgotSent);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResending(false);
    }
  }

  const inputClass =
    "w-full border-2 border-black bg-white px-4 py-3 text-[16px] font-medium text-black placeholder:text-faint focus:bg-yellow-soft focus:outline-none";

  const codeInputClass =
    "w-full border-2 border-black bg-white px-4 py-3 text-center text-[22px] font-black tracking-[0.3em] text-black placeholder:text-faint focus:bg-yellow-soft focus:outline-none";

  return (
    <div>
      {step === "form" && (
        <>
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
                {m === "login" ? t.modeLogin : t.modeSignup}
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
                  {t.nameLabel} <span className="font-medium text-muted">{t.optional}</span>
                </label>
                <input
                  id="login-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
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
                {t.emailLabel}
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
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
                {t.passwordLabel}{" "}
                {mode === "signup" && (
                  <span className="font-medium text-muted">{t.passwordHint}</span>
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

            {notice && (
              <div className="border-2 border-black bg-green-100 px-4 py-3 text-[14px] font-semibold leading-relaxed text-black">
                {notice}
              </div>
            )}
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
                ? t.processing
                : mode === "signup"
                  ? t.submitSignup
                  : t.submitLogin}
            </button>
          </form>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setStep("forgot-email");
                setError(null);
                setNotice(null);
              }}
              className="mt-4 w-full text-center text-[14px] font-bold text-black underline"
            >
              {t.forgotLink}
            </button>
          )}

          {mode === "signup" && (
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              {emailVerificationEnabled ? t.signupNoteVerify : t.signupNote}
            </p>
          )}
        </>
      )}

      {step === "verify" && (
        <div>
          <h2 className="text-[20px] font-black leading-tight text-black">
            {t.verifyTitle}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {fill(t.verifySubtitle, { email: verifyEmail })}
          </p>
          <form onSubmit={submitVerify} className="mt-5 flex flex-col gap-4" noValidate>
            <div>
              <label
                htmlFor="verify-code"
                className="mb-1.5 block text-[13px] font-bold text-black"
              >
                {t.codeLabel}
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t.codePlaceholder}
                maxLength={6}
                required
                className={codeInputClass}
              />
            </div>

            {notice && (
              <div className="border-2 border-black bg-green-100 px-4 py-3 text-[14px] font-semibold leading-relaxed text-black">
                {notice}
              </div>
            )}
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
              {loading ? t.verifying : t.verifySubmit}
            </button>
          </form>

          <button
            type="button"
            onClick={resendCode}
            disabled={resending || cooldown > 0}
            className="btn-press mt-3 h-11 w-full border-2 border-black bg-white text-[14px] font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cooldown > 0
              ? fill(t.resendCooldown, { seconds: cooldown })
              : t.resendBtn}
          </button>
          <button
            type="button"
            onClick={() => backToForm("signup")}
            className="mt-4 w-full text-center text-[14px] font-bold text-black underline"
          >
            {t.wrongEmail}
          </button>
        </div>
      )}

      {step === "forgot-email" && (
        <div>
          <h2 className="text-[20px] font-black leading-tight text-black">
            {t.forgotTitle}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {t.forgotSubtitle}
          </p>
          <form onSubmit={submitForgotEmail} className="mt-5 flex flex-col gap-4" noValidate>
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-1.5 block text-[13px] font-bold text-black"
              >
                {t.emailLabel}
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                maxLength={254}
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
              {loading ? t.processing : t.forgotSend}
            </button>
          </form>
          <button
            type="button"
            onClick={() => backToForm("login")}
            className="mt-4 w-full text-center text-[14px] font-bold text-black underline"
          >
            {t.forgotBack}
          </button>
        </div>
      )}

      {step === "forgot-reset" && (
        <div>
          <h2 className="text-[20px] font-black leading-tight text-black">
            {t.forgotTitle}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {fill(t.verifySubtitle, { email: email.trim() })}
          </p>
          <form onSubmit={submitReset} className="mt-5 flex flex-col gap-4" noValidate>
            <div>
              <label
                htmlFor="reset-code"
                className="mb-1.5 block text-[13px] font-bold text-black"
              >
                {t.forgotCodeLabel}
              </label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={t.codePlaceholder}
                maxLength={6}
                required
                className={codeInputClass}
              />
            </div>
            <div>
              <label
                htmlFor="reset-new-password"
                className="mb-1.5 block text-[13px] font-bold text-black"
              >
                {t.forgotNewPassword}{" "}
                <span className="font-medium text-muted">{t.passwordHint}</span>
              </label>
              <input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                maxLength={128}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="reset-confirm-password"
                className="mb-1.5 block text-[13px] font-bold text-black"
              >
                {t.forgotConfirmPassword}
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                maxLength={128}
                required
                className={inputClass}
              />
            </div>

            {notice && (
              <div className="border-2 border-black bg-green-100 px-4 py-3 text-[14px] font-semibold leading-relaxed text-black">
                {notice}
              </div>
            )}
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
              {loading ? t.processing : t.forgotResetSubmit}
            </button>
          </form>

          <button
            type="button"
            onClick={resendResetCode}
            disabled={resending}
            className="mt-3 w-full text-center text-[14px] font-bold text-black underline disabled:opacity-60"
          >
            {t.forgotResend}
          </button>
          <button
            type="button"
            onClick={() => backToForm("login")}
            className="mt-4 w-full text-center text-[14px] font-bold text-black underline"
          >
            {t.forgotBack}
          </button>
        </div>
      )}
    </div>
  );
}
