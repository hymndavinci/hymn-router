/**
 * LocaleProvider — context bahasa untuk client component.
 *
 * Server (layout) membaca locale dari cookie dan meneruskan KEDUA kamus
 * sebagai prop — client component TIDAK BOLEH mengimpor lib/i18n.ts
 * secara langsung (file itu mengimpor next/headers).
 *
 * Locale disimpan sebagai state internal: toggle bahasa bisa mengubahnya
 * secara optimistis (UI langsung re-render) sebelum POST /api/locale
 * selesai. Saat prop server berubah (mis. setelah router.refresh()),
 * state diselaraskan kembali — kecuali bila klik terakhir masih baru
 * (<2 dtk), karena nilai server itu bisa "basi" (refresh dari klik
 * sebelumnya yang kembali setelah klik terbaru).
 */

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";

type LocaleCtx = {
  locale: Locale;
  dict: Dict;
  /** Ganti bahasa secara optimistis di client (tanpa menunggu server). */
  setLocaleOptimistic: (l: Locale) => void;
};

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  locale: serverLocale,
  dicts,
  children,
}: {
  locale: Locale;
  dicts: Record<Locale, Dict>;
  children: React.ReactNode;
}) {
  // State awal = prop server (tanpa hydration mismatch).
  const [locale, setLocale] = useState<Locale>(serverLocale);
  const lastOptimisticAt = useRef(0);

  const setLocaleOptimistic = useCallback((l: Locale) => {
    lastOptimisticAt.current = Date.now();
    setLocale(l);
  }, []);

  useEffect(() => {
    // Abaikan prop server yang berbeda dari state saat klik terakhir
    // masih baru — kemungkinan besar itu respons refresh yang sudah
    // kedaluwarsa (klik yang lebih baru sudah menguasainya).
    if (serverLocale !== locale && Date.now() - lastOptimisticAt.current < 2000) {
      return;
    }
    setLocale(serverLocale);
  }, [serverLocale, locale]);

  return (
    <Ctx.Provider value={{ locale, dict: dicts[locale], setLocaleOptimistic }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLocale(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocale harus dipakai di dalam LocaleProvider");
  return v;
}

// Re-export helper netral supaya client component cukup mengimpor dari sini.
export { dateLocaleOf, fill } from "@/lib/i18n-utils";
