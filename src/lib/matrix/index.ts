/**
 * Обёртка над движком матрицы для приложения.
 *
 * Сам движок (matrixEngine.js) и карта позиций (contentPositions.js)
 * перенесены без изменений — методика закрыта. Здесь только то, что нужно
 * сайту: адреса, разбор дат из URL, сборка разделов для любого типа разбора.
 */

import {
  calculateMatrix,
  calculatePair,
  type Matrix,
  type PairMatrix,
} from "./matrixEngine";
import {
  CALC_TYPES,
  FORECAST_VIEW,
  calcTypeBySlug,
  resolvePath,
  textKey,
  dailyTextKey,
  type CalcType,
  type Section,
  type SectionData,
} from "./contentPositions";
import { arcana as arcanaList } from "@/lib/arcana";

export * from "./matrixEngine";
export * from "./contentPositions";

/* ────────────────────────────────────────────────────────────────────
 * Даты в адресе: /matrica/13-07-1998
 * ──────────────────────────────────────────────────────────────────── */

const URL_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** '13-07-1998' → '1998-07-13'. null, если формат не тот или даты не существует. */
export function urlDateToIso(slug: string): string | null {
  const m = URL_DATE.exec(slug);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  const parsed = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (parsed.getUTCMonth() !== Number(mo) - 1 || parsed.getUTCDate() !== Number(d)) return null;
  const year = Number(y);
  if (year < 1900 || year > new Date().getFullYear()) return null;
  return iso;
}

/** '1998-07-13' → '13-07-1998' */
export function isoToUrlDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** '1998-07-13' → '13.07.1998' */
export function formatDateDots(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** Адрес разбора: readingPath('matrica', ['1998-07-13']) → '/matrica/13-07-1998' */
export function readingPath(slug: string, isoDates: string[]): string {
  return `/${slug}/${isoDates.map(isoToUrlDate).join("/")}`;
}

/** Все типы разбора вместе с прогнозом — для маршрутизации и sitemap. */
export const ALL_CALC_TYPES: CalcType[] = [...CALC_TYPES, FORECAST_VIEW];

export function calcTypeByAnySlug(slug: string): CalcType | null {
  if (slug === FORECAST_VIEW.slug) return FORECAST_VIEW;
  return calcTypeBySlug(slug);
}

/* ────────────────────────────────────────────────────────────────────
 * Расчёт по типу
 * ──────────────────────────────────────────────────────────────────── */

export type Reading =
  | { kind: "single"; type: CalcType; dates: [string]; matrix: Matrix }
  | { kind: "pair"; type: CalcType; dates: [string, string]; matrix: PairMatrix };

/** Считает матрицу или пару по типу и датам. Бросает, если дат не столько. */
export function computeReading(type: CalcType, isoDates: string[], now = new Date()): Reading {
  if (type.pair) {
    if (isoDates.length !== 2) throw new Error("Для парного разбора нужны две даты");
    return {
      kind: "pair",
      type,
      dates: [isoDates[0], isoDates[1]],
      matrix: calculatePair(isoDates[0], isoDates[1], now),
    };
  }
  if (isoDates.length !== 1) throw new Error("Для личного разбора нужна одна дата");
  return { kind: "single", type, dates: [isoDates[0]], matrix: calculateMatrix(isoDates[0], now) };
}

/* ────────────────────────────────────────────────────────────────────
 * Разделы для экрана: любой тип, личный или парный
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Раскрывает разделы типа разбора в данные для экрана.
 * Логика та же, что в buildSectionData() из карты позиций, но работает
 * для любого набора разделов, включая парные и тематические.
 */
export function buildReadingSections(
  sections: Section[],
  matrix: Matrix | PairMatrix,
  { unlocked = false }: { unlocked?: boolean } = {},
): SectionData[] {
  const today = "today" in matrix ? matrix.today : null;
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    lead: section.lead,
    access: section.access,
    locked: section.access === "paid" && !unlocked && !section.slots.some((x) => x.free),
    slots: section.slots.map((slot) => {
      const arcana = resolvePath(matrix, slot.path);
      const key =
        (section.daily || slot.daily) && today
          ? dailyTextKey(arcana, today.arcana, today.date)
          : textKey(slot.id, arcana);
      const locked = section.access === "paid" && !unlocked && !slot.free;
      return { id: slot.id, label: slot.label, arcana, key, locked, free: !!slot.free };
    }),
  }));
}

/** Сколько вопросов открыто бесплатно в наборе разделов. */
export function countFreeSlots(sections: Section[]): { free: number; total: number } {
  let free = 0;
  let total = 0;
  for (const s of sections) {
    for (const slot of s.slots) {
      total += 1;
      if (s.access === "free" || slot.free) free += 1;
    }
  }
  return { free, total };
}

/* ────────────────────────────────────────────────────────────────────
 * Названия арканов для интерфейса — из единого массива сайта
 * (там тяжёлые арканы уже переименованы по брифу)
 * ──────────────────────────────────────────────────────────────────── */

export function arcanaName(n: number): string {
  return arcanaList.find((a) => a.n === n)?.name ?? `Аркан ${n}`;
}

export function arcanaLine(n: number): string {
  return arcanaList.find((a) => a.n === n)?.line ?? "";
}

/** «13 июля 1998» */
const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`;
}

const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
export function weekdayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}
