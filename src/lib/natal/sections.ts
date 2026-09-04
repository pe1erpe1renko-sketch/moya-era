/**
 * КАРТА ПОЗИЦИЙ НАТАЛЬНОЙ КАРТЫ
 * =============================
 * То же, чем `contentPositions.js` служит матрице: единственный источник
 * правды о том, из чего состоит разбор и какой текст к какой позиции висит.
 *
 * КЛЮЧ ТЕКСТА в базе (таблица matrix_texts, общая с матрицей):
 *   natal_body_sign_sun_leo      — Солнце во Льве
 *   natal_body_house_venus_7     — Венера в седьмом доме
 *   natal_asc_sign_scorpio       — асцендент в Скорпионе
 *   natal_aspect_sun_moon_trine  — тригон Солнца и Луны
 * Префикс natal_ отделяет их от ключей матрицы.
 *
 * ИДЕНТИФИКАТОРЫ НЕ ПЕРЕИМЕНОВЫВАТЬ: на них висят тексты в базе.
 *
 * БЕСПЛАТНО (решение заказчика от 04.09.2026): круг карты виден всем,
 * читаются Солнце по дате, Луна и асцендент — если известны время и место.
 * Остальные планеты, дома и аспекты — по подписке.
 */

import { signAt, type BodyId } from "@/lib/ephemeris";
import type { AspectKey, AspectPoint } from "./aspects";
import { chartBody, pointName, type NatalChart } from "./chart";

export type NatalSlotKind = "body_sign" | "body_house" | "asc_sign" | "mc_sign" | "aspect";

export type NatalSlot = {
  /** устойчивый идентификатор вопроса */
  id: string;
  label: string;
  kind: NatalSlotKind;
  free: boolean;
  body?: BodyId;
  aspect?: { a: AspectPoint; b: AspectPoint; key: AspectKey };
};

export type NatalSection = {
  id: string;
  title: string;
  lead: string;
  slots: NatalSlot[];
};

const SIGN_LABEL: Record<BodyId, string> = {
  sun: "Солнце в знаке: чем вы себя считаете",
  moon: "Луна в знаке: что нужно, чтобы чувствовать себя в безопасности",
  mercury: "Меркурий в знаке: как вы думаете и говорите",
  venus: "Венера в знаке: что вы считаете ценным и как любите",
  mars: "Марс в знаке: как вы действуете и злитесь",
  jupiter: "Юпитер в знаке: где вам везёт и в чём легко расширяться",
  saturn: "Сатурн в знаке: где приходится взрослеть",
  uranus: "Уран в знаке: где вы не как все",
  neptune: "Нептун в знаке: где границы размываются",
  pluto: "Плутон в знаке: что перерождается через кризисы",
  north_node: "Северный узел: куда вас тянет расти",
  south_node: "Южный узел: что уже наработано",
  lilith: "Лилит в знаке",
  earth: "Земля в знаке",
};

const HOUSE_LABEL: Record<BodyId, string> = {
  sun: "Солнце в доме: где вы светите",
  moon: "Луна в доме: где ищете покой",
  mercury: "Меркурий в доме: о чём вы всё время думаете",
  venus: "Венера в доме: где вам хорошо",
  mars: "Марс в доме: куда уходит ваша энергия",
  jupiter: "Юпитер в доме: где приходит удача",
  saturn: "Сатурн в доме: где придётся потрудиться",
  uranus: "Уран в доме: где всё меняется рывками",
  neptune: "Нептун в доме: где легко обмануться",
  pluto: "Плутон в доме: где идёт глубинная перестройка",
  north_node: "Северный узел в доме: где ваш рост",
  south_node: "Южный узел в доме",
  lilith: "Лилит в доме",
  earth: "Земля в доме",
};

const PERSONAL: BodyId[] = ["mercury", "venus", "mars"];
const SOCIAL: BodyId[] = ["jupiter", "saturn"];
const OUTER: BodyId[] = ["uranus", "neptune", "pluto"];
const HOUSE_BODIES: BodyId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const signSlot = (body: BodyId, free = false): NatalSlot => ({
  id: `natal_body_sign_${body}`,
  label: SIGN_LABEL[body],
  kind: "body_sign",
  free,
  body,
});

const houseSlot = (body: BodyId): NatalSlot => ({
  id: `natal_body_house_${body}`,
  label: HOUSE_LABEL[body],
  kind: "body_house",
  free: false,
  body,
});

