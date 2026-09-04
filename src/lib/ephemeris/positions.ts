/**
 * Положения тел: видимые геоцентрические эклиптические координаты
 * относительно истинной эклиптики и равноденствия даты.
 *
 * Планеты и Солнце: GeoVector с поправкой на аберрацию и время хода света,
 * затем поворот в эклиптику даты. Луна: EclipticGeoMoon. Точность против
 * JPL DE421 — единицы угловых секунд (см. ephemeris.test.ts).
 */

import * as A from "astronomy-engine";
import { angleDiff, norm360 } from "./angles";
import { NATAL_BODIES, type BodyId } from "./bodies";
import { meanLilithLongitude, meanNodeLongitude, trueNodeLongitude } from "./nodes";
import { addDays } from "./time";

export type NodeType = "true" | "mean";

export type PositionOptions = {
  /** истинный (по умолчанию) или средний узел */
  nodeType?: NodeType;
};

export type EclipticPosition = {
  body: BodyId;
  /** долгота, [0, 360) */
  longitude: number;
  /** широта, градусы; у узлов и Лилит 0 */
  latitude: number;
  /** расстояние в а. е.; у расчётных точек null */
  distance: number | null;
  /** скорость по долготе, градусов в сутки */
  speed: number;
  retrograde: boolean;
};

type Spherical = { lon: number; lat: number; dist: number };

const PLANET: Partial<Record<BodyId, A.Body>> = {
  sun: A.Body.Sun,
  mercury: A.Body.Mercury,
  venus: A.Body.Venus,
  mars: A.Body.Mars,
  jupiter: A.Body.Jupiter,
  saturn: A.Body.Saturn,
  uranus: A.Body.Uranus,
  neptune: A.Body.Neptune,
  pluto: A.Body.Pluto,
};

function planetOfDate(body: A.Body, t: A.AstroTime): Spherical {
  const eqj = A.GeoVector(body, t, true);
  const ect = A.RotateVector(A.Rotation_EQJ_ECT(t), eqj);
  const s = A.SphereFromVector(ect);
  return { lon: norm360(s.lon), lat: s.lat, dist: s.dist };
}

function moonOfDate(t: A.AstroTime): Spherical {
  const s = A.EclipticGeoMoon(t);
  return { lon: norm360(s.lon), lat: s.lat, dist: s.dist };
}

/** Сферические координаты тела без скорости. */
export function bodyCoordinates(body: BodyId, date: Date, opts: PositionOptions = {}): Spherical | null {
  const t = A.MakeTime(date);
  if (body === "moon") return moonOfDate(t);
  if (body === "earth") {
    const sun = planetOfDate(A.Body.Sun, t);
    return { lon: norm360(sun.lon + 180), lat: -sun.lat, dist: sun.dist };
  }
  if (body === "north_node" || body === "south_node") {
    const node = (opts.nodeType ?? "true") === "mean" ? meanNodeLongitude(date) : trueNodeLongitude(date);
    return { lon: body === "north_node" ? node : norm360(node + 180), lat: 0, dist: NaN };
  }
  if (body === "lilith") return { lon: meanLilithLongitude(date), lat: 0, dist: NaN };
  const planet = PLANET[body];
  if (planet === undefined) return null;
  return planetOfDate(planet, t);
}

/** Долгота тела, градусы. */
export function bodyLongitude(body: BodyId, date: Date, opts: PositionOptions = {}): number {
  const c = bodyCoordinates(body, date, opts);
  if (!c) throw new Error(`Неизвестное тело: ${body}`);
  return c.lon;
}

/** Шаг для численной скорости: час в обе стороны. */
const SPEED_STEP_DAYS = 1 / 24;

/** Положение тела со скоростью и признаком ретроградности. */
export function bodyPosition(body: BodyId, date: Date, opts: PositionOptions = {}): EclipticPosition {
  const c = bodyCoordinates(body, date, opts);
  if (!c) throw new Error(`Неизвестное тело: ${body}`);
  const before = bodyLongitude(body, addDays(date, -SPEED_STEP_DAYS), opts);
  const after = bodyLongitude(body, addDays(date, SPEED_STEP_DAYS), opts);
  const speed = angleDiff(after, before) / (2 * SPEED_STEP_DAYS);
  return {
    body,
    longitude: c.lon,
    latitude: c.lat,
    distance: Number.isNaN(c.dist) ? null : c.dist,
    speed,
    retrograde: speed < 0,
  };
}

/** Положения набора тел на один момент. */
export function positions(date: Date, bodies: BodyId[] = NATAL_BODIES, opts: PositionOptions = {}): EclipticPosition[] {
  return bodies.map((b) => bodyPosition(b, date, opts));
}
