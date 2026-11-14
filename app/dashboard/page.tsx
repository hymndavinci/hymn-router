/**
 * /dashboard — login wajib (redirect ke /login?next=/dashboard kalau belum login).
 * Server component: ambil user, API key, dan ringkasan usage dari DB,
 * lalu render DashboardClient untuk interaksi (buat/revoke key).
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listApiKeys } from "@/lib/api-keys";
import {
  getDailyUsage,
  getKeyBreakdown,
  getModelBreakdown,
  getRecentRequests,
  getTodayQuota,
  getUsageSummary,
} from "@/lib/usage";
import { getBaseUrl } from "@/lib/site-url";
import { dict, getLocale } from "@/lib/i18n";
import Navbar from "@/components/navbar";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

async function DbErrorView() {
  const t = dict[await getLocale()];
  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-8">
        <h1 className="text-[28px] font-black leading-tight tracking-tight text-black">
          {t.dashboard.dbErrorTitle}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          {t.dashboard.dbErrorBody}
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; tab?: string }>;
}) {
  const params = await searchParams;
  // Rentang aktivitas: 7 atau 30 hari (default 30, seperti "Past 1 Month").
  const days = params.days === "7" ? 7 : 30;
  const tab: "overview" | "trends" | "explore" =
    params.tab === "trends"
      ? "trends"
      : params.tab === "explore"
        ? "explore"
        : "overview";

  // getSessionUser melempar kalau query DB gagal — itu BUKAN "belum login",
  // jadi jangan redirect ke /; tampilkan pesan database error.
  const user = await getSessionUser().catch((err) => {
    console.error("[dashboard] gagal membaca session:", err);
    return "DB_ERROR" as const;
  });
  if (user === "DB_ERROR") return <DbErrorView />;
  if (!user) redirect("/login?next=/dashboard");

  // Metode login user ("Google" / "GitHub" / "Email") dari kolom akun.
  // Kolom github_id/password_hash baru ada di migrasi 002 — kalau migrasi
  // belum dijalankan, query ini gagal dan baris metode disembunyikan,
  // dashboard tetap jalan normal.
  const loginMethods = await (async (): Promise<string[] | null> => {
    const db = getDb();
    if (!db) return null;
    try {
      const rows = (await db`
        SELECT google_sub, github_id, password_hash IS NOT NULL AS has_password
        FROM users WHERE id = ${user.id} LIMIT 1
      `) as {
        google_sub: string | null;
        github_id: string | null;
        has_password: boolean;
      }[];
      if (rows.length === 0) return null;
      const methods: string[] = [];
      if (rows[0].google_sub) methods.push("Google");
      if (rows[0].github_id) methods.push("GitHub");
      if (rows[0].has_password) methods.push("Email");
      return methods;
    } catch {
      return null;
    }
  })();

  const data = await Promise.all([
    listApiKeys(user.id),
    getUsageSummary(user.id, days),
    getModelBreakdown(user.id, days),
    getDailyUsage(user.id, days),
    getRecentRequests(user.id, 15),
    getKeyBreakdown(user.id, days),
    getTodayQuota(user.id),
    getBaseUrl(),
  ]).catch((err) => {
    console.error("[dashboard] gagal memuat data:", err);
    return null;
  });
  if (!data) return <DbErrorView />;
  const [keys, usage, modelUsage, dailyUsage, recent, keyUsage, quota, baseUrl] =
    data;

  return (
    <div className="flex-1">
      <Navbar />
      <DashboardClient
        user={user}
        loginMethods={loginMethods}
        initialKeys={keys}
        initialUsage={usage}
        initialModelUsage={modelUsage}
        initialDailyUsage={dailyUsage}
        initialRecent={recent}
        initialKeyUsage={keyUsage}
        initialQuota={quota}
        baseUrl={baseUrl}
        days={days}
        tab={tab}
      />
    </div>
  );
}
