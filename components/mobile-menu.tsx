/**
 * MobileMenu — menu hamburger untuk layar < xl.
 *
 * Navbar desktop menyembunyikan semua link navigasi di bawah xl, jadi
 * tanpa komponen ini user HP tidak bisa mencapai Provider, Cara Pakai,
 * API, dan FAQ. Panel dropdown menempel di bawah header sticky.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { useLocale } from "@/components/locale-provider";
import LocaleToggle from "@/components/locale-toggle";

export default function MobileMenu({ user }: { user: SessionUser | null }) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);

  const LINKS = [
    { href: "/#provider", label: dict.nav.provider },
    { href: "/models", label: dict.nav.models },
    { href: "/images", label: dict.nav.images },
    { href: "/status", label: dict.nav.status },
    { href: "/#cara-pakai", label: dict.nav.howto },
    { href: "/chat", label: dict.nav.chat },
    { href: "/docs#quickstart", label: dict.nav.guide },
    { href: "/docs", label: dict.nav.apiDocs },
    { href: "/dashboard", label: dict.nav.dashboard },
    { href: "/#faq", label: dict.nav.faq },
  ];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
        className="flex h-11 w-11 items-center justify-center border-2 border-black bg-white text-[18px] font-bold leading-none text-black shadow-brutal-xs"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b-2 border-black bg-white px-4 pb-5 pt-1">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b-2 border-black py-3.5 text-[16px] font-bold text-black last:border-0 hover:text-blue"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-2 flex flex-col gap-2 border-t-2 border-black pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] font-bold uppercase tracking-[0.15em] text-muted">
                {dict.nav.changeLanguage}
              </span>
              <LocaleToggle />
            </div>
            {user ? (
              <>
                <p className="truncate font-mono text-[12px] text-muted">
                  {user.email}
                </p>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center border-2 border-black bg-white text-[14px] font-bold text-black shadow-brutal-sm"
                  >
                    {dict.nav.signOut}
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center border-2 border-black bg-yellow text-[14px] font-bold text-black shadow-brutal-sm"
              >
                {dict.nav.signInUp}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
