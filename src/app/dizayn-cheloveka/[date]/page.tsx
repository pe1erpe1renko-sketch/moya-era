import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartShell } from "@/components/chart/ChartShell";
import { chartPath, chartUrlDateToIso } from "@/lib/chartUrl";
import { formatDateDots } from "@/lib/matrix";
import { hdDayVariation } from "@/lib/humandesign";
import { answerHdSlots, briefHdSlotIds, resolveHdChart } from "@/server/hdTexts";
import { NextSteps } from "@/components/next/NextSteps";
import { chartShowcase } from "@/lib/nextSteps";
import { HdDateView } from "@/components/humandesign/HdDateView";
import { SITE_URL } from "@/lib/env";
import { HintBubble } from "@/components/hint/HintBubble";

/**
 * ПОСТОЯННЫЙ АДРЕС ДИЗАЙНА ЧЕЛОВЕКА — /dizayn-cheloveka/26-07-1990
 *
 * Устроена как страница натальной карты: одна на дату, кэшируется, время и
 * место приходят параметрами запроса и применяются в браузере.
 *
 * Важная оговорка именно здесь: тип по одной дате не всегда определён.
 * Если за сутки он меняется, страница говорит об этом фактом и называет
 * час перехода — иначе человек сверится с другим калькулятором и будет
 * прав, а мы окажемся неправы.
 */

export const revalidate = 86400;
export const dynamicParams = true;

/**
 * Пустой список — обязательное условие кэширования (ISR) для страниц,
 * которые строятся по запросу. Без generateStaticParams Next считает
 * маршрут динамическим и рендерит его заново на каждый заход; с пустым
 * списком при сборке не строится ни одна страница, а построенная по
 * первому заходу ложится в кэш на сутки. Так деплой не разбухает от
 * тридцати тысяч страниц и не упирается в лимит времени сборки.
 */
export async function generateStaticParams() {
  return [];
}

type Params = { date: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const slug = (await params).date;
  const iso = chartUrlDateToIso(slug);
  if (!iso) return { title: "Бодиграф не найден — Моя Эра" };

  const chart = resolveHdChart({ date: iso, time: null, placeId: null });
  const dots = formatDateDots(iso);
  const stable = chart ? hdDayVariation(iso, null, null).stable : false;

  const title =
    chart && stable ? `Дизайн человека ${dots}: тип ${chart.type.name} — Моя Эра` : `Дизайн человека ${dots} — Моя Эра`;
  const description = chart
    ? stable
      ? `Бодиграф на ${dots}: тип ${chart.type.name}, стратегия «${chart.type.strategy}», ${chart.definedCenters.length} определённых центров из девяти. Расчёт по астрономическим эфемеридам.`
      : `Бодиграф на ${dots}: определённые центры, тип и стратегия. В этот день результат за сутки меняется — на странице сказано, во сколько и на какой. Расчёт по астрономическим эфемеридам.`
    : `Бодиграф на ${dots}, рассчитанный по астрономическим эфемеридам.`;
  const canonical = chartPath("humandesign", iso);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [{ url: `${SITE_URL}/api/og?chart=humandesign&date=${slug}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const iso = chartUrlDateToIso((await params).date);
  if (!iso) notFound();

  const chart = resolveHdChart({ date: iso, time: null, placeId: null });
  if (!chart) notFound();

  // Короткие справки — в HTML. Генерацию здесь не запускаем: страница
  // кэшируется, берём только готовое.
  const answers = await answerHdSlots(chart, briefHdSlotIds(chart), { unlocked: false, allowGenerate: false });
  const initialTexts: Record<string, string> = {};
  for (const a of answers) {
    if (!a.locked && a.source !== "placeholder" && a.text) initialTexts[a.slotId] = a.text;
  }

  const variation = hdDayVariation(iso, null, null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Дизайн человека ${formatDateDots(iso)}`,
    description: `Бодиграф на ${formatDateDots(iso)}: определённые центры, тип и стратегия.`,
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
            <HdDateView
              iso={iso}
              initialTexts={initialTexts}
              initialVariation={{ preliminary: !variation.stable, facts: variation.facts }}
            />
            <NextSteps showcase={chartShowcase("humandesign", iso)} />
            <HintBubble place="humandesign" iso={iso} />
          </div>
        </section>
      </>
    </ChartShell>
  );
}
