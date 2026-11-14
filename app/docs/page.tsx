import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ApiDocs from "@/components/api-docs";
import { dict, getLocale } from "@/lib/i18n";
import { getProviders } from "@/lib/free-ai-router";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLocale()];
  return { title: t.meta.docsTitle, description: t.meta.docsDescription };
}

export default async function DocsPage() {
  const t = dict[await getLocale()];
  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-yellow px-2 py-1">{t.docs.badge}</span>
        </p>
        <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight text-black">
          {t.docs.title}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          {t.docs.introA}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">/api/v1</code>{" "}
          {t.docs.introB}{" "}
          <code className="bg-yellow-soft px-1 font-mono text-[13px] font-bold text-black">/api/ai/chat</code>{" "}
          {t.docs.introC}
        </p>
        <div className="mt-8">
          <ApiDocs providerCount={getProviders().length} />
        </div>
      </div>
    </div>
  );
}
