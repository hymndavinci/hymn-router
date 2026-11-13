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

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const [keys, usage, baseUrl] = await Promise.all([
    listApiKeys(user.id),
    getUsageSummary(user.id, 7),
    getBaseUrl(),
  ]);

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
