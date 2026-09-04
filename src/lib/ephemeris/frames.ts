/**
 * Системы координат: наклон эклиптики и звёздное время.
 *
 * Все положения в движке даются относительно ИСТИННОЙ эклиптики и
 * равноденствия даты (с прецессией и нутацией). Это то, что показывают
 * астрологические программы и чего ждёт тропический зодиак.
 */

import * as A from "astronomy-engine";
import { atan2d, norm360 } from "./angles";
import { julianCenturiesTT } from "./time";

/** Истинный наклон эклиптики к экватору даты, градусы. */
export function trueObliquity(date: Date): number {
  const t = A.MakeTime(date);
  // Ось Y экватора даты (точка RA 6h, Dec 0) лежит на широте −ε от эклиптики.
  const v = A.RotateVector(A.Rotation_EQD_ECT(t), new A.Vector(0, 1, 0, t));
  return atan2d(-v.z, v.y);
}

/**
 * Средний наклон эклиптики (Laskar, Meeus 22.3) — только для проверок:
 * истинный отличается от него на нутацию, до 10″.
 */
export function meanObliquity(date: Date): number {
  const U = julianCenturiesTT(date) / 100;
  const c = [-4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45];
  let sec = 0;
  let p = U;
  for (const k of c) {
    sec += k * p;
    p *= U;
  }
  return 23 + 26 / 60 + (21.448 + sec) / 3600;
}

/** Истинное звёздное время в Гринвиче (GAST), градусы [0, 360). */
export function siderealTime(date: Date): number {
  return norm360(A.SiderealTime(date) * 15);
}

/**
 * Прямое восхождение середины неба (ARMC) — местное звёздное время в
 * градусах. Долгота восточная положительная.
 */
export function armc(date: Date, longitudeEast: number): number {
  return norm360(siderealTime(date) + longitudeEast);
}
