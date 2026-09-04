/**
 * Устойчив ли бодиграф в течение суток рождения.
 *
 * Луна проходит одни ворота примерно за десять часов, а одни ворота могут
 * замкнуть канал — и вместе с ним изменить определённые центры и тип.
 * Поэтому без времени рождения мы проверяем: меняется ли результат за
 * сутки. Если нет — показываем как есть, без оговорок. Если да — говорим
 * прямо, что и когда меняется.
 */

import { clockLabel, formatLocalClock, scanDay, type DayChange } from "@/lib/geo/dayScan";
import { HD_BODIES, bodyLongitude, designMoment } from "@/lib/ephemeris";
import { activeChannels, channelKey } from "./channels";
import { centerOfGate, CENTERS, CENTER_ORDER, type CenterId } from "./centers";
import { determineAuthority, determineType, AUTHORITIES, HD_TYPES, type AuthorityId, type HdTypeId } from "./chart";
import { gateAt } from "./gates";

/** Всё, что должно совпасть, чтобы считать сутки устойчивыми. */
export type HdSignature = {
  type: HdTypeId;
  authority: AuthorityId;
  profile: string;
  centers: CenterId[];
  channels: string[];
};

/**
 * Быстрый расчёт итогов карты без скоростей и подписей: нужен только для
 * проверки устойчивости, поэтому считаем долготы, а не полные положения.
 */
export function hdSignature(utc: Date): HdSignature {
  const design = designMoment(utc);
  const gates = new Set<number>();
  let personalitySunLine = 1;
  let designSunLine = 1;

  for (const body of HD_BODIES) {
    const g = gateAt(bodyLongitude(body, utc));
    gates.add(g.gate);
    if (body === "sun") personalitySunLine = g.line;
  }
  for (const body of HD_BODIES) {
    const g = gateAt(bodyLongitude(body, design));
    gates.add(g.gate);
    if (body === "sun") designSunLine = g.line;
  }

  const channels = activeChannels(gates);
  const definedSet = new Set<CenterId>();
  for (const c of channels) {
    definedSet.add(centerOfGate(c.a));
    definedSet.add(centerOfGate(c.b));
  }
  const centers = CENTER_ORDER.filter((c) => definedSet.has(c));
  const type = determineType(centers, channels);

  return {
    type: type.id,
    authority: determineAuthority(centers, type).id,
    profile: `${personalitySunLine}/${designSunLine}`,
    centers,
    channels: channels.map((c) => channelKey(c.a, c.b)).sort(),
  };
}

function sameSignature(a: HdSignature, b: HdSignature): boolean {
  return (
    a.type === b.type &&
    a.authority === b.authority &&
    a.profile === b.profile &&
    a.centers.join(",") === b.centers.join(",") &&
    a.channels.join(",") === b.channels.join(",")
  );
}

export type HdDayVariation = {
  /** true, если за сутки результат не менялся — оговорок не нужно */
  stable: boolean;
  /** строки вида «в этот день тип меняется с Генератора на Проектора после 14:20 …» */
  facts: string[];
};

/**
 * Что именно изменилось между двумя моментами. Меньший priority — важнее:
 * смену типа человек должен увидеть первой, даже если она случилась позже
 * смены профиля.
 */
function describeChange(
  change: DayChange<HdSignature>,
  tz: string | null,
  placeName: string | null,
): { priority: number; text: string } {
  const at = `после ${formatLocalClock(change.at, tz)} ${clockLabel(placeName)}`;
  const { from, to } = change;

  if (from.type !== to.type) {
    return { priority: 0, text: `тип меняется с «${HD_TYPES[from.type].name}» на «${HD_TYPES[to.type].name}» ${at}` };
  }
  if (from.authority !== to.authority) {
    return {
      priority: 1,
      text: `авторитет меняется с «${AUTHORITIES[from.authority].name}» на «${AUTHORITIES[to.authority].name}» ${at}`,
    };
  }
  if (from.profile !== to.profile) {
    return { priority: 2, text: `профиль меняется с ${from.profile} на ${to.profile} ${at}` };
  }
  if (from.centers.join(",") !== to.centers.join(",")) {
    const added = to.centers.filter((c) => !from.centers.includes(c)).map((c) => CENTERS[c].name);
    const removed = from.centers.filter((c) => !to.centers.includes(c)).map((c) => CENTERS[c].name);
    const what = added.length > 0 ? `добавляется центр «${added.join(", ")}»` : `пропадает центр «${removed.join(", ")}»`;
    return { priority: 3, text: `${what} ${at}` };
  }
  return { priority: 4, text: `набор каналов меняется ${at}, но тип остаётся прежним` };
}

/**
 * Меняется ли бодиграф за сутки рождения.
 * Вызывать только когда время рождения неизвестно.
 */
export function hdDayVariation(date: string, tz: string | null, placeName: string | null): HdDayVariation {
  const scan = scanDay(date, tz, hdSignature, sameSignature);
  const described = scan.changes
    .map((c, i) => ({ ...describeChange(c, tz, placeName), order: i }))
    .sort((a, b) => a.priority - b.priority || a.order - b.order);
  return { stable: scan.stable, facts: described.slice(0, 3).map((d) => d.text) };
}
