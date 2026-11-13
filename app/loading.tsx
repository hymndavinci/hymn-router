/**
 * app/loading.tsx — skeleton instan saat navigasi antar halaman.
 *
 * Next.js menampilkan file ini seketika saat route baru mulai dimuat,
 * jadi klik link nav langsung memberi feedback (bukan diam menunggu
 * server). Server component: teks mengikuti locale dari cookie.
 */

import { dict, getLocale } from "@/lib/i18n";

export default async function Loading() {
  const t = dict[await getLocale()];
  return (
    <div className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-16 lg:px-8">
      <div className="border-2 border-black bg-white p-6 shadow-brutal-sm">
        <p className="font-mono text-[13px] font-bold text-black">
          {t.common.loading}
        </p>
        <div className="mt-4 h-4 overflow-hidden border-2 border-black bg-white">
          <div className="loading-bar h-full w-1/3 bg-yellow" />
        </div>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <div className="h-8 w-2/3 border-2 border-black bg-neutral-200" />
          <div className="h-4 w-full border-2 border-black bg-neutral-200" />
          <div className="h-4 w-5/6 border-2 border-black bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
