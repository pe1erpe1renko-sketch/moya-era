/**
 * БОДИГРАФ — карта дизайна человека.
 *
 * Считается по двум моментам:
 *   личность — момент рождения (осознаваемое, чёрные значки);
 *   дизайн — момент, когда Солнце было на 88° долготы раньше
 *            (неосознаваемое, красные значки).
 * Разброс между ними реально от 87 до 92 суток, поэтому «88 дней назад»
 * не годится: момент ищется численно по долготе Солнца.
 *
 * Тринадцать активаций в каждой карте: Солнце, Земля, оба узла, Луна и
 * восемь планет. Каждая попадает в свои ворота и линию. Ворота с обеих
 * карт вместе зажигают каналы, каналы определяют центры, из центров
 * выводится тип, из типа — стратегия.
 */

import { HD_BODIES, bodyPosition, designMoment, type BodyId } from "@/lib/ephemeris";
import { resolveBirthMoment, type BirthInput, type BirthMoment } from "@/lib/geo/birthMoment";
import { CENTERS, CENTER_ORDER, MOTOR_CENTERS, centerOfGate, type CenterId } from "./centers";
import { activeChannels, channelCenters, channelKey, type Channel } from "./channels";
import { gateAt, gateName, type GateLine } from "./gates";

export type ActivationSide = "personality" | "design";

export type Activation = GateLine & {
  body: BodyId;
  side: ActivationSide;
  longitude: number;
  /** «Солнце» */
  bodyName: string;
  /** «41.3» — ворота и линия */
  label: string;
};

export type HdTypeId = "generator" | "manifesting_generator" | "manifestor" | "projector" | "reflector";

export type HdType = {
  id: HdTypeId;
  name: string;
  strategy: string;
  /** одно предложение о стратегии, для карточки */
  strategyLine: string;
  signature: string;
  notSelf: string;
  share: string;
};

export const HD_TYPES: Record<HdTypeId, HdType> = {
  generator: {
    id: "generator",
    name: "Генератор",
    strategy: "Ждать отклика",
    strategyLine: "Энергия включается ответом на вопрос, а не решением головы.",
    signature: "Удовлетворение",
    notSelf: "Разочарование",
    share: "около 37%",
  },
  manifesting_generator: {
    id: "manifesting_generator",
    name: "Манифестирующий генератор",
    strategy: "Ждать отклика, потом предупреждать",
    strategyLine: "Сначала отклик тела, потом короткое предупреждение тем, кого заденет.",
    signature: "Удовлетворение и покой",
    notSelf: "Разочарование и злость",
    share: "около 33%",
  },
  manifestor: {
    id: "manifestor",
    name: "Манифестор",
    strategy: "Предупреждать",
    strategyLine: "Начинать самому, но предупреждать тех, на кого это повлияет.",
    signature: "Покой",
    notSelf: "Злость",
    share: "около 9%",
  },
  projector: {
    id: "projector",
    name: "Проектор",
    strategy: "Ждать приглашения",
    strategyLine: "Ваша работа востребована тогда, когда о ней попросили.",
    signature: "Успех",
    notSelf: "Горечь",
    share: "около 20%",
  },
  reflector: {
    id: "reflector",
    name: "Рефлектор",
    strategy: "Ждать лунный цикл",
    strategyLine: "Решение вызревает примерно за 28 дней, и это не каприз.",
    signature: "Удивление",
    notSelf: "Разочарование",
    share: "около 1%",
  },
};

export type AuthorityId =
  | "emotional"
  | "sacral"
  | "splenic"
  | "ego"
  | "self_projected"
  | "mental"
  | "lunar";

export type Authority = { id: AuthorityId; name: string; line: string };

export const AUTHORITIES: Record<AuthorityId, Authority> = {
  emotional: {
    id: "emotional",
    name: "Эмоциональный",
    line: "Ясности в моменте не бывает: решение верно только после того, как волна прошла.",
  },
  sacral: {
    id: "sacral",
    name: "Сакральный",
    line: "Тело отвечает раньше головы — звуком, тягой или отказом.",
  },
  splenic: {
    id: "splenic",
    name: "Селезёночный",
    line: "Интуиция говорит один раз и тихо, повторять не будет.",
  },
  ego: {
    id: "ego",
    name: "Эго",
    line: "Решает то, чего вы действительно хотите и на что готовы потратить силы.",
  },
  self_projected: {
    id: "self_projected",
    name: "Самопроецируемый",
    line: "Направление слышно в собственном голосе: нужно проговорить вслух.",
  },
  mental: {
    id: "mental",
    name: "Ментальный",
    line: "Решение вызревает в разговоре с людьми, которым вы доверяете, а не внутри головы.",
  },
  lunar: {
    id: "lunar",
    name: "Лунный",
    line: "Нужен полный лунный цикл и разные места, чтобы понять своё.",
  },
};

