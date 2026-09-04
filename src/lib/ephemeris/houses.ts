/**
 * Дома гороскопа: асцендент, середина неба и куспиды двенадцати домов.
 *
 * Системы: Плацидус (по умолчанию), Кох, Порфирий, равнодомная,
 * целознаковая. Плацидус и Кох не определены за полярным кругом
 * (широта выше 90° − ε ≈ 66,5°): там автоматически считается Порфирий,
 * а в результате стоит fallback: true, чтобы интерфейс мог об этом сказать.
 *
 * Обозначения: φ — широта места, ε — наклон эклиптики, ARMC — прямое
 * восхождение середины неба (местное звёздное время в градусах).
 */

import { acosd, angleDiff, asind, atan2d, atand, cosd, norm360, sind, tand } from "./angles";
import { armc as armcOf, trueObliquity } from "./frames";

export type HouseSystem = "placidus" | "koch" | "porphyry" | "equal" | "whole";

export const HOUSE_SYSTEMS: Array<{ id: HouseSystem; name: string }> = [
  { id: "placidus", name: "Плацидус" },
  { id: "koch", name: "Кох" },
  { id: "porphyry", name: "Порфирий" },
  { id: "equal", name: "Равнодомная" },
  { id: "whole", name: "Целознаковая" },
];

export type Houses = {
  /** какую систему просили */
  requested: HouseSystem;
  /** какая посчитана на самом деле */
  system: HouseSystem;
  /** true, если просили Плацидус или Кох, а место за полярным кругом */
  fallback: boolean;
  /** куспиды домов 1…12, индекс 0 — первый дом (асцендент) */
  cusps: number[];
  asc: number;
  mc: number;
  ic: number;
  dsc: number;
  armc: number;
  obliquity: number;
  latitude: number;
  longitude: number;
};

/** Широта, выше которой Плацидус и Кох не считаем. */
export const POLAR_LATITUDE = 66;

/** Середина неба по ARMC. */
export function midheaven(armc: number, eps: number): number {
  return norm360(atan2d(sind(armc), cosd(armc) * cosd(eps)));
}

/**
 * Асцендент по ARMC, широте и наклону эклиптики. Всегда возвращает точку
 * в восточной половине круга, то есть в пределах 180° после MC.
 */
export function ascendant(armc: number, phi: number, eps: number): number {
  const y = cosd(armc);
  const x = -(sind(armc) * cosd(eps) + tand(phi) * sind(eps));
  let asc = norm360(atan2d(y, x));
  const mc = midheaven(armc, eps);
  if (angleDiff(asc, mc) <= 0) asc = norm360(asc + 180);
  return asc;
}

/** Долгота точки эклиптики по её прямому восхождению. */
function longitudeFromRA(ra: number, eps: number): number {
  return norm360(atan2d(sind(ra), cosd(ra) * cosd(eps)));
}

/**
 * Куспид Плацидуса итерацией. Дневные куспиды (11, 12): точка, прошедшая
 * заданную долю своей дневной полудуги до кульминации. Ночные (2, 3):
 * точка, прошедшая долю ночной полудуги после нижней кульминации.
 * Возвращает null, если точка не восходит и не заходит (Заполярье).
 */
function placidusCusp(
  armc: number,
  phi: number,
  eps: number,
  startOffset: number,
  fraction: number,
  nocturnal: boolean,
): number | null {
  let ra = norm360(armc + startOffset);
  for (let i = 0; i < 60; i++) {
    const dec = atand(tand(eps) * sind(ra));
    const x = -tand(phi) * tand(dec);
    if (Math.abs(x) > 1) return null;
    const semiArc = acosd(x);
    const next = nocturnal
      ? norm360(armc + 180 - fraction * (180 - semiArc))
      : norm360(armc + fraction * semiArc);
    const done = Math.abs(angleDiff(next, ra)) < 1e-10;
    ra = next;
    if (done) break;
  }
  return longitudeFromRA(ra, eps);
}