/** Разделы разбора. Аспекты добавляются к разделу отдельно, по карте. */
export const NATAL_SECTIONS: NatalSection[] = [
  {
    id: "lights",
    title: "Светила и асцендент",
    lead: "Три позиции, с которых начинается любая карта: чем вы себя считаете, что вам нужно и каким вас видят.",
    slots: [
      signSlot("sun", true),
      signSlot("moon", true),
      { id: "natal_asc_sign", label: "Асцендент: каким вас видят до того, как узнают", kind: "asc_sign", free: true },
      { id: "natal_mc_sign", label: "Середина неба: к чему вы идёте на виду у других", kind: "mc_sign", free: false },
    ],
  },
  {
    id: "personal",
    title: "Личные планеты",
    lead: "Как вы думаете, что любите и как действуете. Эти три планеты объясняют повседневное поведение.",
    slots: PERSONAL.map((b) => signSlot(b)),
  },
  {
    id: "social",
    title: "Юпитер и Сатурн",
    lead: "Где вам легко расширяться и где приходится взрослеть. Пара, которая задаёт отношение к возможностям и к дисциплине.",
    slots: SOCIAL.map((b) => signSlot(b)),
  },
  {
    id: "outer",
    title: "Высшие планеты",
    lead: "Уран, Нептун и Плутон движутся медленно: их знак общий у целого поколения, а личным его делает дом.",
    slots: OUTER.map((b) => signSlot(b)),
  },
  {
    id: "nodes",
    title: "Лунные узлы",
    lead: "Ось роста: что уже наработано и куда тянет двигаться дальше.",
    slots: [signSlot("north_node")],
  },
  {
    id: "houses",
    title: "Планеты по домам",
    lead: "Дом показывает, в какой области жизни разворачивается планета. Считается только по времени и месту рождения.",
    slots: HOUSE_BODIES.map((b) => houseSlot(b)),
  },
];

/** Сколько вопросов открыто бесплатно и сколько всего (без аспектов). */
export function countNatalSlots(): { free: number; total: number } {
  let free = 0;
  let total = 0;
  for (const s of NATAL_SECTIONS) {
    for (const slot of s.slots) {
      total += 1;
      if (slot.free) free += 1;
    }
  }
  return { free, total };
}

/** Сколько аспектов показываем в разборе: самые точные. */
export const MAX_ASPECT_SLOTS = 12;

/** Слоты аспектов конкретной карты — их набор зависит от карты. */
export function aspectSlots(chart: NatalChart): NatalSlot[] {
  return chart.aspects.slice(0, MAX_ASPECT_SLOTS).map((a) => ({
    id: `natal_aspect_${a.a}_${a.b}_${a.aspect.key}`,
    label: `${a.aspect.name}: ${pointName(a.a)} и ${pointName(a.b)}`,
    kind: "aspect" as const,
    free: false,
    aspect: { a: a.a, b: a.b, key: a.aspect.key },
  }));
}

export const ASPECTS_SECTION = {
  id: "aspects",
  title: "Аспекты",
  lead: "Как позиции спорят и помогают друг другу. Самая интересная часть карты: здесь видно, почему сильные стороны иногда мешают.",
};

/**
 * Ключ текста для вопроса на конкретной карте. null — позицию посчитать
 * нельзя (нет домов без времени и места).
 */
export function natalTextKey(slot: NatalSlot, chart: NatalChart): string | null {
  if (slot.kind === "body_sign" && slot.body) {
    const b = chartBody(chart, slot.body);
    // Ретроградность меняет смысл текста, поэтому входит в ключ: иначе
    // на один ключ пришлось бы два разных текста.
    return b ? `${slot.id}_${b.sign.key}${b.retrograde ? "_r" : ""}` : null;
  }
  if (slot.kind === "body_house" && slot.body) {
    const b = chartBody(chart, slot.body);
    return b?.house ? `${slot.id}_${b.house}` : null;
  }
  if (slot.kind === "asc_sign") return chart.asc ? `${slot.id}_${signAt(chart.asc.longitude).key}` : null;
  if (slot.kind === "mc_sign") return chart.mc ? `${slot.id}_${signAt(chart.mc.longitude).key}` : null;
  if (slot.kind === "aspect" && slot.aspect) return slot.id;
  return null;
}

/** Все разделы карты вместе с аспектами — в порядке показа. */
export function natalSections(chart: NatalChart): NatalSection[] {
  const aspects = aspectSlots(chart);
  const base = NATAL_SECTIONS.filter((s) => s.id !== "houses" || !chart.unknown.houses);
  if (aspects.length === 0) return base;
  return [...base, { ...ASPECTS_SECTION, slots: aspects }];
}

/** Слот по идентификатору — для проверки запроса с клиента. */
export function findNatalSlot(id: string, chart: NatalChart): NatalSlot | null {
  for (const section of natalSections(chart)) {
    const slot = section.slots.find((s) => s.id === id);
    if (slot) return slot;
  }
  return null;
}