export type DefinitionId = "none" | "single" | "split" | "triple_split" | "quadruple_split";

export const DEFINITIONS: Record<DefinitionId, string> = {
  none: "Нет определения",
  single: "Единое определение",
  split: "Раздвоенное определение",
  triple_split: "Тройное расщепление",
  quadruple_split: "Четверное расщепление",
};

export type CrossAngle = "right" | "juxtaposition" | "left";

export const CROSS_ANGLES: Record<CrossAngle, string> = {
  right: "Правый угол",
  juxtaposition: "Юкстапозиция",
  left: "Левый угол",
};

export type HumanDesignChart = {
  moment: BirthMoment;
  /** момент карты дизайна, UTC */
  designUtc: Date;
  /** сколько суток между картами */
  daysBetween: number;
  place: { name: string | null; lat: number; lon: number; tz: string } | null;
  personality: Activation[];
  design: Activation[];
  /** все активные ворота, по возрастанию */
  gates: number[];
  channels: Channel[];
  definedCenters: CenterId[];
  openCenters: CenterId[];
  type: HdType;
  authority: Authority;
  /** «1/3» */
  profile: string;
  profileLines: [number, number];
  definition: DefinitionId;
  cross: {
    angle: CrossAngle;
    /** ворота: Солнце и Земля личности, Солнце и Земля дизайна */
    gates: [number, number, number, number];
    /** «Правый угол, крест ворот 26» */
    label: string;
  };
  /** карта построена без времени рождения — результат ненадёжен */
  approximate: boolean;
};

export type HdChartInput = BirthInput & { placeName?: string | null };

function activations(utc: Date, side: ActivationSide): Activation[] {
  return HD_BODIES.map((body) => {
    const p = bodyPosition(body, utc);
    const g = gateAt(p.longitude);
    const names: Record<string, string> = {
      sun: "Солнце",
      earth: "Земля",
      moon: "Луна",
      north_node: "Северный узел",
      south_node: "Южный узел",
      mercury: "Меркурий",
      venus: "Венера",
      mars: "Марс",
      jupiter: "Юпитер",
      saturn: "Сатурн",
      uranus: "Уран",
      neptune: "Нептун",
      pluto: "Плутон",
    };
    return {
      ...g,
      body,
      side,
      longitude: p.longitude,
      bodyName: names[body] ?? body,
      label: `${g.gate}.${g.line}`,
    };
  });
}

/** Связаны ли два центра цепочкой горящих каналов. */
function connected(from: CenterId, to: CenterId, channels: Channel[]): boolean {
  const graph = new Map<CenterId, CenterId[]>();
  for (const c of channels) {
    const [x, y] = channelCenters(c);
    if (x === y) continue;
    graph.set(x, [...(graph.get(x) ?? []), y]);
    graph.set(y, [...(graph.get(y) ?? []), x]);
  }
  const seen = new Set<CenterId>([from]);
  const queue: CenterId[] = [from];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) return true;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/** Группы связанных между собой определённых центров. */
function definitionGroups(definedCenters: CenterId[], channels: Channel[]): CenterId[][] {
  const groups: CenterId[][] = [];
  const left = new Set(definedCenters);
  while (left.size > 0) {
    const start = left.values().next().value as CenterId;
    const group = [...definedCenters].filter((c) => left.has(c) && connected(start, c, channels));
    for (const c of group) left.delete(c);
    groups.push(group);
  }
  return groups;
}

/**
 * Определение по набору центров и каналов: единое, раздвоенное и так далее.
 * Вынесено отдельно, потому что то же самое считается для композита пары.
 */
export function definitionOf(definedCenters: CenterId[], channels: Channel[]): DefinitionId {
  const groups = definitionGroups(definedCenters, channels);
  if (groups.length === 0) return "none";
  if (groups.length === 1) return "single";
  if (groups.length === 2) return "split";
  if (groups.length === 3) return "triple_split";
  return "quadruple_split";
}

