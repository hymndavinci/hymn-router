/**
 * /auth/error — halaman pesan jelas saat login Google gagal.
 * reason dikirim dari callback route; tidak pernah menampilkan stack trace.
 */

import Link from "next/link";
import Navbar from "@/components/navbar";
import { dict, getLocale } from "@/lib/i18n";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const t = dict[await getLocale()];
  const { reason } = await searchParams;
  const msg = t.authError.messages[reason ?? ""] ?? t.authError.messages.unknown;

  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[640px] px-6 py-20">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-yellow px-2 py-1">{t.authError.badge}</span>
        </p>
        <h1 className="mt-4 text-[32px] font-black leading-tight tracking-tight text-black">
          {msg.title}
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">{msg.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="btn-press border-2 border-black bg-yellow px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
          >
            {t.authError.retryBtn}
          </Link>
          <Link
            href="/"
            className="btn-press border-2 border-black bg-white px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
          >
            {t.authError.homeBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