function placidus(armc: number, phi: number, eps: number): number[] | null {
  const c11 = placidusCusp(armc, phi, eps, 30, 1 / 3, false);
  const c12 = placidusCusp(armc, phi, eps, 60, 2 / 3, false);
  const c2 = placidusCusp(armc, phi, eps, 120, 2 / 3, true);
  const c3 = placidusCusp(armc, phi, eps, 150, 1 / 3, true);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  const asc = ascendant(armc, phi, eps);
  const mc = midheaven(armc, eps);
  return withOpposites([asc, c2, c3, norm360(mc + 180), 0, 0, 0, 0, 0, mc, c11, c12]);
}

/**
 * Кох: куспиды 11, 12, 2, 3 — асценденты в моменты, когда градус MC
 * прошёл треть и две трети своей полудуги до и после кульминации.
 */
function koch(armc: number, phi: number, eps: number): number[] | null {
  const mc = midheaven(armc, eps);
  const decMc = asind(sind(eps) * sind(mc));
  const x = tand(phi) * tand(decMc);
  if (Math.abs(x) > 1) return null;
  const semiArc = 90 + asind(x);
  const asc = ascendant(armc, phi, eps);
  const c11 = ascendant(norm360(armc - (2 * semiArc) / 3), phi, eps);
  const c12 = ascendant(norm360(armc - semiArc / 3), phi, eps);
  const c2 = ascendant(norm360(armc + semiArc / 3), phi, eps);
  const c3 = ascendant(norm360(armc + (2 * semiArc) / 3), phi, eps);
  return withOpposites([asc, c2, c3, norm360(mc + 180), 0, 0, 0, 0, 0, mc, c11, c12]);
}

/** Порфирий: каждая четверть между угловыми точками делится на три. */
function porphyry(asc: number, mc: number): number[] {
  const ic = norm360(mc + 180);
  const dsc = norm360(asc + 180);
  const q1 = norm360(ic - asc);
  const q2 = norm360(dsc - ic);
  const q3 = norm360(mc - dsc);
  const q4 = norm360(asc - mc);
  return [
    asc,
    norm360(asc + q1 / 3),
    norm360(asc + (2 * q1) / 3),
    ic,
    norm360(ic + q2 / 3),
    norm360(ic + (2 * q2) / 3),
    dsc,
    norm360(dsc + q3 / 3),
    norm360(dsc + (2 * q3) / 3),
    mc,
    norm360(mc + q4 / 3),
    norm360(mc + (2 * q4) / 3),
  ];
}

/** Дома 4…9 напротив домов 10…3. */
function withOpposites(c: number[]): number[] {
  c[4] = norm360(c[10] + 180);
  c[5] = norm360(c[11] + 180);
  c[6] = norm360(c[0] + 180);
  c[7] = norm360(c[1] + 180);
  c[8] = norm360(c[2] + 180);
  return c;
}

/** Куспиды домов для момента (UTC) и места. Долгота восточная положительная. */
export function houses(
  date: Date,
  latitude: number,
  longitude: number,
  requested: HouseSystem = "placidus",
): Houses {
  const eps = trueObliquity(date);
  const ramc = armcOf(date, longitude);
  const phi = Math.max(-89.9, Math.min(89.9, latitude));
  const asc = ascendant(ramc, phi, eps);
  const mc = midheaven(ramc, eps);

  let cusps: number[] | null = null;
  let system: HouseSystem = requested;
  const polar = Math.abs(phi) > POLAR_LATITUDE;

  if (requested === "placidus" && !polar) cusps = placidus(ramc, phi, eps);
  else if (requested === "koch" && !polar) cusps = koch(ramc, phi, eps);
  else if (requested === "equal") cusps = Array.from({ length: 12 }, (_, i) => norm360(asc + 30 * i));
  else if (requested === "whole") {
    const start = Math.floor(asc / 30) * 30;
    cusps = Array.from({ length: 12 }, (_, i) => norm360(start + 30 * i));
  }

  if (cusps === null) {
    system = "porphyry";
    cusps = porphyry(asc, mc);
  }

  return {
    requested,
    system,
    fallback: system !== requested,
    cusps,
    asc,
    mc,
    ic: norm360(mc + 180),
    dsc: norm360(asc + 180),
    armc: ramc,
    obliquity: eps,
    latitude,
    longitude,
  };
}

/** Номер дома (1…12), в который попадает долгота. */
export function houseOf(longitude: number, cusps: number[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i++) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    const span = norm360(b - a);
    if (span === 0) continue;
    if (norm360(lon - a) < span) return i + 1;
  }
  return 12;
}
