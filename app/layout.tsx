import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Footer from "@/components/footer";
import { LocaleProvider } from "@/components/locale-provider";
import { dict, getLocale } from "@/lib/i18n";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: dict[locale].meta.homeTitle,
    description: dict[locale].meta.homeDescription,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="flex min-h-screen flex-col bg-bg text-text">
        <LocaleProvider locale={locale} dict={dict[locale]}>
          {children}
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
