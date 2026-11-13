/**
 * Landing page Hymn Router — NEO-BRUTALISM (kuning / putih / hijau / biru).
 * Blok warna berani bergantian: putih, kuning lembut, hitam, putih, biru,
 * hijau lembut, hitam. Border hitam tebal, hard shadow, sudut tajam.
 */

import Link from "next/link";
import { getProviderStatus } from "@/lib/free-ai-router";
import { getBaseUrl } from "@/lib/site-url";
import { dict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n-utils";
import Navbar from "@/components/navbar";
import GlobeArt from "@/components/globe-art";
import CodeWindow from "@/components/code-window";
import Faq from "@/components/faq";
import ProviderSection from "@/components/provider-section";
import Reveal from "@/components/reveal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = dict[await getLocale()];
  const h = t.home;
  const providers = getProviderStatus();
  const baseUrl = await getBaseUrl();
  const configured = providers.filter((p) => p.configured).length;
  const keyless = providers.filter((p) => !p.needsKey).length;

  return (
    <div className="flex-1">
      {/* 1. Announcement bar — kuning */}
      <div className="border-b-2 border-black bg-yellow">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-center lg:px-8">
          <span className="text-[13px] font-bold text-black">{fill(h.announcement, { total: providers.length })}</span>
          <Link
            href="#provider"
            className="font-mono text-[12px] font-bold text-black underline underline-offset-4 hover:text-blue"
          >
            {h.announcementLink}
          </Link>
        </div>
      </div>

      <Navbar />

      {/* 3. Hero — putih */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <span className="bg-yellow px-2 py-1">{h.heroBadge}</span>
            </p>
            <h1 className="mt-5 text-[44px] font-black leading-[1.05] tracking-[-0.02em] text-black sm:text-[56px] lg:text-[64px]">
              {h.heroTitle}
            </h1>
            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.6] text-muted">
              {fill(h.heroSub, { total: providers.length })}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="btn-press border-2 border-black bg-yellow px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
              >
                {h.ctaStart}
              </Link>
              <Link
                href="/chat"
                className="btn-press border-2 border-black bg-white px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
              >
                {h.ctaChat}
              </Link>
              <Link
                href="/docs"
                className="px-2 py-3 font-mono text-[13px] font-bold text-blue underline underline-offset-4 hover:text-black"
              >
                {h.ctaDocs}
              </Link>
            </div>
            <p className="mt-6 font-mono text-[12px] text-faint">
              {fill(h.providerLine, { configured, total: providers.length })}
            </p>
          </div>
          <div className="hidden min-w-0 lg:block">
            <GlobeArt />
          </div>
        </div>

        {/* Stats row */}
        <Reveal className="border-t-2 border-black">
          <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 px-6 sm:grid-cols-4 sm:divide-x-2 sm:divide-black lg:px-8">
            {h.stats.map((s) => (
              <div key={s.label} className="px-1 py-7 sm:px-6 sm:first:pl-0">
                <p className="text-[32px] font-black leading-none tracking-tight text-black">
                  {fill(s.value, { total: providers.length, keyless })}
                </p>
                <p className="mt-2 text-[13px] font-medium leading-snug text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 3b. Mulai dalam 3 langkah — kuning (panduan pemula, menonjol di atas) */}
      <section className="border-b-2 border-black bg-yellow">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-8 lg:py-20">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-white px-2 py-1">{h.quickstartEyebrow}</span>
          </p>
          <h2 className="mt-4 max-w-[640px] text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
            {h.quickstartTitle}
          </h2>
          <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-black/70">
            {h.quickstartSub}
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {h.quickstartSteps.map((s, i) => {
              const hrefs = ["/login", "/dashboard", "/chat"];
              return (
                <Reveal key={s.n} delay={Math.min(i * 50, 150)}>
                  <div className="flex h-full min-w-0 flex-col border-2 border-black bg-white p-6 shadow-brutal">
                    <p className="text-[48px] font-black leading-none tracking-tight text-black">
                      {s.n}
                    </p>
                    <h3 className="mt-3 text-[18px] font-bold text-black">{s.title}</h3>
                    <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{s.body}</p>
                    <Link
                      href={hrefs[i] ?? "/"}
                      className="btn-press mt-5 inline-block self-start border-2 border-black bg-yellow px-5 py-2.5 text-[14px] font-bold text-black shadow-brutal-sm"
                    >
                      {s.cta} →
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Provider — kuning lembut */}
      <section id="provider" className="scroll-mt-16 border-b-2 border-black bg-yellow-soft">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-8 lg:py-28">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-yellow px-2 py-1">{h.providersEyebrow}</span>
          </p>
          <h2 className="mt-4 max-w-[640px] text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
            {fill(h.providersTitle, { total: providers.length })}
          </h2>
          <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-muted">
            {fill(h.providersSub, { keyless })}
          </p>
          <div className="mt-12">
            <ProviderSection initial={providers} />
          </div>
        </div>
      </section>

      {/* 5. Cara pakai — hitam */}
      <section id="cara-pakai" className="scroll-mt-16 bg-dark text-ondark">
        <div className="mx-auto grid w-full max-w-[1280px] gap-12 px-6 py-24 lg:grid-cols-2 lg:px-8">
          {/* min-w-0: item grid default min-width:auto — tanpa ini, baris
              <pre> terpanjang di CodeWindow (±471px) memaksa kolom grid
              melebar keluar viewport di mobile dan teks putih keluar dari
              area gelap. */}
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-yellow">
              {h.howtoEyebrow}
            </p>
            <h2 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-ondark sm:text-[44px]">
              {h.howtoTitle}
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6] text-ondark-muted">
              {h.howtoSub}
            </p>
            <ol className="mt-10 space-y-8">
              {h.steps.map((s, i) => (
                <Reveal as="li" key={s.n} delay={Math.min(i * 50, 150)} className="flex gap-5">
                  <span className="font-mono text-[13px] font-bold text-yellow">
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-bold text-ondark">{s.title}</h3>
                    <p className="mt-1 max-w-[440px] text-[15px] leading-relaxed text-ondark-muted">
                      {s.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <div className="mt-10">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ondark-muted">
                {h.worksWith}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["OpenAI SDK", "cURL", "fetch"].map((c) => (
                  <span
                    key={c}
                    className="border-2 border-yellow px-3.5 py-1.5 font-mono text-[12px] font-bold text-yellow"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Reveal className="min-w-0 lg:pt-24">
            <CodeWindow baseUrl={baseUrl} />
            <p className="mt-4 font-mono text-[12px] leading-relaxed text-ondark-muted">
              {h.codeNote}
            </p>
          </Reveal>
        </div>
      </section>

      {/* 6. Dashboard — putih */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-12 px-6 py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <span className="bg-green px-2 py-1 text-white">{h.dashboardEyebrow}</span>
            </p>
            <h2 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
              {h.dashboardTitle}
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6] text-muted">
              {h.dashboardSub}
            </p>
            <ul className="mt-10 space-y-8">
              {h.dashboardFeatures.map((f, i) => (
                <Reveal as="li" key={f.title} delay={Math.min(i * 50, 150)} className="border-t-2 border-black pt-6">
                  <h3 className="text-[18px] font-bold text-black">{f.title}</h3>
                  <p className="mt-1 max-w-[480px] text-[15px] leading-relaxed text-muted">
                    {f.body}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Mock dashboard statis */}
          <Reveal className="min-w-0 lg:pt-24">
            <div className="overflow-hidden border-2 border-black bg-white shadow-brutal">
              <div className="flex items-center justify-between border-b-2 border-black px-5 py-3.5">
                <span className="font-mono text-[12px] font-bold text-muted">
                  {h.mockLabel}
                </span>
                <span className="border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                  {fill(h.mockActive, { configured, total: providers.length })}
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
                {h.mockStats.map((s) => (
                  <div key={s.l} className="px-4 py-4">
                    <p className="text-[22px] font-black leading-none tracking-tight text-black">
                      {s.v}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-faint">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 px-5 py-4">
                {[
                  { p: "groq", n: 412 },
                  { p: "kilo", n: 388 },
                  { p: "llm7", n: 301 },
                ].map((r) => (
                  <div key={r.p} className="flex items-center gap-3">
                    <span className="w-14 font-mono text-[12px] font-bold text-muted">{r.p}</span>
                    <div className="h-2.5 flex-1 border border-black bg-neutral-200">
                      <div
                        className="h-full bg-blue"
                        style={{ width: `${Math.round((r.n / 412) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-[12px] text-muted">
                      {r.n}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 border-t-2 border-black px-5 py-3.5">
                <span className="min-w-0 truncate font-mono text-[12px] text-muted">
                  hr_4f8a2c1e9b3d… · bot-discord
                </span>
                <span className="shrink-0 font-mono text-[11px] font-bold text-green">
                  {h.mockActiveLabel}
                </span>
              </div>
            </div>
            <p className="mt-3 font-mono text-[12px] text-faint">{h.mockCaption}</p>
          </Reveal>
        </div>
      </section>

      {/* 7. Kenapa — biru */}
      <section className="bg-blue text-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-yellow">
            {h.whyEyebrow}
          </p>
          <h2 className="mt-4 max-w-[720px] text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-white sm:text-[44px]">
            {h.whyTitle}
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {h.whyCards.map((c, i) => (
              <Reveal key={c.title} delay={Math.min(i * 50, 150)}>
                <div className="h-full border-2 border-black bg-white p-6 shadow-brutal">
                  <p className="text-[48px] font-black leading-none tracking-tight text-black">
                    {fill(c.big, { total: providers.length, keyless })}
                  </p>
                  <h3 className="mt-3 text-[18px] font-bold text-black">{c.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-12 max-w-[720px] text-[15px] leading-relaxed text-white/90">
            {h.whyPrivacy}
          </p>
        </div>
      </section>

      {/* 8. FAQ — hijau lembut */}
      <section id="faq" className="scroll-mt-16 border-b-2 border-black bg-green-soft">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-8 lg:py-28">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-green px-2 py-1 text-white">{h.faqEyebrow}</span>
          </p>
          <h2 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
            {h.faqTitle}
          </h2>
          <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-muted">
            {h.faqSub}
          </p>
          <div className="mt-10">
            <Faq items={h.faqItems} />
          </div>
        </div>
      </section>

      {/* 9. CTA — hitam */}
      <section className="bg-dark text-ondark">
        <Reveal className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-ondark sm:text-[44px]">
              {h.ctaTitle}
            </h2>
            <p className="mt-3 max-w-[520px] text-[16px] leading-[1.6] text-ondark-muted">
              {h.ctaSub}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="btn-press shadow-green border-2 border-black bg-yellow px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
            >
              {h.ctaStart}
            </Link>
            <Link
              href="/chat"
              className="btn-press shadow-yellow border-2 border-white bg-dark px-6 py-3 text-[15px] font-bold text-ondark shadow-brutal-sm"
            >
              {h.ctaChat}
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
