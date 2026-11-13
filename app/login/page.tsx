/**
 * /login — halaman masuk / daftar Hymn Router.
 *
 * Server Component: kalau sudah login, redirect ke /dashboard (atau
 * `next` yang valid). Tombol GitHub hanya tampil kalau
 * GITHUB_CLIENT_ID ter-set di server — OAuth App GitHub bersifat
 * opsional. Form email/password dirender client component terpisah.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isSafeNextPath } from "@/lib/auth";
import { dict, getLocale } from "@/lib/i18n";
import Navbar from "@/components/navbar";
import LoginForm from "@/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLocale()];
  return { title: t.meta.loginTitle, description: t.meta.loginDescription };
}

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const t = dict[await getLocale()];
  const { next, mode, error } = await searchParams;
  const safeNext = isSafeNextPath(next) ? next : null;

  // Sudah login -> langsung ke tujuan (DB error dianggap belum login;
  // form di bawah akan menampilkan pesan database kalau dicoba).
  const user = await getSessionUser().catch(() => null);
  if (user) redirect(safeNext ?? "/dashboard");

  const githubConfigured = !!process.env.GITHUB_CLIENT_ID?.trim();
  const emailVerificationEnabled = !!process.env.RESEND_API_KEY?.trim();
  const nextQuery = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";
  const errorMsg = error ? (t.login.errors[error] ?? null) : null;

  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[480px] px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-yellow px-2 py-1">{t.login.badge}</span>
        </p>
        <h1 className="mt-4 text-center text-[32px] font-black leading-tight tracking-tight text-black">
          {t.login.title}
        </h1>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-muted">
          {t.login.subtitle}
        </p>

        {errorMsg && (
          <div className="mt-6 border-2 border-black bg-red-100 px-4 py-3 text-[14px] font-semibold leading-relaxed text-black shadow-brutal-sm">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 border-2 border-black bg-white p-5 shadow-brutal sm:p-6">
          <div className="flex flex-col gap-3">
            <Link
              href={`/api/auth/google${nextQuery}`}
              className="btn-press flex h-12 items-center justify-center gap-2.5 border-2 border-black bg-white text-[15px] font-bold text-black shadow-brutal-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center border-2 border-black bg-yellow font-mono text-[12px] font-black text-black">
                G
              </span>
              {t.login.googleBtn}
            </Link>
            {githubConfigured && (
              <Link
                href={`/api/auth/github${nextQuery}`}
                className="btn-press flex h-12 items-center justify-center gap-2.5 border-2 border-black bg-dark text-[15px] font-bold text-ondark shadow-brutal-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center border-2 border-white bg-black font-mono text-[12px] font-black text-white">
                  {"</>"}
                </span>
                {t.login.githubBtn}
              </Link>
            )}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-[2px] flex-1 bg-black" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
              {t.login.divider}
            </span>
            <span className="h-[2px] flex-1 bg-black" />
          </div>

          <LoginForm
            initialMode={mode === "signup" ? "signup" : "login"}
            next={safeNext}
            emailVerificationEnabled={emailVerificationEnabled}
          />
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-muted">
          {t.login.footnote}
        </p>
      </div>
    </div>
  );
}
