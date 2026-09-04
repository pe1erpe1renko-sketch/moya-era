/**
 * Лунные узлы и Лилит.
 *
 * Истинный узел — оскулирующий: из геоцентрического вектора положения и
 * скорости Луны на этот момент, как в Swiss Ephemeris (SE_TRUE_NODE).
 * Средний узел и средний апогей (Лилит) — полиномы по времени из теории
 * ELP-2000 (Meeus, гл. 47).
 */

import * as A from "astronomy-engine";
import { atan2d, norm360 } from "./angles";
import { julianCenturiesTT } from "./time";

/** Долгота истинного (оскулирующего) восходящего узла Луны, градусы. */
export function trueNodeLongitude(date: Date): number {
  const t = A.MakeTime(date);
  const s = A.RotateState(A.Rotation_EQJ_ECT(t), A.GeoMoonState(t));
  // Момент импульса h = r × v; линия узлов n = ẑ × h = (−h_y, h_x, 0).
  const hx = s.y * s.vz - s.z * s.vy;
  const hy = s.z * s.vx - s.x * s.vz;
  return norm360(atan2d(hx, -hy));
}

/** Долгота среднего восходящего узла Луны, градусы. */
export function meanNodeLongitude(date: Date): number {
  const T = julianCenturiesTT(date);
  return norm360(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000,
  );
}

/** Долгота среднего апогея лунной орбиты — Лилит, градусы. */
export function meanLilithLongitude(date: Date): number {
  const T = julianCenturiesTT(date);
  const perigee =
    83.3532465 + 4069.0137287 * T - 0.01032 * T * T - (T * T * T) / 80053 + (T * T * T * T) / 18999000;
  return norm360(perigee + 180);
}
