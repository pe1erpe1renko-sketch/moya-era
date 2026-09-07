/**
 * КАРТА ПОЗИЦИЙ РАЗБОРА ПАРЫ
 * ==========================
 * Единственный источник правды о том, из чего состоит разбор синастрии и
 * композита и какой текст к какой позиции привязан.
 *
 * КЛЮЧИ ТЕКСТОВ в общей таблице matrix_texts:
 *   syn_brief_sun_moon_trine     — главная связь пары (бесплатно)
 *   syn_aspect_venus_mars_square — Венера первого в квадрате к Марсу второго
 *   syn_house_moon_7             — Луна одного в седьмом доме другого
 *   hdc_brief_generator_projector — главная связь пары (бесплатно)
 *   hdc_type_generator_projector  — полный разбор пары типов
 *   hdc_channel_20_34_electromagnetic — канал связи и её вид
 *   hdc_definition_split          — определение композита
 *   pair_brief_matrix_15          — главная связь по матрице (бесплатно)
 *
 * ИДЕНТИФИКАТОРЫ НЕ ПЕРЕИМЕНОВЫВАТЬ: на них висят тексты в базе.
 *
 * БЕСПЛАТНО (решение заказчика от 04.09.2026): схема пары и один абзац о
 * главном по каждому из трёх взглядов. Всё остальное — по подписке.
 * Причина: ссылкой на совместимость делятся со вторым человеком, и он
 * должен увидеть живой результат, а не замок с порога.
 */

import { BODIES, type BodyId } from "@/lib/ephemeris";
import { ASPECTS, pointName, type AspectPoint } from "@/lib/natal";
import { CENTERS, DEFINITIONS, channelCenters } from "@/lib/humandesign";
import {
  CONNECTION_KINDS,
  compositeBriefKey,
  compositeChannelKey,
  compositeDefinitionKey,
  compositeTypeKey,
  type Composite,
} from "./composite";
import { synastryAspectKey, synastryBriefKey, synastryHouseKey, type Synastry } from "./synastry";
import { ASPECT_GLOSS, channelTheme, houseGloss, houseTheme, synastryTheme, type ThemeId } from "./themes";

export type PairSlotKind =
  | "brief"
  | "syn_aspect"
  | "syn_house"
  | "hdc_type"
  | "hdc_definition"
  | "hdc_channel";

export type PairSlot = {
  /** устойчивый идентификатор в пределах взгляда */
  id: string;
  label: string;
  /** короткая подпись справа: орбис, вид связи */
  hint?: string;
  kind: PairSlotKind;
  free: boolean;
  /** ключ текста в базе */
  key: string;
  /** наложение домов: чья планета и в какой дом попала */
  overlay?: { body: BodyId; bodyName: string; house: number };
  /** житейская тема для группировки: чувства, общение, страсть, быт, деньги */
  theme?: ThemeId;
  /** термин человеческим языком: «квадрат — трение, которое растит» */
  gloss?: string;
};

export type PairSection = {
  id: string;
  title: string;
  lead: string;
  slots: PairSlot[];
};

/** Сколько межкарточных аспектов показываем: самые точные. */
export const MAX_SYNASTRY_ASPECTS = 12;

/* ─── синастрия ─────────────────────────────────────────────────── */

const first = (point: AspectPoint) => `${pointName(point)} первого`;
const second = (point: AspectPoint) => `${pointName(point)} второго`;

export function synastryBriefSlot(synastry: Synastry): PairSlot {
  const lead = synastry.leading;
  return {
    id: "syn_brief",
    label: lead ? `${first(lead.a)} и ${second(lead.b)}: ${ASPECTS[lead.aspect.key].name.toLowerCase()}` : "Что вас связывает",
    kind: "brief",
    free: true,
    key: synastryBriefKey(synastry),
  };
}

