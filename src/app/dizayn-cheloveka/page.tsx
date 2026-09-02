import type { Metadata } from "next";
import HumanDesignPage from "./HumanDesignPage";

export const metadata: Metadata = {
  title: "Дизайн человека: тип, стратегия и авторитет — Моя Эра",
  description: "Тип, стратегия и авторитет по дате, времени и месту рождения. Расчёт по реальным положениям планет.",
  alternates: { canonical: "/dizayn-cheloveka" },
  openGraph: {
    title: "Дизайн человека: тип, стратегия и авторитет — Моя Эра",
    description: "Тип, стратегия и авторитет по дате, времени и месту рождения. Расчёт по реальным положениям планет.",
    type: "website",
  },
};

export default function Page() {
  return <HumanDesignPage />;
}
