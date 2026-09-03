import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import { CalcTheaterProvider } from "@/components/reading/CalcTheater";
import { Metrika } from "@/components/analytics/Metrika";
import { SITE_URL } from "@/lib/env";


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Моя Эра — матрица судьбы, натальная карта, нумерология и таро по дате рождения", template: "%s" },
  description: "Шесть систем самопознания в одном сервисе: матрица судьбы, натальная карта, дизайн человека, нумерология, таро, совместимость. Расчёт по дате рождения с объяснением каждого числа.",
  openGraph: {
    title: "Моя Эра",
    description: "Шесть систем самопознания в одном сервисе. Расчёт по дате рождения с объяснением каждого числа.",
    type: "website",
    locale: "ru_RU",
    siteName: "Моя Эра",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#03191e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          href="/fonts/forum-cyrillic-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/onest-cyrillic-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <CalcTheaterProvider>{children}</CalcTheaterProvider>
        <Metrika />
      </body>
    </html>
  );
}
