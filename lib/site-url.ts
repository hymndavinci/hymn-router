/**
 * site-url.ts — base URL deployment saat ini (server-side only).
 *
 * Dari header request (benar di local, preview, dan production).
 * Fallback ke domain production kalau header tidak ada.
 */

import { headers } from "next/headers";

export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "https://hymnrouter.my.id";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