export function determineType(definedCenters: CenterId[], channels: Channel[]): HdType {
  if (definedCenters.length === 0) return HD_TYPES.reflector;

  const defined = new Set(definedCenters);
  const hasSacral = defined.has("sacral");
  const motorToThroat =
    defined.has("throat") &&
    MOTOR_CENTERS.some((motor) => defined.has(motor) && connected(motor, "throat", channels));

  if (hasSacral && motorToThroat) return HD_TYPES.manifesting_generator;
  if (hasSacral) return HD_TYPES.generator;
  if (motorToThroat) return HD_TYPES.manifestor;
  return HD_TYPES.projector;
}

export function determineAuthority(definedCenters: CenterId[], type: HdType): Authority {
  if (type.id === "reflector") return AUTHORITIES.lunar;
  const defined = new Set(definedCenters);
  // Порядок жёсткий: верхний определённый центр из списка и есть авторитет.
  if (defined.has("solar")) return AUTHORITIES.emotional;
  if (defined.has("sacral")) return AUTHORITIES.sacral;
  if (defined.has("spleen")) return AUTHORITIES.splenic;
  if (defined.has("heart")) return AUTHORITIES.ego;
  if (defined.has("self")) return AUTHORITIES.self_projected;
  return AUTHORITIES.mental;
}

/** Угол креста воплощения выводится из профиля. */
export function crossAngle(profile: string): CrossAngle {
  if (profile === "4/1") return "juxtaposition";
  return ["5/1", "5/2", "6/2", "6/3"].includes(profile) ? "left" : "right";
}

export function buildHumanDesignChart(input: HdChartInput): HumanDesignChart {
  const moment = resolveBirthMoment(input);
  const designUtc = designMoment(moment.utc);

  const personality = activations(moment.utc, "personality");
  const design = activations(designUtc, "design");

  const gateSet = new Set<number>([...personality, ...design].map((a) => a.gate));
  const channels = activeChannels(gateSet);

  const definedSet = new Set<CenterId>();
  for (const c of channels) {
    const [x, y] = channelCenters(c);
    definedSet.add(x);
    definedSet.add(y);
  }
  const definedCenters = CENTER_ORDER.filter((c) => definedSet.has(c));
  const openCenters = CENTER_ORDER.filter((c) => !definedSet.has(c));

  const type = determineType(definedCenters, channels);
  const authority = determineAuthority(definedCenters, type);

  const personalitySun = personality.find((a) => a.body === "sun")!;
  const personalityEarth = personality.find((a) => a.body === "earth")!;
  const designSun = design.find((a) => a.body === "sun")!;
  const designEarth = design.find((a) => a.body === "earth")!;
  const profileLines: [number, number] = [personalitySun.line, designSun.line];
  const profile = `${profileLines[0]}/${profileLines[1]}`;

  const definition = definitionOf(definedCenters, channels);

  const angle = crossAngle(profile);

  return {
    moment,
    designUtc,
    daysBetween: (moment.utc.getTime() - designUtc.getTime()) / 86_400_000,
    place:
      input.latitude !== null && input.longitude !== null && input.tz
        ? { name: input.placeName ?? null, lat: input.latitude, lon: input.longitude, tz: input.tz }
        : null,
    personality,
    design,
    gates: [...gateSet].sort((a, b) => a - b),
    channels,
    definedCenters,
    openCenters,
    type,
    authority,
    profile,
    profileLines,
    definition,
    cross: {
      angle,
      gates: [personalitySun.gate, personalityEarth.gate, designSun.gate, designEarth.gate],
      label: `${CROSS_ANGLES[angle]}, крест ворот ${personalitySun.gate} — ${gateName(personalitySun.gate)}`,
    },
    approximate: moment.precision !== "exact",
  };
}

/** Определён ли центр. */
export function isCenterDefined(chart: HumanDesignChart, center: CenterId): boolean {
  return chart.definedCenters.includes(center);
}

/** Ворота центра, активные в этой карте. */
export function centerGates(chart: HumanDesignChart, center: CenterId): number[] {
  return chart.gates.filter((g) => centerOfGate(g) === center);
}

/** Ключ канала для текста: «20_34». */
export { channelKey };

/** Названия центров — для интерфейса. */
export { CENTERS, CENTER_ORDER };
export type { CenterId, Channel };
