import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import Footer from "@/components/footer";
import { LocaleProvider } from "@/components/locale-provider";
import { dict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n-utils";
import { getProviders } from "@/lib/free-ai-router";
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
  // theme-color: ground halaman (putih).
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = dict[locale].meta.homeTitle;
  const description = fill(dict[locale].meta.homeDescription, {
    total: getProviders().length,
  });
  return {
    metadataBase: new URL("https://hymnrouter.my.id"),
    title,
    description,
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "Hymn Router",
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "website",
      images: [
        {
          url: "/icon.png",
          width: 512,
          height: 512,
          alt: "Hymn Router",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/icon.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      {/* Tandai JS aktif sebelum hidrasi: state tersembunyi .reveal
          hanya berlaku bila class ini ada (tanpa JS, konten tetap
          terlihat — lihat app/globals.css). */}
      <Script id="js-class" strategy="beforeInteractive">
        {`document.documentElement.classList.add('js')`}
      </Script>
      <body className="flex min-h-screen flex-col bg-bg text-text">
        <a href="#main" className="skip-link">
          {t.common.skipToContent}
        </a>
        <LocaleProvider locale={locale} dicts={dict}>
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
