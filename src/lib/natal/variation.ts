/**
 * Меняется ли натальная карта в течение суток рождения.
 *
 * Без времени рождения асцендент и дома не считаются вовсе — об этом
 * сказано отдельно. Но и знаки планет могут за сутки смениться: Луна
 * проходит знак за два с половиной дня, поэтому в день перехода её знак
 * назвать нельзя. Изредка на границе знака оказывается и Солнце.
 *
 * Проверяем честно: если за сутки ни одна планета не сменила знак —
 * показываем результат без оговорок.
 */

import { clockLabel, formatLocalClock, scanDay, type DayChange } from "@/lib/geo/dayScan";
import { BODIES, bodyLongitude, signAt, type BodyId } from "@/lib/ephemeris";
import { CHART_BODIES } from "./chart";

/** Знаки всех тел карты — то, что должно совпасть за сутки. */
export type NatalSignature = Partial<Record<BodyId, string>>;

export function natalSignature(utc: Date): NatalSignature {
  const out: NatalSignature = {};
  for (const body of CHART_BODIES) out[body] = signAt(bodyLongitude(body, utc)).key;
  return out;
}

function sameSignature(a: NatalSignature, b: NatalSignature): boolean {
  return CHART_BODIES.every((body) => a[body] === b[body]);
}

export type NatalDayVariation = {
  stable: boolean;
  facts: string[];
};

function describeChange(change: DayChange<NatalSignature>, tz: string | null, placeName: string | null): string[] {
  const at = `в ${formatLocalClock(change.at, tz)} ${clockLabel(placeName)}`;
  const out: string[] = [];
  for (const body of CHART_BODIES) {
    const from = change.from[body];
    const to = change.to[body];
    if (!from || !to || from === to) continue;
    const fromSign = signAt(SIGN_START[from]).name;
    const toSign = signAt(SIGN_START[to]).name;
    out.push(`${BODIES[body].name} переходит из знака ${fromSign} в знак ${toSign} ${at}`);
  }
  return out;
}

/** Долгота начала знака по его ключу — чтобы получить название из ключа. */
const SIGN_START: Record<string, number> = {
  aries: 0,
  taurus: 30,
  gemini: 60,
  cancer: 90,
  leo: 120,
  virgo: 150,
  libra: 180,
  scorpio: 210,
  sagittarius: 240,
  capricorn: 270,
  aquarius: 300,
  pisces: 330,
};

/**
 * Меняются ли знаки планет за сутки рождения.
 * Вызывать только когда время рождения неизвестно.
 */
export function natalDayVariation(date: string, tz: string | null, placeName: string | null): NatalDayVariation {
  const scan = scanDay(date, tz, natalSignature, sameSignature);
  const facts = scan.changes.flatMap((c) => describeChange(c, tz, placeName)).slice(0, 3);
  return { stable: scan.stable, facts };
}
