"use client";

import { useState } from "react";

/** Tombol salin kecil neo-brutalism. Teks berubah jadi "Disalin!" 1,5 detik. */
export default function CopyButton({
  text,
  label = "Salin",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback untuk browser lama / konteks non-secure.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`btn-press h-8 shrink-0 border-2 border-black px-3 font-mono text-[12px] font-bold shadow-brutal-sm ${
        copied ? "bg-green text-white" : "bg-white text-black"
      }`}
    >
      {copied ? "Disalin!" : label}
    </button>
  );
}
