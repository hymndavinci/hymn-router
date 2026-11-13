/**
 * Navbar — server component, baca session dari cookie.
 * Neo-brutalism: putih, border bawah hitam tebal, logo kuning.
 * Sticky. Link anchor mengarah ke /#... supaya tetap jalan dari
 * halaman mana pun. Di mobile, navigasi lewat MobileMenu (hamburger).
 */

import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import MobileMenu from "@/components/mobile-menu";

const NAV_LINKS = [
  { href: "/#provider", label: "Provider" },
  { href: "/models", label: "Model" },
  { href: "/#cara-pakai", label: "Cara Pakai" },
  { href: "/docs", label: "API" },
  { href: "/#faq", label: "FAQ" },
];

export default async function Navbar() {
  // Kalau DB gagal sesaat, navbar tampil sebagai belum login — jangan
  // sampai seluruh halaman ikut crash gara-gara session check.
  const user = await getSessionUser().catch(() => null);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-black bg-white">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-yellow font-mono text-[13px] font-bold text-black shadow-brutal-xs">
            {"<>"}
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-black">
            Hymn Router
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14px] font-semibold text-black transition-colors hover:text-blue"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop: tombol auth lengkap */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 border-2 border-black bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:bg-yellow-soft sm:flex"
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
                  <span className="flex h-6 w-6 items-center justify-center bg-black text-[11px] font-bold text-white">
                    {(user.name ?? user.email).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[140px] truncate text-[13px] font-semibold text-black">
                  {user.name ?? user.email}
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="btn-press border-2 border-black bg-yellow px-4 py-2 text-[13px] font-bold text-black shadow-brutal-sm"
              >
                Dashboard
              </Link>
              <form action="/api/auth/logout" method="POST" className="flex">
                <button
                  type="submit"
                  className="text-[13px] font-semibold text-muted transition-colors hover:text-black"
                >
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/api/auth/google"
                className="text-[14px] font-bold text-black transition-colors hover:text-blue"
              >
                Masuk
              </Link>
              <Link
                href="/api/auth/google"
                className="btn-press border-2 border-black bg-yellow px-5 py-2.5 text-[14px] font-bold text-black shadow-brutal-sm"
              >
                Mulai
              </Link>
            </>
          )}
        </div>

        {/* Mobile: satu CTA utama + hamburger (link lain di dalam menu) */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href={user ? "/dashboard" : "/api/auth/google"}
            className="border-2 border-black bg-yellow px-4 py-2 text-[13px] font-bold text-black shadow-brutal-sm"
          >
            {user ? "Dashboard" : "Mulai"}
          </Link>
          <MobileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
