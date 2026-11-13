/**
 * LocaleProvider — context bahasa untuk client component.
 *
 * Server (layout) membaca locale dari cookie dan meneruskan kamus yang
 * sudah dipilih sebagai prop — client component TIDAK BOLEH mengimpor
 * lib/i18n.ts secara langsung (file itu mengimpor next/headers).
 */

"use client";

import { createContext, useContext } from "react";
import type { Dict, Locale } from "@/lib/i18n";

type LocaleCtx = { locale: Locale; dict: Dict };

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: LocaleCtx & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, dict }}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocale harus dipakai di dalam LocaleProvider");
  return v;
}

// Re-export helper netral supaya client component cukup mengimpor dari sini.
export { dateLocaleOf, fill } from "@/lib/i18n-utils";
