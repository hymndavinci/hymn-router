import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Footer from "@/components/footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Hymn Router — Satu Endpoint untuk Semua Model AI Gratis",
  description:
    "Gateway OpenAI-compatible untuk 9 endpoint LLM gratis (Groq, Gemini, NVIDIA, OpenRouter, Kilo, LLM7, dan lainnya) dengan fallback otomatis. Login dengan Google, buat API key, tembak ke hymn-router.vercel.app/api/v1. Rp 0.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg text-text">
        {children}
        <Footer />
      </body>
    </html>
  );
}
