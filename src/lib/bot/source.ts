/**
 * ОТКУДА БЕРУТСЯ ЧИСЛА СВОДКИ.
 *
 * Одна функция на всех: и бот, и кабинет считают одним и тем же кодом.
 * Иначе однажды разойдутся — а сводка обязана совпадать с тем, что
 * человек увидит в кабинете в тот же день.
 *
 * День везде московский: карта дня меняется у всех в один момент, и
 * аркан дня со сводкой не должны от него отставать.
 */

import { calculateMatrix } from "@/lib/matrix";
import { dayCardArcanum, moscowDay } from "@/lib/tarot";
import { personalDay } from "@/lib/numerology";
import type { DigestSource } from "./digest";

/**
 * Числа сводки по дате рождения.
 * @param name имя для обращения; на числа не влияет
 */
export function buildDigestSource(birthIso: string, name: string | null, now: Date = new Date()): DigestSource | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso);
  if (!m) return null;

  const day = moscowDay(now);
  let matrix: DigestSource["matrix"] = null;
  try {
    const built = calculateMatrix(birthIso, new Date(`${day}T12:00:00Z`));
    matrix = { dayArcana: built.today.dayArcana, periodArcana: built.today.arcana };
  } catch {
    matrix = null;
  }

  return {
    name,
    day,
    matrix,
    tarot: dayCardArcanum(birthIso, day),
    numerology: personalDay(Number(m[3]), Number(m[2]), day),
  };
}
