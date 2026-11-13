import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ApiDocs from "@/components/api-docs";

export const metadata: Metadata = {
  title: "API Docs — Hymn Router",
  description:
    "Dokumentasi Hymn Router: gateway OpenAI-compatible /api/v1 dan endpoint /api/ai/chat.",
};

export default function DocsPage() {
  return (
    <div className="flex-1">
      <Navbar />
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
          Dokumentasi
        </p>
        <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-tight text-text">
          API Docs
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
          Dua cara memakai router: gateway OpenAI-compatible{" "}
          <code className="font-mono text-[13px] text-text">/api/v1</code>{" "}
          (pakai API key dari dashboard) dan endpoint sederhana{" "}
          <code className="font-mono text-[13px] text-text">/api/ai/chat</code>{" "}
          (anonim atau pakai key).
        </p>
        <div className="mt-8">
          <ApiDocs />
        </div>
      </div>
    </div>
  );
}
