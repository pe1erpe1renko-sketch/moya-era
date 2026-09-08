import type { Metadata } from "next";
import HomePage from "./HomePage";

export const metadata: Metadata = {
  title: "Моя Эра — шесть систем, один ваш рисунок",
  description: "Матрица судьбы, натальная карта, дизайн человека, нумерология, таро и совместимость — шесть расчётов по дате рождения в одном сервисе.",
  openGraph: {
    title: "Моя Эра — шесть систем, один ваш рисунок",
    description: "Шесть систем считают вас по-разному. И сходятся. Начните с бесплатного расчёта в Моя Эра.",
    type: "website",
  },
};

export default function Page() {
  return <HomePage />;
}
