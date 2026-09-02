import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://moyaera.ru"),
  title: { default: "Моя Эра", template: "%s" },
  description: "Шесть систем самопознания в одном сервисе.",
  openGraph: { title: "Моя Эра", description: "Шесть систем самопознания в одном сервисе.", type: "website", locale: "ru_RU" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#03191e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
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
      <body>{children}</body>
    </html>
  );
}
