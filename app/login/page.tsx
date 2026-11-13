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
import Navbar from "@/components/navbar";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Masuk — Hymn Router",
  description:
    "Masuk ke Hymn Router dengan email, Google, atau GitHub untuk membuat API key dan memakai gateway AI gratis.",
};

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  github_not_configured:
    "Login GitHub belum dikonfigurasi di server. Pakai Google atau email dulu.",
  github_no_email:
    "Akun GitHub lu tidak membagikan alamat email (cek Settings → Emails di GitHub). Pakai Google atau email dulu.",
  github_failed:
    "Login GitHub gagal — coba lagi, atau pakai Google / email.",
  oauth_only:
    "Akun ini dibuat lewat Google/GitHub. Masuk dengan tombol di atas.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
}) {
  const { next, mode, error } = await searchParams;
  const safeNext = isSafeNextPath(next) ? next : null;

  // Sudah login -> langsung ke tujuan (DB error dianggap belum login;
  // form di bawah akan menampilkan pesan database kalau dicoba).
  const user = await getSessionUser().catch(() => null);
  if (user) redirect(safeNext ?? "/dashboard");

  const githubConfigured = !!process.env.GITHUB_CLIENT_ID?.trim();
  const nextQuery = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[480px] px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-yellow px-2 py-1">Akun Hymn Router</span>
        </p>
        <h1 className="mt-4 text-center text-[32px] font-black leading-tight tracking-tight text-black">
          Masuk ke Hymn Router
        </h1>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-muted">
          Satu akun untuk API key, dashboard pemakaian, dan gateway /v1.
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
              Lanjutkan dengan Google
            </Link>
            {githubConfigured && (
              <Link
                href={`/api/auth/github${nextQuery}`}
                className="btn-press flex h-12 items-center justify-center gap-2.5 border-2 border-black bg-dark text-[15px] font-bold text-ondark shadow-brutal-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center border-2 border-white bg-black font-mono text-[12px] font-black text-white">
                  {"</>"}
                </span>
                Lanjutkan dengan GitHub
              </Link>
            )}
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-[2px] flex-1 bg-black" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
              atau lanjut dengan email
            </span>
            <span className="h-[2px] flex-1 bg-black" />
          </div>

          <LoginForm
            initialMode={mode === "signup" ? "signup" : "login"}
            next={safeNext}
          />
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-muted">
          Dengan masuk, lu memakai gateway AI gratis ini untuk keperluan
          pribadi. Password disimpan sebagai hash scrypt — password asli
          tidak pernah disimpan.
        </p>
      </div>
    </div>
  );
}
