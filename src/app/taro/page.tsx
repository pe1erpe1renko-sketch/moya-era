import type { Metadata } from "next";
import TaroPage from "./TaroPage";

export const metadata: Metadata = {
  title: "Расклад Таро онлайн: карта дня — Моя Эра",
  description: "Бесплатный расклад Таро онлайн. Задай вопрос, вытяни карту и получи трактовку — без регистрации.",
  alternates: { canonical: "/taro" },
  openGraph: {
    title: "Расклад Таро онлайн: карта дня — Моя Эра",
    description: "Бесплатный расклад Таро онлайн. Задай вопрос, вытяни карту и получи трактовку — без регистрации.",
    type: "website",
  },
};

export default function Page() {
  return <TaroPage />;
}
