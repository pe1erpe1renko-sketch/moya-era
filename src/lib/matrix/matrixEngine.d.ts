/**
 * Типы для matrixEngine.js. Сам движок не меняется — это только описание
 * его результата для TypeScript.
 */

export type CoreKey = "W" | "N" | "E" | "S" | "C" | "NW" | "NE" | "SE" | "SW";
export type Core = Record<CoreKey, number>;

export type Axis = {
  start: number;
  startOuter: number;
  startMid: number;
  startInner: number;
  center: number;
  endMid: number;
  endOuter: number;
  end: number;
};

export type Axes = { horizontal: Axis; vertical: Axis };

export type Ray = { corner: number; outer: number; mid: number };
export type Diagonals = { NW: Ray; NE: Ray; SE: Ray; SW: Ray };

export type ChakraRow = {
  key: string;
  name: string;
  sphere: string;
  color: string;
  physics: number;
  energy: number;
  emotions: number;
};

export type Chakras = {
  rows: ChakraRow[];
  total: { physics: number; energy: number; emotions: number };
};

export type Ancestral = {
  male: { first: number; second: number; result: number };
  female: { first: number; second: number; result: number };
};

export type Purpose = {
  personal: { sky: number; earth: number; result: number; title: string; hint: string };
  social: { male: number; female: number; result: number; title: string; hint: string };
  spiritual: { result: number; title: string; hint: string };
  planetary: { result: number; title: string; hint: string };
};

export type TimelinePoint = { age: number; arcana: number; kind: "decade" | "half" | "quarter" };

export type Period = {
  age: number;
  from: number;
  to: number;
  arcana: number;
  nextArcana: number;
  yearsToChange: number;
};

export type Today = Period & {
  date: string;
  dayArcana: number;
  tomorrowDate: string;
  tomorrowArcana: number;
  year: number;
  yearArcana: number;
};

export type MatrixBase = {
  core: Core;
  axes: Axes;
  diagonals: Diagonals;
  chakras: Chakras;
  ancestral: Ancestral;
  purpose: Purpose;
  timeline: TimelinePoint[];
};

export type Matrix = MatrixBase & { birthDate: string; today: Today };

export type PairMatrix = MatrixBase & {
  dates: [string, string];
  partners: { a: Matrix; b: Matrix };
};

export const POINT_CODES: Record<CoreKey, { code: CoreKey; title: string; hint: string }>;
export const CHAKRAS: Array<{ key: string; name: string; sphere: string; color: string }>;

export function toArcana(n: number): number;
export function buildCore(day: number, month: number, year: number): Core;
export function buildAxes(core: Core): Axes;
export function buildDiagonals(core: Core, anchor: number): Diagonals;
export function buildChakras(axes: Axes): Chakras;
export function buildAncestral(core: Core): Ancestral;
export function buildPurpose(core: Core, ancestral: Ancestral): Purpose;
export function buildTimeline(core: Core): TimelinePoint[];
export function currentPeriod(timeline: TimelinePoint[], birthDate: string, now?: Date): Period;
export function dayArcana(isoDate: string, periodArcana: number): number;
export function toISODate(date: Date): string;
export function yearArcana(birthDate: string, year: number): number;
export function buildToday(timeline: TimelinePoint[], birthDate: string, now?: Date): Today;
export function calculateMatrix(birthDate: string, now?: Date): Matrix;
export function buildPairCore(coreA: Core, coreB: Core): Core;
export function calculatePair(dateA: string, dateB: string, now?: Date): PairMatrix;
