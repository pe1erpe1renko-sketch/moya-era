/**
 * Меняется ли результат расчёта в течение суток рождения.
 *
 * Когда время рождения неизвестно, мы считаем разбор на полдень. Но иногда
 * за эти сутки результат меняется: Луна переходит в другой знак, у дизайна
 * человека загорается канал и вместе с ним меняется тип. Показывать такой
 * результат как точный нельзя — человек сверится с другим сервисом,
 * получит другое и будет прав.
 *
 * Поэтому мы честно смотрим весь день: считаем в узлах сетки, а там, где
 * соседние узлы разошлись, ищем момент перехода с точностью до минуты.
 * Если за сутки ничего не изменилось — оговорок нет, результат один и тот
 * же в любое время дня.
 */

import { cityGenitive } from "./cityName";
import { localToUtc, zoneOffsetSeconds } from "./localTime";

const MINUTE = 60_000;

/**
 * Часы по умолчанию, когда место рождения неизвестно, — московские.
 *
 * Раньше здесь было всемирное время, и это подводило: аудитория
 * русскоязычная, и «по всемирному времени» человек читает как своё
 * местное, ошибаясь на три-десять часов. Москва — понятная всем точка
 * отсчёта, и рядом с часами всегда стоит пометка «(мск)».
 */
export const DEFAULT_TZ = "Europe/Moscow";

/** Шаг сетки: два часа. Меньше — дольше считать, больше — риск пропустить. */
const STEP_MINUTES = 120;

export type DayChange<T> = {
  /** момент перехода, UTC */
  at: Date;
  from: T;
  to: T;
};

export type DayScan<T> = {
  /** результат на полдень — то, что показывается человеку */
  value: T;
  /** true, если за сутки результат не менялся */
  stable: boolean;
  changes: DayChange<T>[];
};

export type DayBounds = { start: Date; noon: Date; end: Date };

/**
 * Границы суток рождения в UTC.
 *
 * Здесь встречаются двое часов, и путать их нельзя:
 *  - start и end — сутки по тем часам, в которых мы называем время
 *    перехода: по месту рождения, а без места — по Москве. Иначе переход
 *    в 23:30 по всемирному времени назывался бы «02:30 (мск)», то есть
 *    временем следующего дня;
 *  - noon — момент, на который построен показанный разбор. Он совпадает с
 *    `resolveBirthMoment`: местный полдень, если место известно, и полдень
 *    по всемирному времени, если нет.
 *
 * Момент расчёта всегда лежит внутри суток: полдень по всемирному времени
 * — это 15:00 или 16:00 по Москве, то есть середина московских суток.
 */
export function dayBounds(date: string, tz: string | null): DayBounds {
  const clock = tz ?? DEFAULT_TZ;
  const [y, m, d] = date.split("-").map(Number);
  return {
    start: localToUtc(date, "00:00", clock).utc,
    noon: tz ? localToUtc(date, "12:00", tz).utc : new Date(Date.UTC(y, m - 1, d, 12, 0)),
    end: localToUtc(date, "23:59", clock).utc,
  };
}

/**
 * Считает `sample` по всем суткам и находит моменты, где результат меняется.
 *
 * @param equal   сравнение двух результатов (по смыслу, а не по ссылке)
 * @param sample  расчёт на момент времени
 */
export function scanDay<T>(
  date: string,
  tz: string | null,
  sample: (utc: Date) => T,
  equal: (a: T, b: T) => boolean,
): DayScan<T> {
  const { start, noon, end } = dayBounds(date, tz);
  const value = sample(noon);

  const points: Array<{ at: Date; value: T }> = [];
  for (let t = start.getTime(); t <= end.getTime(); t += STEP_MINUTES * MINUTE) {
    const at = new Date(t);
    points.push({ at, value: sample(at) });
  }
  const last = points[points.length - 1];
  if (!last || last.at.getTime() < end.getTime()) points.push({ at: end, value: sample(end) });

  const changes: DayChange<T>[] = [];
  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1];
    const after = points[i];
    if (equal(before.value, after.value)) continue;

    // Момент перехода: половинное деление до минуты.
    let lo = before.at.getTime();
    let hi = after.at.getTime();
    while (hi - lo > MINUTE) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (equal(sample(new Date(mid)), before.value)) lo = mid;
      else hi = mid;
    }
    changes.push({ at: new Date(hi), from: before.value, to: after.value });
  }

  return { value, stable: changes.length === 0, changes };
}

/** Местное время момента в поясе: «14:20». Без пояса — московское. */
export function formatLocalClock(utc: Date, tz: string | null): string {
  const offsetSeconds = zoneOffsetSeconds(utc, tz ?? DEFAULT_TZ);
  const shifted = new Date(utc.getTime() + offsetSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}`;
}

/**
 * Чьи это часы — для фразы «после 14:20 …». С известным местом называем
 * город, без него — Москву. Пометка всегда в скобках и всегда есть:
 * время без указания часов читатель примет за своё и ошибётся.
 */
export function clockLabel(placeName: string | null): string {
  if (!placeName) return "(мск)";
  const city = placeName.split(",")[0]?.trim();
  if (!city) return "(по местному времени)";
  const genitive = cityGenitive(city);
  // Где падеж не выводится наверняка — говорим «города Ростов-на-Дону»:
  // казённее, зато без ошибки.
  return genitive ? `(по времени ${genitive})` : `(по времени города ${city})`;
}

/** Момент в московских часах: «15:00». Для фразы «полдень по всемирному — это 15:00 (мск)». */
export function moscowClock(utc: Date): string {
  return formatLocalClock(utc, null);
}