export function synastrySections(synastry: Synastry): PairSection[] {
  const sections: PairSection[] = [
    {
      id: "syn_lead",
      title: "Что вас связывает",
      lead: "Самая сильная связь между вашими картами — с неё начинается всё остальное.",
      slots: [synastryBriefSlot(synastry)],
    },
  ];

  const aspects = synastry.aspects.slice(0, MAX_SYNASTRY_ASPECTS);
  if (aspects.length > 0) {
    sections.push({
      id: "syn_aspects",
      title: "Аспекты между картами",
      lead: "Планета одного и планета другого. Здесь видно, где вы друг друга поддерживаете, а где задеваете.",
      slots: aspects.map((x) => ({
        id: `syn_aspect_${x.a}_${x.b}_${x.aspect.key}`,
        label: `${first(x.a)} и ${second(x.b)}: ${ASPECTS[x.aspect.key].name.toLowerCase()}`,
        hint: `орбис ${x.orb.toFixed(1)}°`,
        kind: "syn_aspect" as const,
        free: false,
        key: synastryAspectKey(x.a, x.b, x.aspect.key),
        theme: synastryTheme(x.a, x.b),
        gloss: ASPECT_GLOSS[x.aspect.key],
      })),
    });
  }

  if (synastry.overlays.length > 0) {
    sections.push({
      id: "syn_houses",
      title: "Наложение домов",
      lead: "В какую область жизни одного попадает планета другого. Считается только по времени и месту рождения обоих.",
      slots: synastry.overlays.map((o) => ({
        id: `syn_house_${o.owner}_${o.body}`,
        label: `${BODIES[o.body].name} ${o.owner === 0 ? "первого" : "второго"} — ${o.house} дом ${o.owner === 0 ? "второго" : "первого"}`,
        kind: "syn_house" as const,
        free: false,
        key: synastryHouseKey(o.body, o.house),
        overlay: { body: o.body, bodyName: BODIES[o.body].name, house: o.house },
        theme: houseTheme(o.house),
        gloss: `${o.house} дом — ${houseGloss(o.house)}`,
      })),
    });
  }

  return sections;
}

/* ─── композит ──────────────────────────────────────────────────── */

export function compositeBriefSlot(composite: Composite): PairSlot {
  return {
    id: "hdc_brief",
    label: `${composite.first.type.name} и ${composite.second.type.name}`,
    kind: "brief",
    free: true,
    key: compositeBriefKey(composite.first.type.id, composite.second.type.id),
  };
}

export function compositeSections(composite: Composite): PairSection[] {
  const sections: PairSection[] = [
    {
      id: "hdc_lead",
      title: "Что вас связывает",
      lead: "Два типа обмениваются энергией по-разному. С этого начинается всё остальное в паре.",
      slots: [compositeBriefSlot(composite)],
    },
    {
      id: "hdc_together",
      title: "Как вы устроены вместе",
      lead: "Пара типов и определение общей схемы: сколько в ней связанных кусков и насколько вы самодостаточны вдвоём.",
      slots: [
        {
          id: "hdc_type",
          label: `${composite.first.type.name} и ${composite.second.type.name}: как это работает`,
          kind: "hdc_type",
          free: false,
          key: compositeTypeKey(composite.first.type.id, composite.second.type.id),
        },
        {
          id: "hdc_definition",
          label: `Определение пары: ${DEFINITIONS[composite.definition]}`,
          kind: "hdc_definition",
          free: false,
          key: compositeDefinitionKey(composite.definition),
        },
      ],
    },
  ];

  if (composite.channels.length > 0) {
    sections.push({
      id: "hdc_channels",
      title: "Каналы связи",
      lead: "Каждый горящий канал пары — отдельный вид связи. Электромагнитные каналы существуют только вдвоём: это и притяжение, и трение.",
      slots: composite.channels.map((c) => ({
        id: `hdc_channel_${c.channel.a}_${c.channel.b}`,
        label: `Канал ${c.channel.a}—${c.channel.b}: ${c.channel.name}`,
        kind: "hdc_channel" as const,
        free: false,
        key: compositeChannelKey(c.channel.a, c.channel.b, c.kind),
        theme: channelTheme(c.channel),
        gloss: `${CONNECTION_KINDS[c.kind].name.toLowerCase()} — ${CONNECTION_KINDS[c.kind].about}`,
      })),
    });
  }

  return sections;
}

/** Центры канала — для подсветки схемы. */
export const channelCentersOf = channelCenters;

/** Название центра композита. */
export const centerLabel = (id: keyof typeof CENTERS) => CENTERS[id].name;

/* ─── матрица ───────────────────────────────────────────────────── */

/** Ключ бесплатного абзаца матричной совместимости: аркан пары. */
export function matrixBriefKey(pairArcana: number): string {
  return `pair_brief_matrix_${pairArcana}`;
}

/** Слот бесплатного абзаца матричной совместимости. */
export function matrixBriefSlot(pairArcana: number): PairSlot {
  return {
    id: "pair_brief_matrix",
    label: `Аркан пары ${pairArcana}`,
    kind: "brief",
    free: true,
    key: matrixBriefKey(pairArcana),
  };
}

/** Слот по идентификатору — для проверки запроса с клиента. */
export function findPairSlot(sections: PairSection[], id: string): PairSlot | null {
  for (const section of sections) {
    const slot = section.slots.find((s) => s.id === id);
    if (slot) return slot;
  }
  return null;
}
