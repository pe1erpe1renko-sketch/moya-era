/**
 * Сборка карты дня: что показывать по дате рождения сегодня.
 *
 * Названия арканов берутся из общего справочника `lib/arcana`, того же,
 * что у матрицы и быстрого расчёта. Тяжёлые арканы там называются
 * по-нашему: тринадцатый — Перерождение, пятнадцатый — Искушение,
 * шестнадцатый — Обновление. Это решение принято давно и держится по
 * всему сайту: со «Смертью» и «Дьяволом» человек читает не текст, а свой
 * испуг, и разбор до него не доходит.
 */

import { arcana, centralArcanum } from "@/lib/arcana";
import { dayCardArcanum, moscowDay } from "./day";
import type { DayCard } from "./sections";

export type ArcanumInfo = { n: number; name: string; line: string };

/** Аркан по номеру. Номера вне 1..22 не бывает: и хэш, и свёртка дают его. */
export function arcanumInfo(n: number): ArcanumInfo {
  const card = arcana.find((a) => a.n === n);
  return { n, name: card?.name ?? "", line: card?.line ?? "" };
}

/**
 * Карта дня для этой даты рождения.
 * @param now момент, по которому определяются московские сутки
 */
export function buildDayCard(birthIso: string, now: Date = new Date()): DayCard | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  const today = moscowDay(now);
  return {
    birth: birthIso,
    day: today,
    arcanum: dayCardArcanum(birthIso, today),
    birthArcanum: centralArcanum(day, month, year),
  };
}
