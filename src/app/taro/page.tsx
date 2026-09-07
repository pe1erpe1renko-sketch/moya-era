import type { Metadata } from "next";
import { ChartShell } from "@/components/chart/ChartShell";
import { tarotLandingShowcase } from "@/lib/nextSteps";
import TaroPage from "./TaroPage";

/**
 * /taro — расклад на вопрос как флагман, карта дня как бесплатный вход.
 * Вопрос в адресе (?q=…) страница забирает и стирает; canonical — чистый
 * адрес, чтобы поисковик не плодил копии с личными вопросами.
 */
export const metadata: Metadata = {
  title: "Расклад Таро на вопрос онлайн — Моя Эра",
  description:
    "Задайте свой вопрос своими словами — карты выпадут прямо сейчас, а трактовка будет написана под него. Одна карта, три карты, отношения, большой расклад. Карта дня по дате рождения — бесплатно.",
  alternates: { canonical: "/taro" },
  openGraph: {
    images: [{ url: "/api/og?direction=tarot", width: 1200, height: 630 }],
    title: "Расклад Таро на вопрос онлайн — Моя Эра",
    description: "Свой вопрос своими словами: карты выпадают прямо сейчас, трактовка пишется под вопрос. Карта дня — бесплатно.",
    type: "website",
  },
};

export default function Page() {
  return (
    <ChartShell>
      <TaroPage showcase={tarotLandingShowcase()} />
    </ChartShell>
  );
}
