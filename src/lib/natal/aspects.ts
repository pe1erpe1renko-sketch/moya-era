/**
 * Аспекты — угловые расстояния между позициями карты.
 *
 * Пять главных аспектов классической астрологии. Орбис (допуск) зависит от
 * аспекта и от того, участвуют ли светила: у Солнца и Луны орбис шире, это
 * общепринятая практика. Аспекты к асценденту и середине неба считаются
 * только когда известно время и место рождения.
 */

import { angleDiff, type BodyId } from "@/lib/ephemeris";

export type AspectKey = "conjunction" | "sextile" | "square" | "trine" | "opposition";

/** Точка карты, между которыми ищутся аспекты: планета или угол. */
export type AspectPoint = BodyId | "asc" | "mc";

export type AspectInfo = {
  key: AspectKey;
  /** «Соединение» */
  name: string;
  /** точный угол */
  angle: number;
  glyph: string;
  /** базовый орбис, градусы */
  orb: number;
  /** прибавка к орбису, если участвует Солнце или Луна */
  luminaryBonus: number;
  /** гармоничный, напряжённый или нейтральный — для цвета линии */
  tone: "soft" | "hard" | "neutral";
};

export const ASPECTS: Record<AspectKey, AspectInfo> = {
  conjunction: { key: "conjunction", name: "Соединение", angle: 0, glyph: "☌", orb: 6, luminaryBonus: 2, tone: "neutral" },
  sextile: { key: "sextile", name: "Секстиль", angle: 60, glyph: "⚹", orb: 4, luminaryBonus: 1, tone: "soft" },
  square: { key: "square", name: "Квадрат", angle: 90, glyph: "□", orb: 6, luminaryBonus: 2, tone: "hard" },
  trine: { key: "trine", name: "Тригон", angle: 120, glyph: "△", orb: 6, luminaryBonus: 2, tone: "soft" },
  opposition: { key: "opposition", name: "Оппозиция", angle: 180, glyph: "☍", orb: 6, luminaryBonus: 2, tone: "hard" },
};

export const ASPECT_ORDER: AspectKey[] = ["conjunction", "opposition", "trine", "square", "sextile"];

export type Aspect = {
  a: AspectPoint;
  b: AspectPoint;
  aspect: AspectInfo;
  /** отклонение от точного угла, градусы */
  orb: number;
  /** true, если аспект сходится (планеты ещё сближаются) */
  applying: boolean;
  /** 0…1, насколько аспект точен: 1 — точный */
  strength: number;
};

const LUMINARIES = new Set<AspectPoint>(["sun", "moon"]);

export type AspectSource = { point: AspectPoint; longitude: number; speed: number };

/**
 * Ищет аспекты между всеми парами точек. Порядок в паре нормализован по
 * `order`, чтобы ключ текста был устойчивым: «солнце — луна», а не наоборот.
 */
export function findAspects(points: AspectSource[], order: AspectPoint[]): Aspect[] {
  const rank = new Map(order.map((p, i) => [p, i]));
  const out: Aspect[] = [];

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const first = points[i];
      const second = points[j];
      const separation = Math.abs(angleDiff(first.longitude, second.longitude));
      const withLuminary = LUMINARIES.has(first.point) || LUMINARIES.has(second.point);

      for (const key of ASPECT_ORDER) {
        const info = ASPECTS[key];
        const orb = Math.abs(separation - info.angle);
        const allowed = info.orb + (withLuminary ? info.luminaryBonus : 0);
        if (orb > allowed) continue;

        // Сходится ли аспект: смотрим, уменьшится ли отклонение через час.
        const step = 1 / 24;
        const later = Math.abs(
          Math.abs(angleDiff(first.longitude + first.speed * step, second.longitude + second.speed * step)) - info.angle,
        );
        const [a, b] =
          (rank.get(first.point) ?? 99) <= (rank.get(second.point) ?? 99)
            ? [first.point, second.point]
            : [second.point, first.point];

        out.push({ a, b, aspect: info, orb, applying: later < orb, strength: 1 - orb / allowed });
        break; // одна пара — один аспект
      }
    }
  }

  out.sort((x, y) => y.strength - x.strength);
  return out;
}
