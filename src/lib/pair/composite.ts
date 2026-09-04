/**
 * КОМПОЗИТ ДИЗАЙНА ЧЕЛОВЕКА — бодиграф пары.
 *
 * Два человека кладутся на одну схему: канал горит, если его ворота
 * набираются из двоих вместе. У каждого горящего канала есть вид связи —
 * это и есть механика отношений в этой системе:
 *
 *  - ЭЛЕКТРОМАГНИТНЫЙ: у одного одни ворота, у другого другие. Притяжение
 *    и трение одновременно: канал есть только вдвоём;
 *  - КОМПАНЬОНСТВО: канал целиком есть у обоих. Понимают друг друга без
 *    слов, но и слепые пятна у них одни и те же;
 *  - ДОМИНИРОВАНИЕ: канал целиком у одного, у другого нет ни одних ворот.
 *    Тема одного накрывает обоих;
 *  - КОМПРОМИСС: канал целиком у одного, у другого одни из двух ворот.
 *    Второй знает тему наполовину, и это сложнее, чем не знать вовсе.
 *
 * Центры композита считаются по объединённым воротам. Отдельно
 * запоминается, откуда центр взялся: был у первого, у второго, у обоих
 * или появляется только вместе.
 */

import {
  CENTERS,
  CENTER_ORDER,
  activeChannels,
  channelCenters,
  channelKey,
  definitionOf,
  determineType,
  type CenterId,
  type Channel,
  type DefinitionId,
  type HdType,
  type HdTypeId,
  type HumanDesignChart,
} from "@/lib/humandesign";

export type ConnectionKind = "electromagnetic" | "companionship" | "dominance" | "compromise";

export const CONNECTION_KINDS: Record<ConnectionKind, { name: string; about: string }> = {
  electromagnetic: {
    name: "Электромагнитный",
    about: "у одного одни ворота, у другого другие — канал существует только вдвоём",
  },
  companionship: {
    name: "Компаньонство",
    about: "канал целиком есть у обоих — одинаково видят и одинаково не видят",
  },
  dominance: {
    name: "Доминирование",
    about: "канал целиком у одного, у другого нет ни одних ворот — тема одного накрывает обоих",
  },
  compromise: {
    name: "Компромисс",
    about: "канал целиком у одного, у другого половина — второй знает тему наполовину",
  },
};

/** Порядок показа: сначала то, что связывает сильнее всего. */
export const KIND_ORDER: ConnectionKind[] = ["electromagnetic", "compromise", "dominance", "companionship"];

export type ConnectionChannel = {
  channel: Channel;
  kind: ConnectionKind;
  /** чей канал целиком: 0 — первый, 1 — второй, null — собирается из двоих */
  owner: 0 | 1 | null;
};

/** Откуда в композите взялся центр. */
export type CenterSource = "first" | "second" | "both" | "connection" | "none";

export type Composite = {
  first: HumanDesignChart;
  second: HumanDesignChart;
  /** каналы композита, сильные связи первыми */
  channels: ConnectionChannel[];
  definedCenters: CenterId[];
  centerSource: Record<CenterId, CenterSource>;
  definition: DefinitionId;
  /** тип composite-схемы: чем пара становится вместе */
  type: HdType;
  /** главная связь — первый электромагнитный канал, иначе самый сильный из найденных */
  leading: ConnectionChannel | null;
  unknown: { firstTime: boolean; secondTime: boolean };
};

function kindOf(channel: Channel, gatesA: Set<number>, gatesB: Set<number>): ConnectionChannel | null {
  const aA = gatesA.has(channel.a);
  const bA = gatesA.has(channel.b);
  const aB = gatesB.has(channel.a);
  const bB = gatesB.has(channel.b);
  const fullA = aA && bA;
  const fullB = aB && bB;

  if (fullA && fullB) return { channel, kind: "companionship", owner: null };
  if (fullA || fullB) {
    const ownerFirst = fullA;
    const otherHasHalf = ownerFirst ? aB || bB : aA || bA;
    return { channel, kind: otherHasHalf ? "compromise" : "dominance", owner: ownerFirst ? 0 : 1 };
  }
  // Половины разошлись по разным людям — канал собирается только вдвоём.
  if ((aA && bB) || (bA && aB)) return { channel, kind: "electromagnetic", owner: null };
  return null;
}

export function buildComposite(first: HumanDesignChart, second: HumanDesignChart): Composite {
  const gatesA = new Set(first.gates);
  const gatesB = new Set(second.gates);
  const together = activeChannels(new Set([...gatesA, ...gatesB]));

  const channels = together
    .map((channel) => kindOf(channel, gatesA, gatesB))
    .filter((x): x is ConnectionChannel => x !== null)
    .sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) || x.channel.a - y.channel.a);

  const definedSet = new Set<CenterId>();
  for (const c of channels) for (const center of channelCenters(c.channel)) definedSet.add(center);
  const definedCenters = CENTER_ORDER.filter((c) => definedSet.has(c));

  const centerSource = Object.fromEntries(
    CENTER_ORDER.map((center) => {
      const inFirst = first.definedCenters.includes(center);
      const inSecond = second.definedCenters.includes(center);
      if (inFirst && inSecond) return [center, "both" as CenterSource];
      if (inFirst) return [center, "first" as CenterSource];
      if (inSecond) return [center, "second" as CenterSource];
      // Ни у кого поодиночке, а вместе есть — это и есть эффект пары.
      return [center, definedSet.has(center) ? ("connection" as CenterSource) : ("none" as CenterSource)];
    }),
  ) as Record<CenterId, CenterSource>;

  const plainChannels = channels.map((c) => c.channel);

  return {
    first,
    second,
    channels,
    definedCenters,
    centerSource,
    definition: definitionOf(definedCenters, plainChannels),
    type: determineType(definedCenters, plainChannels),
    leading: channels.find((c) => c.kind === "electromagnetic") ?? channels[0] ?? null,
    unknown: { firstTime: first.approximate, secondTime: second.approximate },
  };
}

/** Сколько связей каждого вида — короткая сводка для схемы. */
export function countKinds(composite: Composite): Record<ConnectionKind, number> {
  const out: Record<ConnectionKind, number> = {
    electromagnetic: 0,
    companionship: 0,
    dominance: 0,
    compromise: 0,
  };
  for (const c of composite.channels) out[c.kind] += 1;
  return out;
}

/** Центры, которые появляются только вместе, — самое интересное в композите. */
export function connectionCenters(composite: Composite): CenterId[] {
  return CENTER_ORDER.filter((c) => composite.centerSource[c] === "connection");
}

/** Название центра — для подписей. */
export const centerName = (id: CenterId) => CENTERS[id].name;

/** Ключ текста главной связи пары: как работают вместе два типа. */
export function compositeBriefKey(first: HdTypeId, second: HdTypeId): string {
  return `hdc_brief_${first}_${second}`;
}

/** Ключ полного разбора пары типов. */
export function compositeTypeKey(first: HdTypeId, second: HdTypeId): string {
  return `hdc_type_${first}_${second}`;
}

/** Ключ текста канала связи. */
export function compositeChannelKey(a: number, b: number, kind: ConnectionKind): string {
  return `hdc_channel_${channelKey(a, b)}_${kind}`;
}

/** Ключ текста определения композита. */
export function compositeDefinitionKey(definition: DefinitionId): string {
  return `hdc_definition_${definition}`;
}
