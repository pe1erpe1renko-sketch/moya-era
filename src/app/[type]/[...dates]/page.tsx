import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildReadingSections,
  countFreeSlots,
  urlDateToIso,
  arcanaName,
  arcanaLine,
  formatDateDots,
  readingPath,
  ALL_CALC_TYPES,
} from "@/lib/matrix";
import { resolveReading, answerSlots } from "@/server/readingTexts";
import { ReadingView } from "@/components/reading/ReadingView";
import type { SlotText } from "@/components/reading/useReadingTexts";
import { SITE_URL } from "@/lib/env";
import { HintBubble } from "@/components/hint/HintBubble";

/**
 * ПОСТОЯННЫЕ АДРЕСА РАЗБОРОВ
 *   /matrica/13-07-1998
 *   /sovmestimost/13-07-1998/09-04-1992
 *   /dengi/13-07-1998 … — десять типов + прогноз.
 *
 * Страница одна для всех и кэшируется (ISR): в ней только то, что не зависит
 * от пользователя — расчёт и бесплатные тексты. Замки и платные тексты
 * решаются на клиенте через API. Так страницы индексируются и отдаются
 * мгновенно, а доступ всё равно проверяет сервер.
 */

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Пустой список — обязательное условие кэширования (ISR) для страниц,
 * которые строятся по запросу: без generateStaticParams Next считает
 * маршрут динамическим и рендерит его заново на каждый заход.
 */
export async function generateStaticParams() {
  return [];
}

type Params = { type: string; dates: string[] };

function parse(params: Params) {
  const type = ALL_CALC_TYPES.find((t) => t.slug === params.type);
  if (!type) return null;
  const isoDates = params.dates.map((d) => urlDateToIso(d));
  if (isoDates.some((d) => d === null)) return null;
  if (isoDates.length !== (type.pair ? 2 : 1)) return null;
  return { type, isoDates: isoDates as string[], urlDates: params.dates };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const parsed = parse(await params);
  if (!parsed) return { title: "Разбор не найден — Моя Эра" };
  const resolved = resolveReading(parsed.type.slug, parsed.isoDates);
  if (!resolved) return { title: "Разбор не найден — Моя Эра" };

  const core = resolved.reading.matrix.core;
  const dates = parsed.isoDates.map(formatDateDots).join(" и ");
  const name = arcanaName(core.C);
  const title = parsed.type.pair
    ? `${parsed.type.title} ${dates}: ядро пары — аркан ${core.C}, ${name} — Моя Эра`
    : `${parsed.type.title} по дате рождения ${dates}: центральный аркан ${core.C}, ${name} — Моя Эра`;
  const description = `${arcanaLine(core.C)}. ${parsed.type.lead} Расчёт по 22 арканам с объяснением, откуда взялось каждое число.`;
  const canonical = readingPath(parsed.type.slug, parsed.isoDates);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [{ url: `${SITE_URL}/api/og?type=${parsed.type.slug}&dates=${parsed.urlDates.join(",")}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const parsed = parse(await params);
  if (!parsed) notFound();

  const resolved = resolveReading(parsed.type.slug, parsed.isoDates);
  if (!resolved) notFound();

  const { type, reading } = resolved;
  const sections = buildReadingSections(type.sections, reading.matrix, { unlocked: false });
  const sectionsOpen = buildReadingSections(type.sections, reading.matrix, { unlocked: true });
  const { free, total } = countFreeSlots(type.sections);

  // Бесплатные тексты — в HTML: это и контент для поисковика, и мгновенный экран.
  // Генерацию здесь не запускаем (страница кэшируется) — только кэш и эталоны;
  // недостающее клиент дозапросит через API.
  const freeIds = sections.flatMap((s) => s.slots.filter((x) => !x.locked && x.id !== "day_energy").map((x) => x.id));
  const answers = await answerSlots(resolved, freeIds, { unlocked: false, allowGenerate: false });
  const initialTexts: Record<string, SlotText> = {};
  for (const a of answers) {
    if (!a.locked && a.source !== "placeholder") initialTexts[a.slotId] = { text: a.text, source: a.source };
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${type.title} ${parsed.isoDates.map(formatDateDots).join(" и ")}`,
    description: type.lead,
    inLanguage: "ru-RU",
    isAccessibleForFree: false,
    hasPart: { "@type": "WebPageElement", isAccessibleForFree: true, cssSelector: "#free" },
    publisher: { "@type": "Organization", name: "Моя Эра" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingView
        type={{ id: type.id, slug: type.slug, title: type.title, lead: type.lead, note: type.note, pair: type.pair, full: type.full }}
        urlDates={parsed.urlDates}
        isoDates={parsed.isoDates}
        matrix={reading.matrix}
        sections={sections}
        sectionsOpen={sectionsOpen}
        initialTexts={initialTexts}
        freeCount={free}
        totalCount={total}
      />
      <HintBubble place="matrix" iso={parsed.isoDates[0]} />
    </>
  );
}
