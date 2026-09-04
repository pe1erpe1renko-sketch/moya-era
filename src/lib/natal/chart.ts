/**
 * НАТАЛЬНАЯ КАРТА — сборка карты из момента рождения и места.
 *
 * Всё честно: что нельзя посчитать, помечается как неизвестное, а не
 * додумывается.
 *   - нет места → нет домов, асцендента и середины неба;
 *   - нет времени → считаем на полдень, дома не строим, а про Луну
 *     отдельно говорим, меняет ли она знак в этот день;
 *   - за полярным кругом Плацидус не определён — берётся Порфирий
 *     и об этом сказано словами.
 */

import {
  BODIES,
  NATAL_BODIES,
  formatZodiac,
  houseOf,
  houses,
  norm360,
  signAt,
  zodiacPosition,
  type BodyId,
  type EclipticPosition,
  type HouseSystem,
  type Houses,
  type Sign,
  type ZodiacPosition,
} from "@/lib/ephemeris";
import { bodyPosition } from "@/lib/ephemeris";
import { resolveBirthMoment, type BirthInput, type BirthMoment } from "@/lib/geo/birthMoment";
import { findAspects, type Aspect, type AspectPoint, type AspectSource } from "./aspects";

/**
 * Тела натальной карты. Лилит не показываем: наш средний апогей расходится
 * со Swiss Ephemeris до семи угловых минут, и защитить это число нельзя.
 * Функция расчёта остаётся в движке — вернём, когда сойдёмся с эталоном.
 */
export const CHART_BODIES: BodyId[] = NATAL_BODIES.filter((b) => b !== "lilith");

/** Порядок точек в карте — от него зависят ключи текстов аспектов. */
export const POINT_ORDER: AspectPoint[] = [...CHART_BODIES, "asc", "mc"];

export type ChartBody = {
  body: BodyId;
  name: string;
  glyph: string;
  longitude: number;
  latitude: number;
  speed: number;
  retrograde: boolean;
  sign: Sign;
  /** градусы внутри знака */
  degree: number;
  /** «3°07′ Льва» */
  label: string;
  /** номер дома или null, если дома не построены */
  house: number | null;
};

export type ChartAngle = ZodiacPosition & { house: number };

export type NatalChart = {
  moment: BirthMoment;
  place: { name: string | null; lat: number; lon: number; tz: string } | null;
  bodies: ChartBody[];
  houses: Houses | null;
  asc: ChartAngle | null;
  mc: ChartAngle | null;
  aspects: Aspect[];
  /** что осталось неизвестным и почему — для честных подписей в интерфейсе */
  unknown: {
    /** нет времени или места: домов, асцендента и MC нет */
    houses: boolean;
    /** Луна в этот день меняет знак, а времени нет — знак под вопросом */
    moonSign: boolean;
    /** место за полярным кругом: Плацидус заменён Порфирием */
    polarHouses: boolean;
  };
};

export type ChartInput = BirthInput & {
  placeName?: string | null;
  houseSystem?: HouseSystem;
};

function toChartBody(p: EclipticPosition, cusps: number[] | null): ChartBody {
  const info = BODIES[p.body];
  const z = zodiacPosition(p.longitude);
  return {
    body: p.body,
    name: info.name,
    glyph: info.glyph,
    longitude: p.longitude,
    latitude: p.latitude,
    speed: p.speed,
    retrograde: p.retrograde,
    sign: z.sign,
    degree: z.degree,
    label: z.label,
    house: cusps ? houseOf(p.longitude, cusps) : null,
  };
}

/**
 * Меняет ли Луна знак в течение суток вокруг момента. Если да, а времени
 * рождения нет — знак Луны назвать нельзя, и мы об этом говорим.
 */
function moonSignUncertain(utc: Date): boolean {
  const day = 86_400_000;
  const start = signAt(bodyPosition("moon", new Date(utc.getTime() - day / 2)).longitude).key;
  const end = signAt(bodyPosition("moon", new Date(utc.getTime() + day / 2)).longitude).key;
  return start !== end;
}

export function buildNatalChart(input: ChartInput): NatalChart {
  const moment = resolveBirthMoment(input);
  const utc = moment.utc;

  const hasHouses = moment.hasPlace && moment.precision === "exact";
  const built =
    hasHouses && input.latitude !== null && input.longitude !== null
      ? houses(utc, input.latitude, input.longitude, input.houseSystem ?? "placidus")
      : null;

  const positions = CHART_BODIES.map((b) => bodyPosition(b, utc));
  const bodies = positions.map((p) => toChartBody(p, built?.cusps ?? null));

  const asc: ChartAngle | null = built ? { ...zodiacPosition(built.asc), house: 1 } : null;
  const mc: ChartAngle | null = built ? { ...zodiacPosition(built.mc), house: 10 } : null;

  const sources: AspectSource[] = positions.map((p) => ({ point: p.body, longitude: p.longitude, speed: p.speed }));
  if (built) {
    sources.push({ point: "asc", longitude: built.asc, speed: 0 });
    sources.push({ point: "mc", longitude: built.mc, speed: 0 });
  }

  return {
    moment,
    place:
      input.latitude !== null && input.longitude !== null && input.tz
        ? { name: input.placeName ?? null, lat: input.latitude, lon: input.longitude, tz: input.tz }
        : null,
    bodies,
    houses: built,
    asc,
    mc,
    aspects: findAspects(sources, POINT_ORDER),
    unknown: {
      houses: !built,
      moonSign: moment.precision !== "exact" && moonSignUncertain(utc),
      polarHouses: built?.fallback ?? false,
    },
  };
}

/** Тело карты по идентификатору. */
export function chartBody(chart: NatalChart, body: BodyId): ChartBody | null {
  return chart.bodies.find((b) => b.body === body) ?? null;
}

/** Долгота точки карты: планета или угол. */
export function pointLongitude(chart: NatalChart, point: AspectPoint): number | null {
  if (point === "asc") return chart.asc?.longitude ?? null;
  if (point === "mc") return chart.mc?.longitude ?? null;
  return chartBody(chart, point)?.longitude ?? null;
}

/** Название точки для интерфейса и промптов. */
export function pointName(point: AspectPoint): string {
  if (point === "asc") return "Асцендент";
  if (point === "mc") return "Середина неба";
  return BODIES[point].name;
}

/** Символ точки. */
export function pointGlyph(point: AspectPoint): string {
  if (point === "asc") return "Asc";
  if (point === "mc") return "MC";
  return BODIES[point].glyph;
}

/** Куспиды домов в градусах, если дома построены. */
export function houseCusps(chart: NatalChart): number[] | null {
  return chart.houses?.cusps ?? null;
}

/** Короткая строка положения: «Солнце 3°07′ Льва, 10 дом». */
export function bodyLine(b: ChartBody): string {
  const house = b.house ? `, ${b.house} дом` : "";
  const retro = b.retrograde ? ", ретроградный" : "";
  return `${b.name} ${formatZodiac(norm360(b.longitude))}${house}${retro}`;
}
