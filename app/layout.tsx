import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hymn Router — 9 Free LLM Providers, One Endpoint",
  description:
    "Chat AI lewat 9 endpoint LLM gratis (Groq, Gemini, NVIDIA, OpenRouter, Kilo, LLM7, dan lainnya) dengan fallback otomatis. $0.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-bg text-text">{children}</body>
    </html>
  );
}
