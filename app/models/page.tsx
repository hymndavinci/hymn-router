import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ModelCatalog, { type RouterModelInfo } from "@/components/model-catalog";
import { getProviders, getProviderStatus } from "@/lib/free-ai-router";
import { findContextLength, getOpenRouterCatalog } from "@/lib/openrouter-catalog";
import { dict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n-utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLocale()];
  return {
    title: t.meta.modelsTitle,
    description: fill(t.meta.modelsDescription, { total: getProviders().length }),
  };
}

// Katalog OpenRouter di-cache 1 jam di lib; halaman ini dinamis supaya
// status provider (configured) selalu dari env saat ini.
export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const t = dict[await getLocale()];
  const [status, catalog] = await Promise.all([
    Promise.resolve(getProviderStatus()),
    getOpenRouterCatalog(),
  ]);
  const providers = getProviders();

  // Gabungkan provider yang memakai model id yang sama (gpt-oss-20b).
  const byModel = new Map<string, RouterModelInfo>();
  for (const p of providers) {
    const s = status.find((x) => x.id === p.id);
    const configured = s?.configured ?? (!p.needsKey || !!p.apiKey);
    const existing = byModel.get(p.model);
    if (existing) {
      existing.providers.push(p.id);
      existing.configured = existing.configured || configured;
      existing.needsKey = existing.needsKey && p.needsKey;
      continue;
    }
    byModel.set(p.model, {
      id: p.model,
      provider: p.id,
      providers: [p.id],
      configured,
      needsKey: p.needsKey,
      freeTier: p.notes,
      contextLength: findContextLength(catalog, p.model),
    });
  }
  const routerModels = [...byModel.values()];
  const openRouterConfigured =
    status.find((x) => x.id === "openrouter")?.configured ?? false;

  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-yellow px-2 py-1">{t.models.badge}</span>
        </p>
        <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight text-black">
          {t.models.title}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          {t.models.introA}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">model</code>{" "}
          {t.models.introB}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">/api/v1/chat/completions</code>
          {t.models.introC}
        </p>
        <div className="mt-8">
          <ModelCatalog
            routerModels={routerModels}
            freeModels={catalog.freeModels}
            catalogOk={catalog.ok}
            openRouterConfigured={openRouterConfigured}
            providerCount={providers.length}
          />
        </div>
      </div>
    </div>
  );
}
