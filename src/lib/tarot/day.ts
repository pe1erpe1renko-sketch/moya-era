/**
 * КАРТА ДНЯ — какой аркан выпадает этой дате рождения сегодня.
 *
 * ДЕНЬ СЧИТАЕТСЯ ПО МОСКВЕ, и это не мелочь. Карта у всех должна
 * меняться в один момент: иначе двое в разных поясах в один и тот же час
 * увидят разные карты и будут спорить, у кого правильная. Московская
 * полночь — понятная всем точка отсчёта, как и часы во всех остальных
 * разборах.
 *
 * ВЫБОР КАРТЫ ДЕТЕРМИНИРОВАННЫЙ. Одна и та же дата рождения в один и тот
 * же день всегда даёт один и тот же аркан: ни случайности, ни хранения.
 * Механика взята из `dayCard.ts` — той же, что показывает карту дня в
 * личном кабинете, — чтобы карта на странице и карта в кабинете не
 * разошлись.
 */

import { dayArcanum } from "@/lib/dayCard";
import { DEFAULT_TZ } from "@/lib/geo/dayScan";
import { localToUtc, zoneOffsetSeconds } from "@/lib/geo/localTime";

/** Московские сутки, в которых находится момент: '2026-09-04'. */
export function moscowDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + zoneOffsetSeconds(now, DEFAULT_TZ) * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Ближайшая московская полночь — момент, когда карта сменится. */
export function nextMoscowMidnight(now: Date = new Date()): Date {
  const today = moscowDay(now);
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return localToUtc(tomorrow.toISOString().slice(0, 10), "00:00", DEFAULT_TZ).utc;
}

/**
 * Аркан дня для этой даты рождения: 1..22.
 *
 * Затравка — дата рождения и московские сутки. Ту же функцию кабинет
 * зовёт с идентификатором человека: она просто перемешивает две строки,
 * и что именно в них написано, ей всё равно.
 */
export function dayCardArcanum(birthIso: string, day: string): number {
  return dayArcanum(birthIso, day);
}
