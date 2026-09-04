/**
 * Время. На вход движок всегда получает момент во всемирном времени (UTC)
 * как обычный Date. Перевод местного времени рождения в UTC с историей
 * часовых поясов — задача отдельного слоя (шаг 2 очереди 4).
 *
 * astronomy-engine считает UT1 = UTC и сам переводит в земное время (TT)
 * по таблице ΔT, поэтому ни ΔT, ни секунды координации здесь не нужны.
 */

import { MakeTime } from "astronomy-engine";

export const J2000_JD = 2451545.0;
const MS_PER_DAY = 86_400_000;

/** Юлианская дата по всемирному времени. */
export function julianDay(date: Date): number {
  return date.getTime() / MS_PER_DAY + 2_440_587.5;
}

export function dateFromJulianDay(jd: number): Date {
  return new Date((jd - 2_440_587.5) * MS_PER_DAY);
}

/** Юлианские столетия земного времени (TT) от J2000 — для полиномов. */
export function julianCenturiesTT(date: Date): number {
  return MakeTime(date).tt / 36525;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}
