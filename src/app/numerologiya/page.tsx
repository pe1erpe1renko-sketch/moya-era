import type { Metadata } from "next";
import NumerologyPage from "./NumerologyPage";

export const metadata: Metadata = {
  title: "Нумерология по дате рождения: число судьбы и квадрат Пифагора — Моя Эра",
  description: "Бесплатный расчёт числа жизненного пути и квадрата Пифагора по дате рождения, с объяснением каждого шага.",
  alternates: { canonical: "/numerologiya" },
  openGraph: {
    images: [{ url: "/api/og?direction=numerology", width: 1200, height: 630 }],
    title: "Нумерология по дате рождения: число судьбы и квадрат Пифагора — Моя Эра",
    description: "Бесплатный расчёт числа жизненного пути и квадрата Пифагора по дате рождения, с объяснением каждого шага.",
    type: "website",
  },
};

export default function Page() {
  return <NumerologyPage />;
}
