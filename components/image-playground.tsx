/**
 * ImagePlayground — playground image generation gratis (/images).
 *
 * Memanggil Pollinations langsung dari browser (endpoint publik tanpa
 * key): <img> memakai URL Pollinations sebagai src. Tombol unduh
 * mengambil gambar sebagai blob (fallback: buka URL di tab baru kalau
 * fetch diblokir CORS). Endpoint ber-key untuk kode ada di
 * POST /api/v1/images/generations (lihat /docs).
 */

"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import {
  buildPollinationsImageUrl,
  IMAGE_SIZES,
  type ImageModel,
  type ImageSize,
} from "@/lib/pollinations-images";

const SIZE_OPTIONS: ImageSize[] = ["1024x1024", "512x512", "1024x1792", "1792x1024"];

export default function ImagePlayground() {
  const { dict } = useLocale();
  const t = dict.images;
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("flux");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function generate() {
    const clean = prompt.trim();
    if (!clean || loading) {
      if (!clean) setError(t.emptyPrompt);
      return;
    }
    setError(null);
    setLoading(true);
    setImageUrl(null);
    const seed = Math.floor(Math.random() * 1_000_000);
    setImagePrompt(clean);
    setImageUrl(buildPollinationsImageUrl(clean, model, size, seed));
  }

  async function download() {
    if (!imageUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `hymn-router-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      // Fetch diblokir (mis. CORS) — buka gambar di tab baru supaya
      // user tetap bisa menyimpan manual.
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  async function copyUrl() {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(imageUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = imageUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Form */}
      <div className="border-2 border-black bg-yellow-soft p-4 shadow-brutal-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-black">
            {t.promptLabel}
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={t.promptPlaceholder}
            maxLength={4000}
            className="w-full resize-none border-2 border-black bg-white px-3 py-2 text-base text-black outline-none placeholder:text-faint focus:shadow-[3px_3px_0_#2563EB] sm:text-sm"
          />
        </label>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex w-full flex-col gap-1 sm:w-auto sm:flex-none">
            <span className="text-[11px] font-bold uppercase tracking-wide text-black">
              {t.modelLabel}
            </span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ImageModel)}
              className="h-10 w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-auto sm:text-sm"
            >
              <option value="flux">flux</option>
              <option value="turbo">turbo</option>
            </select>
          </label>

          <label className="flex w-full flex-col gap-1 sm:w-auto sm:flex-none">
            <span className="text-[11px] font-bold uppercase tracking-wide text-black">
              {t.sizeLabel}
            </span>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as ImageSize)}
              className="h-10 w-full border-2 border-black bg-white px-2 text-base text-black outline-none focus:shadow-[3px_3px_0_#2563EB] sm:w-auto sm:text-sm"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} ({IMAGE_SIZES[s].width}×{IMAGE_SIZES[s].height})
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={generate}
            disabled={loading || prompt.trim() === ""}
            className="btn-press h-10 w-full border-2 border-black bg-yellow px-6 text-sm font-bold text-black shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {loading ? t.generating : t.generate}
          </button>
        </div>

        <p className="mt-3 font-mono text-[12px] leading-relaxed text-muted">
          {model === "flux" ? t.modelFluxDesc : t.modelTurboDesc}
        </p>
      </div>

      {error && (
        <div role="alert" className="border-2 border-black bg-white p-3 text-sm font-medium text-bad shadow-brutal-sm">
          {error}
        </div>
      )}

      {/* Hasil */}
      {imageUrl && (
        <div className="border-2 border-black bg-white p-4 shadow-brutal-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-black text-black">{t.resultTitle}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void download()}
                disabled={downloading}
                className="btn-press h-10 border-2 border-black bg-yellow px-4 text-sm font-bold text-black shadow-brutal-sm disabled:opacity-50"
              >
                {t.download}
              </button>
              <button
                onClick={() => void copyUrl()}
                className="h-10 border-2 border-black bg-white px-4 text-sm font-bold text-black hover:bg-yellow-soft"
              >
                {copied ? t.copied : t.copyUrl}
              </button>
            </div>
          </div>
          <p className="mt-2 break-words font-mono text-[12px] leading-relaxed text-muted">
            “{imagePrompt}” · {model} · {size}
          </p>
          <div className="relative mt-3 border-2 border-black bg-white">
            {loading && (
              <p className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-bold text-muted">
                {t.loadingImage}
              </p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imagePrompt}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(t.failed);
                setImageUrl(null);
              }}
              className="mx-auto block max-h-[640px] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <p className="break-words font-mono text-[12px] leading-relaxed text-faint">
        {t.directNote}
      </p>
    </div>
  );
}
