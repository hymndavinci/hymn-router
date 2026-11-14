import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ImagePlayground from "@/components/image-playground";
import { dict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLocale()];
  return { title: t.meta.imagesTitle, description: t.meta.imagesDescription };
}

export default async function ImagesPage() {
  const t = dict[await getLocale()];
  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black">
          <span className="bg-blue px-2 py-1 text-white">{t.images.badge}</span>
        </p>
        <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight text-black">
          {t.images.title}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          {t.images.sub}
        </p>
        <div className="mt-8">
          <ImagePlayground />
        </div>
      </div>
    </div>
  );
}
