/**
 * /auth/error — halaman pesan jelas saat login Google gagal.
 * reason dikirim dari callback route; tidak pernah menampilkan stack trace.
 */

import Link from "next/link";
import Navbar from "@/components/navbar";

const MESSAGES: Record<string, { title: string; body: string }> = {
  denied: {
    title: "Login dibatalkan",
    body: "Lu menolak izin di halaman Google. Tidak ada data yang disimpan — coba lagi kalau mau lanjut.",
  },
  missing_code: {
    title: "Kode login tidak ada",
    body: "Google tidak mengirim kode otorisasi. Coba login lagi dari awal.",
  },
  bad_state: {
    title: "Sesi login tidak valid",
    body: "State keamanan tidak cocok — mungkin halaman login sudah terlalu lama dibuka. Coba lagi.",
  },
  not_configured: {
    title: "Google login belum dikonfigurasi",
    body: "Server belum diisi GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Pemilik web perlu mengikuti docs/setup.md dulu.",
  },
  no_session_secret: {
    title: "SESSION_SECRET belum dikonfigurasi",
    body: "Server belum diisi SESSION_SECRET (min 32 karakter acak). Pemilik web perlu mengikuti docs/setup.md dulu.",
  },
  no_database: {
    title: "Database belum dikonfigurasi",
    body: "Server belum diisi DATABASE_URL. Login butuh database untuk menyimpan akun — pemilik web perlu mengikuti docs/setup.md dulu.",
  },
  token_exchange_failed: {
    title: "Gagal menukar kode login",
    body: "Google menolak kode otorisasi — mungkin sudah dipakai atau kadaluarsa. Coba login lagi.",
  },
  no_id_token: {
    title: "Google tidak mengirim id_token",
    body: "Respons Google tidak lengkap. Coba login lagi.",
  },
  tokeninfo_failed: {
    title: "Gagal memverifikasi token Google",
    body: "Token dari Google tidak bisa diverifikasi. Coba login lagi.",
  },
  bad_audience: {
    title: "Token Google bukan untuk aplikasi ini",
    body: "Audience id_token tidak cocok dengan GOOGLE_CLIENT_ID server. Cek konfigurasi OAuth client.",
  },
  bad_token: {
    title: "Token Google tidak lengkap",
    body: "Token tidak berisi sub/email. Coba login lagi.",
  },
  token_expired: {
    title: "Token Google sudah kadaluarsa",
    body: "Coba login lagi.",
  },
  db_error: {
    title: "Gagal menyimpan akun",
    body: "Database menolak menyimpan akun lu — mungkin migrasi belum dijalankan (npm run migrate). Coba lagi nanti.",
  },
  unknown: {
    title: "Login gagal",
    body: "Terjadi kesalahan yang tidak terduga saat login. Coba lagi.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const msg = MESSAGES[reason ?? ""] ?? MESSAGES.unknown;

  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[640px] px-6 py-20">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-yellow px-2 py-1">Login Google</span>
        </p>
        <h1 className="mt-4 text-[32px] font-black leading-tight tracking-tight text-black">
          {msg.title}
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">{msg.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/api/auth/google"
            className="btn-press border-2 border-black bg-yellow px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
          >
            Coba login lagi
          </Link>
          <Link
            href="/"
            className="btn-press border-2 border-black bg-white px-6 py-3 text-[15px] font-bold text-black shadow-brutal-sm"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
