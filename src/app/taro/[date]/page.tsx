import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chartUrlDateToIso } from "@/lib/chartUrl";
import { formatDateDots } from "@/lib/matrix";
import { arcanumInfo, briefSlot, moscowDay, nextMoscowMidnight } from "@/lib/tarot";
import { answerTarotSlots, resolveDayCard } from "@/server/tarotTexts";
import { DayCardView } from "@/components/tarot/DayCardView";
import { TarotCrossLinks } from "@/components/tarot/TarotCrossLinks";
import { SITE_URL } from "@/lib/env";
import { MONTHS } from "@/lib/arcana";

/**
 * ПОСТОЯННЫЙ АДРЕС КАРТЫ ДНЯ — /taro/26-07-1990
 *
 * Устроена как страницы остальных систем: одна на дату рождения,
 * строится по первому заходу и кэшируется. Отличие одно: содержимое
 * меняется каждый день, поэтому кэш живёт ровно до московской полуночи —
 * не сутки от постройки, а до смены карты. Иначе страница, построенная в
 * 23:50, показывала бы вчерашнюю карту почти до конца следующего дня.
 *
 * Уточнять здесь нечего: ни времени, ни места карте дня не нужно, а имя
 * на неё не влияет. Значит и параметров у этих адресов не бывает.
 */

/**
 * ВЫДЕРЖКА КЭША — минута.
 *
 * Условие простое: карта у всех меняется в один момент, в московскую
 * полночь. Next разрешает только постоянное число секунд, отсчитываемое
 * от постройки страницы, а не от полуночи, — значит любое большое число
 * оставляет окно, в котором страница показывает вчерашнюю карту. Час
 * выдержки — час такого окна.
 *
 * Минута это окно закрывает. Дорого не выходит: пересборка страницы —
 * одно чтение текста из базы, и только для тех дат, которые в эту минуту
 * кто-то открыл. Между пересборками страница по-прежнему раздаётся из
 * кэша, а не считается каждому заново.
 *
 * Оставшуюся минуту и, что важнее, вкладку, открытую со вчерашнего дня,
 * закрывает `DayCardView`: он сам замечает, что московские сутки уже
 * другие, и говорит об этом вместо того, чтобы молча показывать
 * вчерашнее.
 */
export const revalidate = 60;
export const dynamicParams = true;

/** Пустой список — обязательное условие кэширования страниц по запросу. */
export async function generateStaticParams() {
  return [];
}

type Params = { date: string };

/** «00:00 5 сентября» — когда сменится карта. */
function changesAtLabel(now: Date = new Date()): string {
  const next = nextMoscowMidnight(now);
  const iso = moscowDay(new Date(next.getTime() + 60_000));
  const [, m, d] = iso.split("-").map(Number);
  return `в полночь на ${d} ${MONTHS[m - 1]}`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const slug = (await params).date;
  const iso = chartUrlDateToIso(slug);
  if (!iso) return { title: "Карта дня не найдена — Моя Эра" };

  const card = resolveDayCard(iso);
  const dots = formatDateDots(iso);
  if (!card) return { title: `Карта дня для ${dots} — Моя Эра` };

  const info = arcanumInfo(card.arcanum);
  const title = `Карта дня для ${dots}: ${card.arcanum}-й аркан, ${info.name} — Моя Эра`;
  const description = `Карта дня по дате рождения ${dots}: аркан ${card.arcanum}, ${info.name}. ${info.line}. Карта одна на весь день и меняется в московскую полночь. Короткая справка бесплатно.`;
  const canonical = `/taro/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [{ url: `${SITE_URL}/api/og?taro=${slug}`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const iso = chartUrlDateToIso((await params).date);
  if (!iso) notFound();

  const card = resolveDayCard(iso);
  if (!card) notFound();

  // Короткая справка — в HTML: это и содержимое для поисковика, и
  // мгновенный экран. Генерацию здесь не запускаем: страница кэшируется.
  const [brief] = await answerTarotSlots(card, [briefSlot(card).id], { unlocked: false, allowGenerate: false });
  const initialText = brief && !brief.locked && brief.source !== "placeholder" && brief.text ? brief.text : null;

  const info = arcanumInfo(card.arcanum);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Карта дня для ${formatDateDots(iso)}: ${card.arcanum}-й аркан, ${info.name}`,
    description: `${info.line}. Карта выбрана по дате рождения и сегодняшнему дню, меняется в московскую полночь.`,
    datePublished: `${card.day}T00:00:00+03:00`,
    dateModified: `${card.day}T00:00:00+03:00`,
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
          <DayCardView card={card} initialText={initialText} changesAt={changesAtLabel()} />
          <TarotCrossLinks iso={iso} />
        </div>
      </section>
    </>
  );
}
