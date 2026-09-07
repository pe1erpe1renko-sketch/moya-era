import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartShell } from "@/components/chart/ChartShell";
import { CHART_SYSTEMS, chartPath, chartUrlDateToIso } from "@/lib/chartUrl";
import { formatDateDots } from "@/lib/matrix";
import { chartBody, natalDayVariation } from "@/lib/natal";
import { answerNatalSlots, briefNatalSlotIds, resolveNatalChart } from "@/server/natalTexts";
import { NextSteps } from "@/components/next/NextSteps";
import { chartShowcase } from "@/lib/nextSteps";
import { NatalDateView } from "@/components/natal/NatalDateView";
import { SITE_URL } from "@/lib/env";
import { HintBubble } from "@/components/hint/HintBubble";

/**
 * ПОСТОЯННЫЙ АДРЕС НАТАЛЬНОЙ КАРТЫ — /natalnaya-karta/26-07-1990
 *
 * Одна страница на дату, общая для всех и кэшируемая (ISR): в ней только
 * то, что не зависит от посетителя, — расчёт по дате и короткие справки.
 * Страницы не собираются заранее: их тридцать тысяч на систему, и сборка
 * от этого встала бы. Первый заход строит страницу, дальше её отдаёт кэш.
 *
 * Время и место сюда не приходят: они живут в параметрах запроса и
 * применяются в браузере (см. useUrlBirth). Читать searchParams на сервере
 * нельзя — страница стала бы динамической и кэш исчез бы.
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
  const iso = chartUrlDateToIso((await params).date);
  if (!iso) return { title: "Карта не найдена — Моя Эра" };

  const chart = resolveNatalChart({ date: iso, time: null, placeId: null });
  const sun = chart ? chartBody(chart, "sun") : null;
  const moon = chart ? chartBody(chart, "moon") : null;
  const dots = formatDateDots(iso);

  const title = sun
    ? `Натальная карта ${dots}: Солнце ${sun.sign.inCase} — Моя Эра`
    : `Натальная карта ${dots} — Моя Эра`;
  const moonPart = moon && !chart?.unknown.moonSign ? `, Луна ${moon.sign.inCase}` : "";
  const description = sun
    ? `Положения планет на ${dots}: Солнце ${sun.sign.inCase}${moonPart}. Круг карты, все планеты по знакам и короткий разбор каждого положения. Расчёт по астрономическим эфемеридам.`
    : `Натальная карта на ${dots}: положения планет по знакам, рассчитанные по астрономическим эфемеридам.`;
  const canonical = chartPath("natal", iso);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [{ url: `${SITE_URL}/api/og?chart=natal&date=${(await params).date}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const iso = chartUrlDateToIso((await params).date);
  if (!iso) notFound();

  const chart = resolveNatalChart({ date: iso, time: null, placeId: null });
  if (!chart) notFound();

  // Короткие справки — в HTML: это и содержимое для поисковика, и мгновенный
  // экран. Генерацию здесь не запускаем (страница кэшируется) — только кэш
  // и эталоны; чего нет, того на странице просто не будет.
  const answers = await answerNatalSlots(chart, briefNatalSlotIds(chart), { unlocked: false, allowGenerate: false });
  const initialTexts: Record<string, string> = {};
  for (const a of answers) {
    if (!a.locked && a.source !== "placeholder" && a.text) initialTexts[a.slotId] = a.text;
  }

  const variation = natalDayVariation(iso, null, null);
  const sun = chartBody(chart, "sun");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Натальная карта ${formatDateDots(iso)}`,
    description: sun ? `Положения планет на ${formatDateDots(iso)}: Солнце ${sun.sign.inCase}.` : CHART_SYSTEMS.natal.title,
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
            <NatalDateView
              iso={iso}
              initialTexts={initialTexts}
              initialVariation={{ preliminary: !variation.stable, facts: variation.facts }}
            />
            <NextSteps showcase={chartShowcase("natal", iso)} />
            <HintBubble place="natal" iso={iso} />
          </div>
        </section>
      </>
    </ChartShell>
  );
}
