import type { Metadata } from "next";
import MatricaSudbyPage from "./MatricaSudbyPage";

export const metadata: Metadata = {
  title: "Рассчитать матрицу судьбы по дате рождения — Моя Эра",
  description: "Бесплатный расчёт матрицы судьбы онлайн. Центральный аркан и базовые числа по дате рождения, с объяснением, откуда взялось каждое число.",
  alternates: { canonical: "/matrica-sudby" },
  openGraph: {
    images: [{ url: "/api/og?direction=matrix", width: 1200, height: 630 }],
    title: "Рассчитать матрицу судьбы по дате рождения — Моя Эра",
    description: "Бесплатный расчёт матрицы судьбы онлайн. Центральный аркан и базовые числа по дате рождения, с объяснением, откуда взялось каждое число.",
    type: "website",
  },
};

export default function Page() {
  return <MatricaSudbyPage />;
}
