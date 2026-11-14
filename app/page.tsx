/**
 * Landing page Hymn Router — NEO-BRUTALISM (kuning / putih / hijau / biru).
 * Blok warna berani bergantian: putih, kuning lembut, hitam, putih, biru,
 * hijau lembut, hitam. Border hitam tebal, hard shadow, sudut tajam.
 *
 * Layout padat: padding section 56–64px, kartu rapat, satu alur
 * "3 langkah" saja (Quick Start) — bagian Cara Pakai hanya berisi
 * contoh kode + kompatibilitas, tanpa mengulang langkah yang sama.
 * Mock dasbor memakai agregat LIVE 24 jam dari tabel usage (bukan
 * angka contoh); bila DB tidak tersedia, tampil "—" / "belum ada data".
 */

import Link from "next/link";
import { getProviderStatus } from "@/lib/free-ai-router";
import { getGlobalStats24h } from "@/lib/usage";
import { getBaseUrl } from "@/lib/site-url";
import { dict, getLocale } from "@/lib/i18n";
import { dateLocaleOf, fill } from "@/lib/i18n-utils";
import Navbar from "@/components/navbar";
import GlobeArt from "@/components/globe-art";
import CodeWindow from "@/components/code-window";
import Faq from "@/components/faq";
import ProviderSection from "@/components/provider-section";
import Reveal from "@/components/reveal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const t = dict[locale];
  const h = t.home;
  const providers = getProviderStatus();
  const baseUrl = await getBaseUrl();
  const configured = providers.filter((p) => p.configured).length;
  const keyless = providers.filter((p) => !p.needsKey).length;
  const stats24h = await getGlobalStats24h();
  const numLocale = dateLocaleOf(locale);
  const compactFmt = new Intl.NumberFormat(numLocale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const timeFmt = new Intl.DateTimeFormat(numLocale, {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const topMax = stats24h?.topProviders[0]?.requests ?? 0;

  return (
    <div className="flex-1">
      {/* 1. Announcement bar — kuning. Satu baris teks (teks + link
          mengalir bersama) supaya tetap di tengah di semua lebar. */}
      <div className="border-b-2 border-black bg-yellow">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-1 text-center lg:px-8">
          <p className="text-[13px] font-bold text-black">
            {fill(h.announcement, { total: providers.length })}{" "}
            <Link
              href="#provider"
              className="inline-flex min-h-[44px] items-center font-mono text-[12px] font-bold text-black underline underline-offset-4 hover:text-blue"
            >
              {h.announcementLink}
            </Link>
          </p>
        </div>
      </div>

      <Navbar />

      {/* 3. Hero — putih */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-6 py-12 sm:py-14 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <span className="bg-yellow px-2 py-1">{h.heroBadge}</span>
            </p>
            <h1 className="mt-4 text-balance text-[40px] font-black leading-[1.05] tracking-[-0.02em] text-black sm:text-[52px] lg:text-[60px]">
              {h.heroTitle}
            </h1>
            <p className="mt-4 max-w-[520px] text-pretty text-[16px] leading-[1.6] text-muted">
              {fill(h.heroSub, { total: providers.length })}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
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
                className="inline-flex min-h-[44px] items-center font-mono text-[13px] font-bold text-blue underline underline-offset-4 hover:text-black"
              >
                {h.ctaDocs}
              </Link>
            </div>
            <p className="mt-5 font-mono text-[12px] text-faint">
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
              <div key={s.label} className="px-1 py-5 sm:px-6 sm:first:pl-0">
                <p className="text-[28px] font-black leading-none tracking-tight text-black sm:text-[32px]">
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
        <div className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-8 lg:py-14">
          <h2 className="max-w-[640px] text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[40px]">
            {h.quickstartTitle}
          </h2>
          <p className="mt-3 max-w-[640px] text-[16px] leading-[1.6] text-black/70">
            {h.quickstartSub}
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {h.quickstartSteps.map((s, i) => {
              const hrefs = ["/login", "/dashboard", "/chat"];
              return (
                <Reveal key={s.n} delay={Math.min(i * 50, 150)}>
                  <div className="flex h-full min-w-0 flex-col border-2 border-black bg-white p-5 shadow-brutal">
                    <p className="text-[40px] font-black leading-none tracking-tight text-black">
                      {s.n}
                    </p>
                    <h3 className="mt-3 text-[18px] font-bold text-black">{s.title}</h3>
                    <p className="mt-2 flex-1 text-[16px] leading-relaxed text-muted">{s.body}</p>
                    <Link
                      href={hrefs[i] ?? "/"}
                      className="btn-press mt-4 inline-block self-start whitespace-nowrap border-2 border-black bg-yellow px-5 py-2.5 text-[14px] font-bold text-black shadow-brutal-sm"
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
        <div className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:px-8 lg:py-16">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-yellow px-2 py-1">{h.providersEyebrow}</span>
          </p>
          <h2 className="mt-3 max-w-[640px] text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[40px]">
            {fill(h.providersTitle, { total: providers.length })}
          </h2>
          <p className="mt-3 max-w-[640px] text-[16px] leading-[1.6] text-muted">
            {fill(h.providersSub, { keyless })}
          </p>
          <div className="mt-8">
            <ProviderSection initial={providers} />
          </div>
        </div>
      </section>

      {/* 5. Cara pakai — hitam. Hanya contoh kode + kompatibilitas;
          langkah-langkahnya sudah ada di Quick Start di atas. */}
      <section id="cara-pakai" className="scroll-mt-16 bg-dark text-ondark">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-14 lg:grid-cols-2 lg:px-8 lg:py-16">
          {/* min-w-0: item grid default min-width:auto — tanpa ini, baris
              <pre> terpanjang di CodeWindow memaksa kolom grid melebar
              keluar viewport di mobile dan teks putih keluar dari area
              gelap. */}
          <div className="min-w-0">
            <h2 className="text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-ondark sm:text-[40px]">
              {h.howtoTitle}
            </h2>
            <p className="mt-3 max-w-[520px] text-[16px] leading-[1.6] text-ondark-muted">
              {h.howtoSub}
            </p>
            <div className="mt-8">
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
          <Reveal className="min-w-0">
            <CodeWindow baseUrl={baseUrl} />
            <p className="mt-4 font-mono text-[12px] leading-relaxed text-ondark-muted">
              {h.codeNote}
            </p>
          </Reveal>
        </div>
      </section>

      {/* 6. Dashboard — putih */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-14 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div className="min-w-0">
            <h2 className="text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[40px]">
              {h.dashboardTitle}
            </h2>
            <p className="mt-3 max-w-[520px] text-[16px] leading-[1.6] text-muted">
              {h.dashboardSub}
            </p>
            <ul className="mt-8 space-y-6">
              {h.dashboardFeatures.map((f, i) => (
                <Reveal as="li" key={f.title} delay={Math.min(i * 50, 150)} className="border-t-2 border-black pt-4">
                  <h3 className="text-[18px] font-bold text-black">{f.title}</h3>
                  <p className="mt-1 max-w-[480px] text-[16px] leading-relaxed text-muted">
                    {f.body}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Dasbor live: agregat nyata 24 jam terakhir (semua user).
              Bila DB tidak tersedia / belum ada data, tampil "—" dan
              teks "belum ada data" — bukan angka contoh. */}
          <Reveal className="min-w-0">
            <div className="overflow-hidden border-2 border-black bg-white shadow-brutal">
              <div className="flex items-center justify-between border-b-2 border-black px-5 py-3.5">
                <span className="font-mono text-[12px] font-bold text-muted">
                  {h.mockLabel}
                </span>
                <span className="border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-black">
                  {fill(h.mockActive, { configured, total: providers.length })}
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
                <div className="px-4 py-4">
                  <p className="text-[22px] font-black leading-none tracking-tight text-black">
                    {stats24h === null
                      ? "—"
                      : stats24h.requests.toLocaleString(numLocale)}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-faint">{h.mockRequests24h}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[22px] font-black leading-none tracking-tight text-black">
                    {stats24h === null ? "—" : compactFmt.format(stats24h.tokens)}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-faint">{h.mockTokens24h}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[22px] font-black leading-none tracking-tight text-black">
                    {stats24h === null || stats24h.avgLatencyMs === null
                      ? "—"
                      : `${stats24h.avgLatencyMs.toLocaleString(numLocale)} ms`}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-faint">{h.mockLatency24h}</p>
                </div>
              </div>
              <div className="space-y-2 px-5 py-4">
                {stats24h === null || stats24h.topProviders.length === 0 ? (
                  <p className="font-mono text-[12px] text-faint">{h.mockNoData}</p>
                ) : (
                  stats24h.topProviders.map((r) => (
                    <div key={r.provider} className="flex items-center gap-3">
                      <span className="w-20 truncate font-mono text-[12px] font-bold text-muted" title={r.provider}>
                        {r.provider}
                      </span>
                      <div className="h-2.5 flex-1 border border-black bg-neutral-200">
                        <div
                          className="h-full bg-blue"
                          style={{ width: `${topMax > 0 ? Math.round((r.requests / topMax) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[12px] text-muted">
                        {r.requests.toLocaleString(numLocale)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t-2 border-black px-5 py-3.5">
                <span className="min-w-0 truncate font-mono text-[12px] text-muted">
                  {stats24h === null || stats24h.lastRequestAt === null
                    ? h.mockNoData
                    : fill(h.mockLastRequest, {
                        time: timeFmt.format(new Date(stats24h.lastRequestAt)),
                      })}
                </span>
                <span className="shrink-0 font-mono text-[11px] font-bold text-green-dark">
                  ● live
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. Kenapa — biru */}
      <section className="bg-blue text-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:px-8 lg:py-16">
          <h2 className="max-w-[720px] text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-white sm:text-[40px]">
            {h.whyTitle}
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {h.whyCards.map((c, i) => (
              <Reveal key={c.title} delay={Math.min(i * 50, 150)}>
                <div className="h-full border-2 border-black bg-white p-5 shadow-brutal">
                  <p className="text-[40px] font-black leading-none tracking-tight text-black">
                    {fill(c.big, { total: providers.length, keyless })}
                  </p>
                  <h3 className="mt-3 text-[18px] font-bold text-black">{c.title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-muted">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 max-w-[720px] text-pretty text-[15px] leading-relaxed text-white/90">
            {h.whyPrivacy}
          </p>
        </div>
      </section>

      {/* 8. FAQ — hijau lembut */}
      <section id="faq" className="scroll-mt-16 border-b-2 border-black bg-green-soft">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:px-8 lg:py-16">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-green px-2 py-1 text-black">{h.faqEyebrow}</span>
          </p>
          <h2 className="mt-3 text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[40px]">
            {h.faqTitle}
          </h2>
          <p className="mt-3 max-w-[640px] text-[16px] leading-[1.6] text-muted">
            {h.faqSub}
          </p>
          <div className="mt-8">
            <Faq items={h.faqItems} />
          </div>
        </div>
      </section>

      {/* 9. CTA — hitam */}
      <section className="bg-dark text-ondark">
        <Reveal className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-5 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-balance text-[32px] font-black leading-[1.1] tracking-[-0.01em] text-ondark sm:text-[40px]">
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
