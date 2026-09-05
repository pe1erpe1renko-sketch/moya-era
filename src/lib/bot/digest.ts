/**
 * СБОРКА УТРЕННЕЙ СВОДКИ.
 *
 * Одно сообщение, несколько строк. Ключи текстов — ТЕ ЖЕ, что на сайте:
 * своих текстов у бота нет и быть не должно.
 *
 * ПОЧЕМУ ЭТО ВАЖНО ДЛЯ ДЕНЕГ. Аркан дня зависит от даты и аркана периода,
 * а аркан дня из аркана периода и выводится — значит на все сутки
 * приходится не больше двадцати двух разных текстов на весь сервис,
 * сколько бы ни было подписчиков. Карта дня и число дня написаны один
 * раз навсегда. Заведи бот свои ключи — и расход перестал бы быть
 * фиксированным.
 *
 * ПОЧЕМУ ЭТО ВАЖНО ДЛЯ ДОВЕРИЯ. Человек читает сводку утром и открывает
 * кабинет днём. Разойдись они хоть раз — и дальше он не поверит ни
 * тому, ни другому.
 *
 * ИМЯ ПОДСТАВЛЯЕТСЯ ПРИ ОТПРАВКЕ, а в промпт не идёт: текст пишется один
 * раз на всех и лежит в базе вечно, имя в нём было бы одноразовым.
 */

import { arcanaName, dailyTextKey } from "@/lib/matrix";
import { arcanumInfo } from "@/lib/tarot";
import type { BotTopic } from "./topics";

export type DigestSource = {
  /** имя человека; null — обращаемся без имени, без пустых мест */
  name: string | null;
  /** сегодняшняя дата по московским суткам, YYYY-MM-DD */
  day: string;
  /** аркан дня из матрицы и аркан периода — вместе они дают ключ текста */
  matrix: { dayArcana: number; periodArcana: number } | null;
  /** аркан карты дня из таро */
  tarot: number | null;
  /** число дня из нумерологии, 1..9 */
  numerology: number | null;
};

/** Ключ текста для каждого направления. Все три — общие с сайтом. */
export function digestKeys(src: DigestSource, topics: readonly BotTopic[]): string[] {
  const keys: string[] = [];
  if (topics.includes("matrix") && src.matrix) {
    keys.push(dailyTextKey(src.matrix.dayArcana, src.matrix.periodArcana, src.day));
  }
  if (topics.includes("tarot") && src.tarot) keys.push(`taro_day_${src.tarot}`);
  if (topics.includes("numerology") && src.numerology) keys.push(`num_brief_dayn_${src.numerology}`);
  return keys;
}

export type DigestLine = { topic: BotTopic; head: string; text: string | null };

/**
 * Строки сводки. Текст берётся из готовых, `texts` — то, что нашлось в
 * общем кэше; чего нет, то и не показываем: выдумывать на ходу нельзя.
 */
export function digestLines(
  src: DigestSource,
  topics: readonly BotTopic[],
  texts: Record<string, string>,
): DigestLine[] {
  const out: DigestLine[] = [];

  if (topics.includes("matrix") && src.matrix) {
    const n = src.matrix.dayArcana;
    out.push({
      topic: "matrix",
      head: `Аркан дня — ${n}, ${arcanaName(n)}`,
      text: texts[dailyTextKey(n, src.matrix.periodArcana, src.day)] ?? null,
    });
  }
  if (topics.includes("tarot") && src.tarot) {
    const info = arcanumInfo(src.tarot);
    out.push({
      topic: "tarot",
      head: `Карта дня — ${src.tarot}, ${info.name}`,
      text: texts[`taro_day_${src.tarot}`] ?? info.line ?? null,
    });
  }
  if (topics.includes("numerology") && src.numerology) {
    out.push({
      topic: "numerology",
      head: `Число дня — ${src.numerology}`,
      text: texts[`num_brief_dayn_${src.numerology}`] ?? null,
    });
  }
  return out;
}

/** «5 сентября» — дата в шапке сводки. */
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function digestDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/**
 * Готовое сообщение.
 *
 * Голос тот же, что на сайте: спокойно, на «вы», без персонажа и без
 * панибратства. Ни обещаний событий, ни «осталось N мест», ни таймеров —
 * это правило проекта, и в единственном месте, куда мы приходим сами,
 * нарушать его нельзя тем более.
 *
 * @returns null, если показывать нечего: пустую сводку не шлём
 */
export function digestMessage(src: DigestSource, topics: readonly BotTopic[], texts: Record<string, string>): string | null {
  const lines = digestLines(src, topics, texts);
  if (lines.length === 0) return null;

  const hello = src.name ? `${src.name}, доброе утро.` : "Доброе утро.";
  const parts = [`${hello} ${digestDate(src.day)}`];
  for (const l of lines) {
    parts.push(l.text ? `${l.head}\n${l.text}` : l.head);
  }
  return parts.join("\n\n");
}
