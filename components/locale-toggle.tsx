/**
 * LocaleToggle — switch ID | EN neo-brutalism, OPTIMISTIS.
 *
 * Klik -> UI berubah SEGERA (context locale + atribut lang) -> POST
 * /api/locale di background -> router.refresh() untuk menyelaraskan
 * Server Component. Tombol tidak pernah di-disable: klik cepat
 * bergantian dilayani, dan hanya respons dari klik terbaru yang boleh
 * memicu refresh (klik lama yang dibatalkan/didahului diabaikan).
 */

"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

const OPTIONS: Locale[] = ["id", "en"];

export default function LocaleToggle() {
  const { locale, dict, setLocaleOptimistic } = useLocale();
  const router = useRouter();
  // Nomor urut klik terakhir + controller POST yang sedang jalan.
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  function setLocale(l: Locale) {
    if (l === locale) return;
    const prev = locale;

    // Optimistis: UI berubah sekarang, sebelum network selesai.
    setLocaleOptimistic(l);
    document.documentElement.lang = l;

    const seq = ++seqRef.current;
    // Batalkan POST sebelumnya supaya cookie akhir mengikuti klik terbaru.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const res = await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: l }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        // Gagal/dibatalkan: kembalikan UI ke bahasa sebelumnya — hanya
        // bila klik ini masih yang terbaru (klik yang lebih baru sudah
        // menguasainya dan tidak boleh ditimpa).
        if (seq !== seqRef.current) return;
        setLocaleOptimistic(prev);
        document.documentElement.lang = prev;
        return;
      }
      if (seq !== seqRef.current) return;
      // Selaraskan Server Component dengan cookie baru.
      router.refresh();
    })();
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
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`h-11 px-2.5 font-mono text-[12px] font-bold text-black ${
            locale === l ? "bg-yellow" : "hover:bg-yellow-soft"
          } ${l === "id" ? "border-r-2 border-black" : ""}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
