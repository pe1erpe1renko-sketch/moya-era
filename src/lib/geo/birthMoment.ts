/**
 * Момент рождения для расчёта: дата, время и место → UTC и точность.
 *
 * Правило от заказчика: если время неизвестно, считать на 12:00 местного
 * времени и честно показывать, что асцендент, дома и всё зависящее от них
 * не определены. Ничего не выдумывать.
 */

import { formatOffset, localToUtc } from "./localTime";

export type BirthInput = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM или null, если время неизвестно */
  time: string | null;
  /** пояс IANA, если место распознано */
  tz: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * exact — время и место известны;
 * noon — место известно, время нет: полдень местного времени;
 * date_only — место не распознано: полдень UTC, положения быстрых тел
 *   (прежде всего Луны) приблизительны.
 */
export type BirthPrecision = "exact" | "noon" | "date_only";

export type BirthMoment = {
  utc: Date;
  precision: BirthPrecision;
  /** есть координаты — можно считать дома */
  hasPlace: boolean;
  tz: string | null;
  offsetMinutes: number | null;
  /** «UTC+7», для строки «время переведено как…» */
  offsetLabel: string | null;
  /** местное время рождения не существовало или было дважды из-за перевода часов */
  clockShiftNote: string | null;
};

export function resolveBirthMoment(input: BirthInput): BirthMoment {
  const hasPlace = input.latitude !== null && input.longitude !== null;
  if (input.tz) {
    const time = input.time ?? "12:00";
    const r = localToUtc(input.date, time, input.tz);
    const note = r.nonexistent
      ? "В эту ночь часы переводили вперёд, такого времени на часах не было: взято смещение до перевода"
      : r.ambiguous
        ? "В эту ночь часы переводили назад, такое время было дважды: взято первое, летнее"
        : null;
    return {
      utc: r.utc,
      precision: input.time ? "exact" : "noon",
      hasPlace,
      tz: input.tz,
      offsetMinutes: r.offsetMinutes,
      offsetLabel: formatOffset(r.offsetMinutes),
      clockShiftNote: note,
    };
  }
  const [y, m, d] = input.date.split("-").map(Number);
  return {
    utc: new Date(Date.UTC(y, m - 1, d, 12, 0, 0)),
    precision: "date_only",
    hasPlace,
    tz: null,
    offsetMinutes: null,
    offsetLabel: null,
    clockShiftNote: null,
  };
}
