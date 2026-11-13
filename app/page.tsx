/**
 * Landing page Hymn Router — NEO-BRUTALISM (kuning / putih / hijau / biru).
 * Blok warna berani bergantian: putih, kuning lembut, hitam, putih, biru,
 * hijau lembut, hitam. Border hitam tebal, hard shadow, sudut tajam.
 */

import Link from "next/link";
import { getProviderStatus } from "@/lib/free-ai-router";
import { getBaseUrl } from "@/lib/site-url";
import Navbar from "@/components/navbar";
import GlobeArt from "@/components/globe-art";
import CodeWindow from "@/components/code-window";
import Faq, { type FaqItem } from "@/components/faq";
import ProviderSection from "@/components/provider-section";

export const dynamic = "force-dynamic";

const STATS = [
  { value: "9", label: "provider, satu endpoint" },
  { value: "4", label: "tanpa API key" },
  { value: "Rp 0", label: "tanpa kartu kredit" },
  { value: "1", label: "endpoint OpenAI-compatible" },
];

const STEPS = [
  {
    n: "01",
    title: "Login dengan Google",
    body: "Satu klik, tanpa password baru. Akun dipakai untuk dashboard dan API key lu.",
  },
  {
    n: "02",
    title: "Buat API key di dashboard",
    body: "Key diawali hr_, bisa dibuat banyak, dan bisa di-revoke kapan saja.",
  },
  {
    n: "03",
    title: "Arahkan client ke gateway",
    body: "Set base URL ke /api/v1 dan pakai model hymn/auto — atau pilih provider tertentu.",
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Apa itu Hymn Router?",
    a: "Gateway AI OpenAI-compatible yang merutekan request lu ke 9 endpoint LLM gratis (Groq, NVIDIA, Gemini, OpenRouter, Mistral, Kilo, LLM7, Pollinations, OVH) lewat satu endpoint. Kalau satu provider gagal atau kena limit, router otomatis fallback ke provider berikutnya.",
  },
  {
    q: "Apakah benar-benar gratis?",
    a: "Ya. Semua provider yang dipakai adalah tier gratis mereka — tanpa kartu kredit, tanpa saldo, tanpa langganan. Limitnya mengikuti limit gratis tiap provider (mis. Groq 1.000 req/hari, OpenRouter 50 req/hari).",
  },
  {
    q: "Perlu API key provider?",
    a: "Tidak, untuk mulai. Empat provider (Kilo, LLM7, Pollinations, OVH) bisa dipakai tanpa key sama sekali. Yang lu butuhkan hanya API key Hymn Router (diawali hr_) yang dibuat di dashboard setelah login Google — itu key untuk gateway ini, bukan key provider.",
  },
  {
    q: "Bagaimana cara pakai di kode?",
    a: "Arahkan base URL client OpenAI lu ke /api/v1, isi API key dari dashboard, dan pakai model \"hymn/auto\". SDK OpenAI, cURL, dan fetch biasa semuanya jalan — contoh lengkap ada di dokumentasi.",
  },
  {
    q: "Apakah prompt saya disimpan?",
    a: "Tidak. Prompt dan isi response tidak pernah disimpan di server ini. Yang dicatat hanya jumlah request, token, provider, dan latensi — untuk dashboard pemakaian lu. Catatan jujur: request tetap diteruskan ke provider gratis pihak ketiga, dan beberapa provider bisa me-log prompt sesuai kebijakannya sendiri. Jangan kirim data sensitif.",
  },
  {
    q: "Kenapa kadang lambat / gagal?",
    a: "Provider gratis punya limit dan kadang sibuk. Router otomatis mencoba provider berikutnya kalau satu gagal; provider yang kena 429/5xx masuk cooldown 60 detik. OVH dikenal lambat (sekitar 15 detik). Kalau semua provider gagal, responsnya 502 beserta alasan tiap provider supaya gampang di-debug.",
  },
  {
    q: "Limit-nya berapa?",
    a: "Anonim (playground dan /api/ai/chat tanpa key): 20 request/menit per IP. Pakai API key: 60 request/menit per key. Di atas itu, limit gratis tiap provider tetap berlaku.",
  },
];

