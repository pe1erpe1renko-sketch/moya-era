import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import MatricaSudbyPage from "./MatricaSudbyPage";

export const metadata: Metadata = {
  title: "Рассчитать матрицу судьбы по дате рождения — Моя Эра",
  description: "Бесплатный расчёт матрицы судьбы онлайн. Центральный аркан и базовые числа по дате рождения, с объяснением, откуда взялось каждое число.",
  alternates: { canonical: "/matrica-sudby" },
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Рассчитать матрицу судьбы по дате рождения — Моя Эра",
    description: "Бесплатный расчёт матрицы судьбы онлайн. Центральный аркан и базовые числа по дате рождения, с объяснением, откуда взялось каждое число.",
    type: "website",
  },
};

export default function Page() {
  return <MatricaSudbyPage />;
}
