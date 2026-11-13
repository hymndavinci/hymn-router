/**
 * POST /api/locale — set cookie bahasa hymn_locale ("id" | "en").
 * Dipakai LocaleToggle; nilai selain id/en ditolak 400.
 */

import { NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    locale?: unknown;
  } | null;
  const locale = body?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 tahun
    sameSite: "lax",
  });
  return res;
}
