/**
 * LocaleToggle — switch ID | EN neo-brutalism.
 * Klik -> POST /api/locale (set cookie hymn_locale) -> router.refresh()
 * supaya Server Component re-render dengan bahasa baru.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

const OPTIONS: Locale[] = ["id", "en"];

export default function LocaleToggle() {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setLocale(l: Locale) {
    if (l === locale || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: l }),
      });
      if (res.ok) {
        // Perbarui atribut lang segera (refresh server juga akan
        // melakukannya, tapi ini menjamin konsistensi).
        document.documentElement.lang = l;
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex shrink-0 border-2 border-black bg-white shadow-brutal-xs"
      role="group"
      aria-label={dict.nav.changeLanguage}
    >
      {OPTIONS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => void setLocale(l)}
          aria-pressed={locale === l}
          disabled={busy}
          className={`h-8 px-2.5 font-mono text-[12px] font-bold text-black transition-colors disabled:opacity-60 ${
            locale === l ? "bg-yellow" : "hover:bg-yellow-soft"
          } ${l === "id" ? "border-r-2 border-black" : ""}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
