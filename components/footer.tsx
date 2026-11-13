/** Footer cream — brand, link produk/resource, catatan privasi. */

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-dark font-mono text-[13px] font-bold text-white">
              {"<>"}
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-text">
              Hymn Router
            </span>
          </div>
          <p className="mt-4 max-w-[260px] text-[14px] leading-relaxed text-muted">
            Satu endpoint untuk semua model AI gratis. Login dengan Google,
            buat API key, tembak dari kode apa pun.
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Produk
          </p>
          <ul className="mt-4 space-y-2.5 text-[14px] text-muted">
            <li>
              <Link href="/#provider" className="hover:text-text">
                Provider
              </Link>
            </li>
            <li>
              <Link href="/chat" className="hover:text-text">
                Chat
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-text">
                API Docs
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-text">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Resource
          </p>
          <ul className="mt-4 space-y-2.5 text-[14px] text-muted">
            <li>
              <a
                href="https://github.com/hymndavinci/hymn-router"
                target="_blank"
                rel="noreferrer"
                className="hover:text-text"
              >
                GitHub ↗
              </a>
            </li>
            <li>
              <a
                href="https://github.com/hymndavinci/hymn-router#readme"
                target="_blank"
                rel="noreferrer"
                className="hover:text-text"
              >
                README ↗
              </a>
            </li>
            <li>
              <Link href="/api/v1/models" className="hover:text-text">
                /api/v1/models
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Privasi
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-muted">
            Prompt dan isi response tidak disimpan. Yang dicatat hanya jumlah
            request, token, dan provider — untuk dashboard pemakaian lu.
            Free tier berubah-ubah; jangan kirim data sensitif lewat
            endpoint gratis.
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-2 px-6 py-5 lg:px-8">
          <p className="font-mono text-[12px] text-faint">© 2026 Hymn Router</p>
          <p className="font-mono text-[12px] text-faint">
            9 provider gratis · 1 endpoint · Rp 0
          </p>
        </div>
      </div>
    </footer>
  );
}
