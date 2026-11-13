/**
 * Helper i18n netral — TIDAK mengimpor next/headers dan BUKAN client
 * module, jadi aman dipakai dari Server Component MAUPUN Client
 * Component. (Fungsi dari module "use client" tidak boleh dipanggil
 * dari server — Next melempar "Attempted to call ... from the server".)
 */

import type { Locale } from "./i18n";

/** Isi placeholder {nama} pada string kamus. */
export function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

/** Locale Intl.DateTimeFormat / NumberFormat yang sesuai bahasa UI. */
export function dateLocaleOf(locale: Locale): string {
  return locale === "id" ? "id-ID" : "en-US";
}
