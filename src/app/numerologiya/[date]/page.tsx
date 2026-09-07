import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartShell } from "@/components/chart/ChartShell";
import { chartPath, chartUrlDateToIso } from "@/lib/chartUrl";
import { formatDateDots } from "@/lib/matrix";
import { lifePath } from "@/lib/numerology";
import { answerNumerologySlots, freeNumerologySlotIds, resolveNumerology } from "@/server/numerologyTexts";
import { NextSteps } from "@/components/next/NextSteps";
import { chartShowcase } from "@/lib/nextSteps";
import { NumerologyDateView } from "@/components/numerology/NumerologyDateView";
import { SITE_URL } from "@/lib/env";
import { HintBubble } from "@/components/hint/HintBubble";

/**
 * ПОСТОЯННЫЙ АДРЕС НУМЕРОЛОГИИ — /numerologiya/26-07-1990
 *
 * Устроена как страницы натальной карты и дизайна человека: одна на дату,
 * строится по первому заходу и кэшируется. Отличие одно и приятное —
 * нумерологии не нужны ни время, ни место, поэтому уточняющих параметров
 * у этих адресов не бывает и закрывать от индексации нечего.
 *
 * Личный год зависит от текущего года, поэтому кэш живёт сутки: 1 января
 * страница пересчитается сама.
 */

export const revalidate = 86400;
export const dynamicParams = true;

/** Пустой список — обязательное условие кэширования страниц по запросу. */
export async function generateStaticParams() {
  return [];
}

type Params = { date: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const iso = chartUrlDateToIso((await params).date);
  if (!iso) return { title: "Расчёт не найден — Моя Эра" };

  const chart = resolveNumerology(iso);
  const dots = formatDateDots(iso);
  if (!chart) return { title: `Нумерология ${dots} — Моя Эра` };

  const card = lifePath.find((x) => x.n === chart.path);
  const title = `Нумерология ${dots}: число жизненного пути ${chart.path}${card ? `, ${card.title.toLowerCase()}` : ""} — Моя Эра`;
  const description = `Расчёт по дате ${dots}: число жизненного пути ${chart.path}, число дня рождения ${chart.birthday}, число отношения ${chart.attitude}, квадрат Пифагора. Короткий разбор каждого числа бесплатно.`;
  const canonical = chartPath("numerology", iso);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [{ url: `${SITE_URL}/api/og?chart=numerology&date=${(await params).date}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const iso = chartUrlDateToIso((await params).date);
  if (!iso) notFound();

  const chart = resolveNumerology(iso);
  if (!chart) notFound();

  // Короткие справки — в HTML: это и содержимое для поисковика, и
  // мгновенный экран. Генерацию здесь не запускаем: страница кэшируется.
  const answers = await answerNumerologySlots(chart, freeNumerologySlotIds(chart), {
    unlocked: false,
    allowGenerate: false,
  });
  const initialTexts: Record<string, string> = {};
  for (const a of answers) {
    if (!a.locked && a.source !== "placeholder" && a.text) initialTexts[a.slotId] = a.text;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Нумерология ${formatDateDots(iso)}`,
    description: `Число жизненного пути ${chart.path}, число дня рождения ${chart.birthday}, квадрат Пифагора.`,
    inLanguage: "ru-RU",
    isAccessibleForFree: false,
    hasPart: { "@type": "WebPageElement", isAccessibleForFree: true, cssSelector: "#free" },
    publisher: { "@type": "Organization", name: "Моя Эра" },
  };

  return (
    <ChartShell>
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="relative w-full" style={{ paddingTop: "clamp(40px, 5vh, 80px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}>
          <div id="free" className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
            <NumerologyDateView chart={chart} initialTexts={initialTexts} />
            <NextSteps showcase={chartShowcase("numerology", iso)} />
            <HintBubble place="numerology" iso={iso} />
          </div>
        </section>
      </>
    </ChartShell>
  );
}
