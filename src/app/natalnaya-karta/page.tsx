import type { Metadata } from "next";
import NatalPage from "./NatalPage";

export const metadata: Metadata = {
  title: "Натальная карта онлайн по дате рождения — Моя Эра",
  description: "Знак Солнца бесплатно по дате рождения. Полная натальная карта — по дате, времени и месту, с реальными положениями планет.",
  alternates: { canonical: "/natalnaya-karta" },
  openGraph: {
    images: [{ url: "/api/og?direction=natal", width: 1200, height: 630 }],
    title: "Натальная карта онлайн по дате рождения — Моя Эра",
    description: "Знак Солнца бесплатно по дате рождения. Полная натальная карта — по дате, времени и месту, с реальными положениями планет.",
    type: "website",
  },
};

export default function Page() {
  return <NatalPage />;
}
