import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ALL_CALC_TYPES,
  arcanaLine,
  arcanaName,
  buildReadingSections,
  countFreeSlots,
  formatDateDots,
  readingPath,
  urlDateToIso,
} from "@/lib/matrix";
import { PAIR_VIEWS } from "@/lib/pair";
import { answerPairSlots, freePairSlotIds, resolvePair } from "@/server/pairTexts";
import { answerSlots, resolveReading } from "@/server/readingTexts";
import type { SlotText } from "@/components/reading/useReadingTexts";
import { PairPage } from "@/components/pair/PairPage";
import { SITE_URL } from "@/lib/env";

/**
 * ПОСТОЯННЫЙ АДРЕС РАЗБОРА ПАРЫ
 *   /sovmestimost/13-07-1998/09-04-1992
 *
 * Индексируется только этот адрес. Три взгляда — матрица, синастрия и
 * композит — живут на нём же и переключаются якорем (#sinastriya).
 * Отдельных страниц на каждый взгляд не заводим: это были бы три страницы
 * про одну пару, и поисковик посчитал бы их дублями.
 *
 * Время и место обоих — параметрами запроса (?t1=…&g1=…&t2=…&g2=…), они
 * применяются в браузере, а такие адреса закрыты от индексации в proxy.ts.
 *
 * Страница кэшируется (ISR) и строится по первому заходу: пар столько,
 * что собирать их заранее нельзя.
 */

export const revalidate = 86400;
export const dynamicParams = true;

/** Пустой список — обязательное условие кэширования страниц по запросу. */
export async function generateStaticParams() {
  return [];
}

type Params = { first: string; second: string };

function parse(params: Params): [string, string] | null {
  const a = urlDateToIso(params.first);
  const b = urlDateToIso(params.second);
  return a && b ? [a, b] : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const dates = parse(p);
  if (!dates) return { title: "Разбор пары не найден — Моя Эра" };

  const resolved = resolveReading("sovmestimost", dates);
  const core = resolved?.reading.matrix.core.C ?? 0;
  const dots = dates.map(formatDateDots).join(" и ");
  const title = core
    ? `Совместимость ${dots}: аркан пары ${core}, ${arcanaName(core)} — Моя Эра`
    : `Совместимость ${dots} — Моя Эра`;
  const description = core
    ? `${arcanaLine(core)}. Три взгляда на пару: матрица судьбы, синастрия по натальным картам и композит по дизайну человека.`
    : "Три взгляда на пару: матрица судьбы, синастрия по натальным картам и композит по дизайну человека.";
  const canonical = readingPath("sovmestimost", dates);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [{ url: `${SITE_URL}/api/og?type=sovmestimost&dates=${p.first},${p.second}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  const dates = parse(p);
  if (!dates) notFound();

  const resolved = resolveReading("sovmestimost", dates);
  const type = ALL_CALC_TYPES.find((t) => t.slug === "sovmestimost");
  if (!resolved || !type) notFound();

  // Бесплатные абзацы всех трёх взглядов — в HTML: это и содержимое для
  // поисковика, и живой результат для того, кому прислали ссылку.
  // Генерацию здесь не запускаем: страница кэшируется.
  const initialTexts: Record<string, Record<string, string>> = {};
  for (const view of PAIR_VIEWS) {
    const pair = resolvePair({
      first: { date: dates[0], time: null, placeId: null },
      second: { date: dates[1], time: null, placeId: null },
      view: view.id,
    });
    if (!pair) continue;
    const answers = await answerPairSlots(pair, freePairSlotIds(pair), { unlocked: false, allowGenerate: false });
    const texts: Record<string, string> = {};
    for (const a of answers) if (!a.locked && a.source !== "placeholder" && a.text) texts[a.slotId] = a.text;
    initialTexts[view.id] = texts;
  }

  // Матричный разбор пары остаётся ровно таким, каким был на этом адресе.
  const sections = buildReadingSections(type.sections, resolved.reading.matrix, { unlocked: false });
  const sectionsOpen = buildReadingSections(type.sections, resolved.reading.matrix, { unlocked: true });
  const { free, total } = countFreeSlots(type.sections);
  const freeIds = sections.flatMap((s) => s.slots.filter((x) => !x.locked).map((x) => x.id));
  const matrixAnswers = await answerSlots(resolved, freeIds, { unlocked: false, allowGenerate: false });
  const matrixTexts: Record<string, SlotText> = {};
  for (const a of matrixAnswers) {
    if (!a.locked && a.source !== "placeholder") matrixTexts[a.slotId] = { text: a.text, source: a.source };
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Совместимость ${dates.map(formatDateDots).join(" и ")}`,
    description: type.lead,
    inLanguage: "ru-RU",
    isAccessibleForFree: false,
    hasPart: { "@type": "WebPageElement", isAccessibleForFree: true, cssSelector: "#free" },
    publisher: { "@type": "Organization", name: "Моя Эра" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative w-full" style={{ paddingTop: "clamp(40px, 5vh, 80px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}>
        <div id="free" className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <PairPage
            isoDates={dates}
            initialTexts={initialTexts}
            matrixReading={{
              type: { id: type.id, slug: type.slug, title: type.title, lead: type.lead, note: type.note, pair: type.pair, full: type.full },
              urlDates: [p.first, p.second],
              isoDates: dates,
              matrix: resolved.reading.matrix,
              sections,
              sectionsOpen,
              initialTexts: matrixTexts,
              freeCount: free,
              totalCount: total,
            }}
          />
        </div>
      </section>
    </>
  );
}
