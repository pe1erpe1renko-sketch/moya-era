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

import { localToUtc, zoneOffsetSeconds } from "./localTime";

const MINUTE = 60_000;

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
 * Границы суток рождения в UTC. Если пояс известен — местные сутки,
 * иначе всемирные.
 */
export function dayBounds(date: string, tz: string | null): DayBounds {
  if (tz) {
    return {
      start: localToUtc(date, "00:00", tz).utc,
      noon: localToUtc(date, "12:00", tz).utc,
      end: localToUtc(date, "23:59", tz).utc,
    };
  }
  const [y, m, d] = date.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, 0, 0)),
    noon: new Date(Date.UTC(y, m - 1, d, 12, 0)),
    end: new Date(Date.UTC(y, m - 1, d, 23, 59)),
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

/** Местное время момента в поясе: «14:20». Без пояса — время UTC. */
export function formatLocalClock(utc: Date, tz: string | null): string {
  const offsetSeconds = tz ? zoneOffsetSeconds(utc, tz) : 0;
  const shifted = new Date(utc.getTime() + offsetSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}`;
}

/**
 * Чьё это время — для фразы «после 14:20 …». С известным местом
 * называем город, без него честно говорим про всемирное время.
 */
export function clockLabel(placeName: string | null): string {
  if (!placeName) return "по всемирному времени";
  const city = placeName.split(",")[0]?.trim();
  return city ? `по времени в городе ${city}` : "по местному времени";
}
