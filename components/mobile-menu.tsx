/**
 * MobileMenu — menu hamburger untuk layar < md.
 *
 * Navbar desktop menyembunyikan semua link navigasi di mobile, jadi tanpa
 * komponen ini user HP tidak bisa mencapai Provider, Cara Pakai, API,
 * dan FAQ. Panel dropdown menempel di bawah header sticky.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

const LINKS = [
  { href: "/#provider", label: "Provider" },
  { href: "/models", label: "Model" },
  { href: "/#cara-pakai", label: "Cara Pakai" },
  { href: "/chat", label: "Chat" },
  { href: "/docs", label: "API Docs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#faq", label: "FAQ" },
];

export default function MobileMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-[18px] font-bold leading-none text-black shadow-brutal-xs"
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
                    Keluar
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/api/auth/google"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center border-2 border-black bg-yellow text-[14px] font-bold text-black shadow-brutal-sm"
              >
                Masuk dengan Google
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
