import type { MatrixBase } from "@/lib/matrix/matrixEngine";
import { POINT_SLOTS } from "@/lib/matrix/contentPositions";

/**
 * Геометрия октаграммы. Все 25 точек — с координатами в viewBox 0..400.
 * Расстояния подобраны так, чтобы числа не наезжали друг на друга;
 * менять радиусы осторожно (см. механику, раздел 9).
 */

export const VB = 400;
export const CX = 200;
export const CY = 200;
export const R = 158; // радиус внешних точек
export const RING_R = 184; // кольцо возрастной шкалы

/**
 * Координаты — с точностью до тысячной доли единицы viewBox.
 *
 * `Math.cos`/`Math.sin` у Node и у браузера не обязаны совпадать в
 * последнем знаке — и не совпадают: сервер отдавал 47.00959133633165, а
 * браузер насчитал 47.009591336331624. React видел это как расхождение
 * при гидратации на каждой странице разбора. Тысячная доля при размере
 * схемы 400 единиц глазом неразличима.
 */
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const D = r3(R * Math.SQRT1_2); // проекция диагонали

export type PointKind = "outer" | "center" | "axis" | "diagonal";

export type OctaPoint = {
  id: string; // совпадает с POINT_SLOTS.id
  path: string;
  label: string;
  x: number;
  y: number;
  kind: PointKind;
  /** зона для слоёв: money | love | male | female | null */
  zone: "money" | "love" | "male" | "female" | null;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const OUTER: Record<string, [number, number]> = {
  W: [CX - R, CY],
  N: [CX, CY - R],
  E: [CX + R, CY],
  S: [CX, CY + R],
  NW: [CX - D, CY - D],
  NE: [CX + D, CY - D],
  SE: [CX + D, CY + D],
  SW: [CX - D, CY + D],
};

function pt(id: string, x: number, y: number, kind: PointKind, zone: OctaPoint["zone"] = null): OctaPoint {
  const slot = POINT_SLOTS.find((p) => p.id === id);
  if (!slot) throw new Error(`Нет слота для точки ${id}`);
  return { id, path: slot.path, label: slot.label, x, y, kind, zone };
}

export const OCTA_POINTS: OctaPoint[] = [
  // Внешние точки и центр
  pt("point_W", ...OUTER.W, "outer"),
  pt("point_N", ...OUTER.N, "outer"),
  pt("point_E", ...OUTER.E, "outer"),
  pt("point_S", ...OUTER.S, "outer"),
  pt("point_NW", ...OUTER.NW, "outer", "male"),
  pt("point_NE", ...OUTER.NE, "outer", "female"),
  pt("point_SE", ...OUTER.SE, "outer", "money"),
  pt("point_SW", ...OUTER.SW, "outer", "love"),
  pt("point_C", CX, CY, "center"),

  // Горизонтальная ось: W → C три точки, C → E одна (несимметрично, как в методике)
  pt("point_h_ajna", lerp(OUTER.W[0], CX, 0.25), CY, "axis"),
  pt("point_h_vishuddha", lerp(OUTER.W[0], CX, 0.5), CY, "axis"),
  pt("point_h_anahata", lerp(OUTER.W[0], CX, 0.75), CY, "axis"),
  pt("point_h_svadhi", lerp(CX, OUTER.E[0], 0.5), CY, "axis"),

  // Вертикальная ось
  pt("point_v_ajna", CX, lerp(OUTER.N[1], CY, 0.25), "axis"),
  pt("point_v_vishuddha", CX, lerp(OUTER.N[1], CY, 0.5), "axis"),
  pt("point_v_anahata", CX, lerp(OUTER.N[1], CY, 0.75), "axis"),
  pt("point_v_svadhi", CX, lerp(CY, OUTER.S[1], 0.5), "axis"),

  // Диагонали: outer ближе к углу (0.28), mid — середина (0.56)
  pt("point_nw_outer", lerp(OUTER.NW[0], CX, 0.28), lerp(OUTER.NW[1], CY, 0.28), "diagonal", "male"),
  pt("point_nw_mid", lerp(OUTER.NW[0], CX, 0.56), lerp(OUTER.NW[1], CY, 0.56), "diagonal", "male"),
  pt("point_ne_outer", lerp(OUTER.NE[0], CX, 0.28), lerp(OUTER.NE[1], CY, 0.28), "diagonal", "female"),
  pt("point_ne_mid", lerp(OUTER.NE[0], CX, 0.56), lerp(OUTER.NE[1], CY, 0.56), "diagonal", "female"),
  pt("point_se_outer", lerp(OUTER.SE[0], CX, 0.28), lerp(OUTER.SE[1], CY, 0.28), "diagonal", "money"),
  pt("point_se_mid", lerp(OUTER.SE[0], CX, 0.56), lerp(OUTER.SE[1], CY, 0.56), "diagonal", "money"),
  pt("point_sw_outer", lerp(OUTER.SW[0], CX, 0.28), lerp(OUTER.SW[1], CY, 0.28), "diagonal", "love"),
  pt("point_sw_mid", lerp(OUTER.SW[0], CX, 0.56), lerp(OUTER.SW[1], CY, 0.56), "diagonal", "love"),
];

/** Число в точке по расчёту. */
export function pointValue(matrix: MatrixBase, path: string): number {
  const v = path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), matrix);
  return typeof v === "number" ? v : 0;
}

/** Квадрат (внешние W N E S) и ромб (углы) — два контура октаграммы. */
export const SQUARE = [OUTER.N, OUTER.E, OUTER.S, OUTER.W] as const;
export const DIAMOND = [OUTER.NW, OUTER.NE, OUTER.SE, OUTER.SW] as const;

/** Точки возрастной шкалы: 32 периода по 2,5 года по часовой стрелке от запада. */
export function timelineRing(): Array<{ age: number; x: number; y: number; major: boolean }> {
  const out: Array<{ age: number; x: number; y: number; major: boolean }> = [];
  for (let i = 0; i < 32; i++) {
    const age = i * 2.5;
    // 0 лет — запад (180°), дальше по часовой: 10 лет — NW (225° в SVG-координатах это -135°)
    const angle = Math.PI - (i / 32) * Math.PI * 2;
    out.push({
      age,
      x: r3(CX + RING_R * Math.cos(angle)),
      y: r3(CY - RING_R * Math.sin(angle)),
      major: age % 10 === 0,
    });
  }
  return out;
}
