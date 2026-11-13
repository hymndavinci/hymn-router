/**
 * Navbar — server component, baca session dari cookie.
 * Sticky, cream, hairline bawah. Link anchor mengarah ke /#... supaya
 * tetap jalan dari halaman mana pun.
 */

import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/#provider", label: "Provider" },
  { href: "/#cara-pakai", label: "Cara Pakai" },
  { href: "/docs", label: "API" },
  { href: "/#faq", label: "FAQ" },
];

export default async function Navbar() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-dark font-mono text-[13px] font-bold text-white">
            {"<>"}
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-text">
            Hymn Router
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14px] text-muted transition-colors hover:text-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 rounded-full border border-line-2 bg-panel-2 py-1.5 pl-1.5 pr-3 transition-colors hover:border-faint sm:flex"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dark text-[11px] font-semibold text-white">
                    {(user.name ?? user.email).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[140px] truncate text-[13px] font-medium text-text">
                  {user.name ?? user.email}
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full bg-dark px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-85"
              >
                Dashboard
              </Link>
              <Link
                href="/api/auth/logout"
                className="text-[13px] text-muted transition-colors hover:text-text"
              >
                Keluar
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/api/auth/google"
                className="text-[14px] font-medium text-text transition-colors hover:text-muted"
              >
                Masuk
              </Link>
              <Link
                href="/api/auth/google"
                className="rounded-full bg-dark px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-85"
              >
                Mulai
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
