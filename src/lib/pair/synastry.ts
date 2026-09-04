/**
 * СИНАСТРИЯ — сравнение двух натальных карт.
 *
 * Считается два взгляда:
 *  - межкарточные аспекты: планета одного и планета другого. Порядок важен:
 *    «Солнце первого в квадрате к Луне второго» и «Луна первого в квадрате
 *    к Солнцу второго» — разные конфигурации и разные тексты;
 *  - наложение домов: в какую область жизни одного попадает планета
 *    другого. Считается только когда у обоих известны время и место, —
 *    без них домов не существует, и мы честно об этом говорим.
 *
 * Аспекты между двумя высшими планетами не считаем: у ровесников они
 * одинаковы и про пару ничего не говорят.
 */

import { ASPECTS, ASPECT_ORDER, type AspectInfo, type AspectKey, type AspectPoint } from "@/lib/natal";
import { chartBody, type NatalChart } from "@/lib/natal";
import { angleDiff, houseOf, type BodyId } from "@/lib/ephemeris";

/** Точки синастрии. Узел не берём: в паре он мало что добавляет. */
export const SYNASTRY_POINTS: AspectPoint[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "asc",
];

/** Медленные планеты: их взаимные аспекты общие у целого поколения. */
const SLOW = new Set<AspectPoint>(["jupiter", "saturn", "uranus", "neptune", "pluto"]);

/** Пара точек, о которой имеет смысл писать текст. */
export function synastryPairAllowed(a: AspectPoint, b: AspectPoint): boolean {
  return !(SLOW.has(a) && SLOW.has(b));
}

/** Планеты, по которым определяется главная связь пары. */
export const BRIEF_POINTS: AspectPoint[] = ["sun", "moon", "venus", "mars"];

export type SynastryAspect = {
  /** точка первого человека */
  a: AspectPoint;
  /** точка второго человека */
  b: AspectPoint;
  aspect: AspectInfo;
  orb: number;
  /** 0…1, насколько аспект точен */
  strength: number;
};

export type HouseOverlay = {
  /** чья планета: 0 — первый человек, 1 — второй */
  owner: 0 | 1;
  body: BodyId;
  /** дом в карте другого */
  house: number;
};

export type Synastry = {
  first: NatalChart;
  second: NatalChart;
  /** межкарточные аспекты, самые точные первыми */
  aspects: SynastryAspect[];
  /** наложение домов; пусто, если у кого-то нет времени и места */
  overlays: HouseOverlay[];
  /** главная связь пары — самый точный аспект между личными планетами */
  leading: SynastryAspect | null;
  unknown: {
    /** домов нет: у одного или обоих неизвестны время и место */
    houses: boolean;
    /** у первого нет точного момента рождения */
    firstTime: boolean;
    /** у второго нет точного момента рождения */
    secondTime: boolean;
  };
};

const LUMINARIES = new Set<AspectPoint>(["sun", "moon"]);

function longitudeOf(chart: NatalChart, point: AspectPoint): number | null {
  if (point === "asc") return chart.asc?.longitude ?? null;
  if (point === "mc") return chart.mc?.longitude ?? null;
  return chartBody(chart, point)?.longitude ?? null;
}

/** Аспект между двумя долготами или null, если ни один не попадает в орбис. */
function aspectBetween(
  first: number,
  second: number,
  withLuminary: boolean,
): { aspect: AspectInfo; orb: number; strength: number } | null {
  const separation = Math.abs(angleDiff(first, second));
  for (const key of ASPECT_ORDER) {
    const info = ASPECTS[key];
    const orb = Math.abs(separation - info.angle);
    const allowed = info.orb + (withLuminary ? info.luminaryBonus : 0);
    if (orb <= allowed) return { aspect: info, orb, strength: 1 - orb / allowed };
  }
  return null;
}

/** Планеты, которые раскладываются по домам другого человека. */
const OVERLAY_BODIES: BodyId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

export function buildSynastry(first: NatalChart, second: NatalChart): Synastry {
  const aspects: SynastryAspect[] = [];

  for (const a of SYNASTRY_POINTS) {
    const lonA = longitudeOf(first, a);
    if (lonA === null) continue;
    for (const b of SYNASTRY_POINTS) {
      if (!synastryPairAllowed(a, b)) continue;
      const lonB = longitudeOf(second, b);
      if (lonB === null) continue;
      const found = aspectBetween(lonA, lonB, LUMINARIES.has(a) || LUMINARIES.has(b));
      if (found) aspects.push({ a, b, ...found });
    }
  }
  aspects.sort((x, y) => y.strength - x.strength);

  const overlays: HouseOverlay[] = [];
  const firstCusps = first.houses?.cusps ?? null;
  const secondCusps = second.houses?.cusps ?? null;
  if (firstCusps && secondCusps) {
    for (const body of OVERLAY_BODIES) {
      const one = chartBody(first, body);
      const two = chartBody(second, body);
      if (one) overlays.push({ owner: 0, body, house: houseOf(one.longitude, secondCusps) });
      if (two) overlays.push({ owner: 1, body, house: houseOf(two.longitude, firstCusps) });
    }
  }

  const leading =
    aspects.find((x) => BRIEF_POINTS.includes(x.a) && BRIEF_POINTS.includes(x.b)) ?? null;

  return {
    first,
    second,
    aspects,
    overlays,
    leading,
    unknown: {
      houses: !firstCusps || !secondCusps,
      firstTime: first.moment.precision !== "exact",
      secondTime: second.moment.precision !== "exact",
    },
  };
}

/** Ключ текста главной связи. Без аспекта между личными планетами — общий текст. */
export function synastryBriefKey(synastry: Synastry): string {
  const lead = synastry.leading;
  return lead ? `syn_brief_${lead.a}_${lead.b}_${lead.aspect.key}` : "syn_brief_none";
}

/** Ключ текста межкарточного аспекта. */
export function synastryAspectKey(a: AspectPoint, b: AspectPoint, aspect: AspectKey): string {
  return `syn_aspect_${a}_${b}_${aspect}`;
}

/** Ключ текста наложения домов: планета одного в доме другого. */
export function synastryHouseKey(body: BodyId, house: number): string {
  return `syn_house_${body}_${house}`;
}