export default async function Home() {
  const providers = getProviderStatus();
  const baseUrl = await getBaseUrl();
  const configured = providers.filter((p) => p.configured).length;

  return (
    <div className="flex-1">
      {/* 1. Announcement bar — kuning */}
      <div className="border-b-2 border-black bg-yellow">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-2.5 text-center lg:px-8">
          <span className="text-[13px] font-bold text-black">
            100% gratis — 9 provider, tanpa kartu kredit
          </span>
          <Link
            href="#provider"
            className="font-mono text-[12px] font-bold text-black underline underline-offset-4 hover:text-blue"
          >
            Lihat provider →
          </Link>
        </div>
      </div>

      <Navbar />

      {/* 3. Hero — putih */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <span className="bg-yellow px-2 py-1">
                AI Router · Gratis · OpenAI-Compatible
              </span>
            </p>
            <h1 className="mt-5 text-[44px] font-black leading-[1.05] tracking-[-0.02em] text-black sm:text-[56px] lg:text-[64px]">
              Satu endpoint untuk semua model AI gratis.
            </h1>
            <p className="mt-6 max-w-[520px] text-[16px] leading-[1.6] text-muted">
              Sembilan provider LLM gratis di balik satu API. Login dengan
              Google, buat API key, dan tembak dari kode lu — tanpa kartu
              kredit, tanpa saldo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/api/auth/google"
                className="btn-press border-2 border-black bg-yellow px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
              >
                Mulai sekarang
              </Link>
              <Link
                href="/chat"
                className="btn-press border-2 border-black bg-white px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
              >
                Coba chat
              </Link>
              <Link
                href="/docs"
                className="px-2 py-3 font-mono text-[13px] font-bold text-blue underline underline-offset-4 hover:text-black"
              >
                Dokumentasi →
              </Link>
            </div>
            <p className="mt-6 font-mono text-[12px] text-faint">
              {configured}/{providers.length} provider aktif saat ini · tanpa
              key pun langsung jalan
            </p>
          </div>
          <div className="hidden min-w-0 lg:block">
            <GlobeArt />
          </div>
        </div>

        {/* Stats row */}
        <div className="border-t-2 border-black">
          <div className="mx-auto grid w-full max-w-[1280px] grid-cols-2 px-6 sm:grid-cols-4 sm:divide-x-2 sm:divide-black lg:px-8">
            {STATS.map((s) => (
              <div key={s.label} className="px-1 py-7 sm:px-6 sm:first:pl-0">
                <p className="text-[32px] font-black leading-none tracking-tight text-black">
                  {s.value}
                </p>
                <p className="mt-2 text-[13px] font-medium leading-snug text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Provider — kuning lembut */}
      <section id="provider" className="scroll-mt-16 border-b-2 border-black bg-yellow-soft">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-8 lg:py-28">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-yellow px-2 py-1">Provider</span>
          </p>
          <h2 className="mt-4 max-w-[640px] text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
            Sembilan provider. Satu endpoint.
          </h2>
          <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-muted">
            Status live dari server — urutan kartu adalah urutan fallback
            (atas dicoba duluan). Empat provider jalan tanpa API key.
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
              Cara Pakai
            </p>
            <h2 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-ondark sm:text-[44px]">
              Ganti base URL. Kode tetap jalan.
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6] text-ondark-muted">
              Gateway memakai format OpenAI API, jadi SDK dan tools yang sudah
              lu pakai tetap jalan — yang berubah hanya base URL dan API key.
            </p>
            <ol className="mt-10 space-y-8">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-5">
                  <span className="font-mono text-[13px] font-bold text-yellow">
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-bold text-ondark">{s.title}</h3>
                    <p className="mt-1 max-w-[440px] text-[15px] leading-relaxed text-ondark-muted">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ondark-muted">
                Bisa dipakai di
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
          <div className="min-w-0 lg:pt-24">
            <CodeWindow baseUrl={baseUrl} />
            <p className="mt-4 font-mono text-[12px] leading-relaxed text-ondark-muted">
              Simpan API key di environment variable. Streaming belum didukung
              — respons dikirim sekaligus.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Dashboard — putih */}
      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-12 px-6 py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <span className="bg-green px-2 py-1 text-white">Dashboard</span>
            </p>
            <h2 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
              Semua pemakaian lu, dalam satu dashboard.
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.6] text-muted">
              Setelah login, semua request lewat API key lu tercatat dan bisa
              dipantau — tanpa setup apa pun.
            </p>
            <ul className="mt-10 space-y-8">
              {[
                {
                  title: "Pantau request & token per provider",
                  body: "Jumlah request dan token 7 hari terakhir, dirinci per provider yang benar-benar menjawab.",
                },
                {
                  title: "API key sendiri, bisa revoke",
                  body: "Buat key per proyek atau per perangkat. Key yang bocor tinggal di-revoke — yang lain tetap jalan.",
                },
                {
                  title: "Limit per key",
                  body: "60 request/menit per API key, terpisah dari limit anonim 20 request/menit per IP.",
                },
              ].map((f) => (
                <li key={f.title} className="border-t-2 border-black pt-6">
                  <h3 className="text-[18px] font-bold text-black">{f.title}</h3>
                  <p className="mt-1 max-w-[480px] text-[15px] leading-relaxed text-muted">
                    {f.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Mock dashboard statis */}
          <div className="min-w-0 lg:pt-24">
            <div className="overflow-hidden border-2 border-black bg-white shadow-brutal">
              <div className="flex items-center justify-between border-b-2 border-black px-5 py-3.5">
                <span className="font-mono text-[12px] font-bold text-muted">
                  dashboard / pemakaian
                </span>
                <span className="border-2 border-black bg-green px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                  ● 4/9 provider aktif
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
                {[
                  { v: "1.284", l: "request · 7 hari" },
                  { v: "96,4K", l: "token" },
                  { v: "3", l: "API key aktif" },
                ].map((s) => (
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
                <span className="shrink-0 font-mono text-[11px] font-bold text-green">aktif</span>
              </div>
            </div>
            <p className="mt-3 font-mono text-[12px] text-faint">
              Ilustrasi dashboard. Nama dan angka hanya contoh.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Kenapa — biru */}
      <section className="bg-blue text-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-yellow">
            Kenapa Hymn Router
          </p>
          <h2 className="mt-4 max-w-[720px] text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-white sm:text-[44px]">
            Semua model gratis, dalam satu akun.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                big: "9",
                title: "provider",
                body: "Satu endpoint untuk semuanya. Fallback otomatis kalau satu provider gagal atau kena limit.",
              },
              {
                big: "Rp 0",
                title: "tanpa kartu kredit",
                body: "Tidak ada saldo, tidak ada langganan, tidak ada tagihan kejutan. Gratis berarti gratis.",
              },
              {
                big: "4",
                title: "keyless",
                body: "Kilo, LLM7, Pollinations, dan OVH langsung jalan tanpa API key provider apa pun.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="border-2 border-black bg-white p-6 shadow-brutal"
              >
                <p className="text-[48px] font-black leading-none tracking-tight text-black">
                  {c.big}
                </p>
                <h3 className="mt-3 text-[18px] font-bold text-black">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 max-w-[720px] text-[15px] leading-relaxed text-white/90">
            Soal privasi: prompt dan response tidak pernah disimpan di server
            ini. Yang dicatat hanya jumlah request, token, dan provider —
            untuk dashboard lu sendiri. Request tetap diteruskan ke provider
            gratis pihak ketiga, jadi jangan kirim data sensitif.
          </p>
        </div>
      </section>

      {/* 8. FAQ — hijau lembut */}
      <section id="faq" className="scroll-mt-16 border-b-2 border-black bg-green-soft">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 lg:px-8 lg:py-28">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <span className="bg-green px-2 py-1 text-white">FAQ</span>
          </p>
          <h2 className="mt-4 text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-black sm:text-[44px]">
            Pertanyaan yang sering muncul.
          </h2>
          <p className="mt-4 max-w-[640px] text-[16px] leading-[1.6] text-muted">
            Gratis, limit, privasi, dan cara pakai. Detail lain ada di
            dokumentasi.
          </p>
          <div className="mt-10">
            <Faq items={FAQ_ITEMS} />
          </div>
        </div>
      </section>

      {/* 9. CTA — hitam */}
      <section className="bg-dark text-ondark">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-[36px] font-black leading-[1.1] tracking-[-0.01em] text-ondark sm:text-[44px]">
              Mulai pakai hari ini.
            </h2>
            <p className="mt-3 max-w-[520px] text-[16px] leading-[1.6] text-ondark-muted">
              Login dengan Google, buat API key pertama lu, dan tembak
              request pertama dalam waktu kurang dari semenit.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/api/auth/google"
              className="btn-press shadow-green border-2 border-black bg-yellow px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
            >
              Login dengan Google
            </Link>
            <Link
              href="/chat"
              className="btn-press shadow-yellow border-2 border-white bg-dark px-6 py-3 text-[15px] font-bold text-ondark shadow-brutal-sm"
            >
              Coba chat dulu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
