/**
 * /dashboard — login wajib (redirect ke / kalau belum login).
 * Server component: ambil user, API key, dan ringkasan usage dari DB,
 * lalu render DashboardClient untuk interaksi (buat/revoke key).
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listApiKeys } from "@/lib/api-keys";
import { getUsageSummary } from "@/lib/usage";
import { getBaseUrl } from "@/lib/site-url";
import Navbar from "@/components/navbar";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

function DbErrorView() {
  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-text">
          Database sedang bermasalah
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          Dashboard tidak bisa memuat datamu saat ini — kemungkinan koneksi ke
          database sedang gagal sesaat. Coba muat ulang halaman ini sebentar
          lagi; session login-mu tidak hilang.
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // getSessionUser melempar kalau query DB gagal — itu BUKAN "belum login",
  // jadi jangan redirect ke /; tampilkan pesan database error.
  const user = await getSessionUser().catch((err) => {
    console.error("[dashboard] gagal membaca session:", err);
    return "DB_ERROR" as const;
  });
  if (user === "DB_ERROR") return <DbErrorView />;
  if (!user) redirect("/");

  const data = await Promise.all([
    listApiKeys(user.id),
    getUsageSummary(user.id, 7),
    getBaseUrl(),
  ]).catch((err) => {
    console.error("[dashboard] gagal memuat data:", err);
    return null;
  });
  if (!data) return <DbErrorView />;
  const [keys, usage, baseUrl] = data;

  return (
    <div className="flex-1">
      <Navbar />
      <DashboardClient
        user={user}
        initialKeys={keys}
        initialUsage={usage}
        baseUrl={baseUrl}
      />
    </div>
  );
}
