/** Footer putih neo-brutalism — brand, link produk/resource, catatan privasi. */

import Link from "next/link";
import { dict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n-utils";
import { getProviders } from "@/lib/free-ai-router";

export default async function Footer() {
  const t = dict[await getLocale()];
  const providerTotal = getProviders().length;
  return (
    <footer className="border-t-2 border-black bg-white">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-yellow font-mono text-[13px] font-bold text-black shadow-brutal-xs">
              {"<>"}
            </span>
            <span className="text-[17px] font-extrabold tracking-tight text-black">
              Hymn Router
            </span>
          </div>
          <p className="mt-4 max-w-[260px] text-[15px] leading-relaxed text-muted">
            {t.footer.tagline}
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black">
            {t.footer.products}
          </p>
          <ul className="mt-4 text-[14px] font-medium text-muted">
            <li>
              <Link href="/#provider" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.provider}
              </Link>
            </li>
            <li>
              <Link href="/models" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.models}
              </Link>
            </li>
            <li>
              <Link href="/images" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.images}
              </Link>
            </li>
            <li>
              <Link href="/status" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.status}
              </Link>
            </li>
            <li>
              <Link href="/chat" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.chat}
              </Link>
            </li>
            <li>
              <Link href="/docs#quickstart" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.guide}
              </Link>
            </li>
            <li>
              <Link href="/docs" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.apiDocs}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                {t.nav.dashboard}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black">
            {t.footer.resources}
          </p>
          <ul className="mt-4 text-[14px] font-medium text-muted">
            <li>
              <a
                href="https://github.com/hymndavinci/hymn-router"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4"
              >
                GitHub ↗
              </a>
            </li>
            <li>
              <a
                href="https://github.com/hymndavinci/hymn-router#readme"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4"
              >
                README ↗
              </a>
            </li>
            <li>
              <Link href="/api/v1/models" className="inline-flex min-h-[44px] w-full items-center hover:text-blue hover:underline hover:underline-offset-4">
                /api/v1/models
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black">
            {t.footer.privacy}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            {t.footer.privacyText}
          </p>
        </div>
      </div>

      <div className="border-t-2 border-black">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 px-6 py-5 lg:px-8">
          <p className="font-mono text-[12px] font-bold text-black">© 2026 Hymn Router</p>
          <p className="font-mono text-[12px] text-muted">{fill(t.footer.bottom, { total: providerTotal })}</p>
        </div>
      </div>
    </footer>
  );
}
