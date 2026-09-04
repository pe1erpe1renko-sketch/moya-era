/**
 * КАРТА ПОЗИЦИЙ ДИЗАЙНА ЧЕЛОВЕКА
 * ==============================
 * Единственный источник правды о том, из чего состоит разбор бодиграфа и
 * какой текст к какой позиции привязан.
 *
 * КЛЮЧ ТЕКСТА в базе (таблица matrix_texts, общая со всеми системами):
 *   hd_type_projector          — тип
 *   hd_strategy_projector      — стратегия этого типа
 *   hd_authority_emotional     — авторитет
 *   hd_profile_2_4             — профиль
 *   hd_center_sacral_defined   — определённый сакральный центр
 *   hd_center_sacral_open      — открытый сакральный центр
 *   hd_channel_20_34           — канал
 *   hd_gate_41                 — ворота
 *   hd_cross_right_31          — крест воплощения: угол и ворота Солнца
 * Префикс hd_ отделяет их от ключей матрицы и натальной карты.
 *
 * ИДЕНТИФИКАТОРЫ НЕ ПЕРЕИМЕНОВЫВАТЬ: на них висят тексты в базе.
 *
 * БЕСПЛАТНО (решение заказчика от 04.09.2026): бодиграф с определёнными
 * центрами виден всем, читаются тип и стратегия. Авторитет, профиль,
 * каналы и ворота — по подписке.
 */

import { CENTERS, CENTER_ORDER, type CenterId } from "./centers";
import { channelKey } from "./channels";
import { gateName } from "./gates";
import type { HumanDesignChart } from "./chart";

export type HdSlotKind = "type" | "strategy" | "authority" | "profile" | "center" | "channel" | "gate" | "cross" | "brief_center";

export type HdSlot = {
  id: string;
  label: string;
  kind: HdSlotKind;
  free: boolean;
  /** ключ текста в базе */
  key: string;
  center?: CenterId;
  channel?: { a: number; b: number };
  gate?: number;
};

export type HdSection = {
  id: string;
  title: string;
  lead: string;
  slots: HdSlot[];
};

/** Двенадцать существующих профилей. */
export const PROFILES = ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3"];

export const PROFILE_NAMES: Record<string, string> = {
  "1/3": "Исследователь — Мученик",
  "1/4": "Исследователь — Оппортунист",
  "2/4": "Отшельник — Оппортунист",
  "2/5": "Отшельник — Еретик",
  "3/5": "Мученик — Еретик",
  "3/6": "Мученик — Ролевая модель",
  "4/6": "Оппортунист — Ролевая модель",
  "4/1": "Оппортунист — Исследователь",
  "5/1": "Еретик — Исследователь",
  "5/2": "Еретик — Отшельник",
  "6/2": "Ролевая модель — Отшельник",
  "6/3": "Ролевая модель — Мученик",
};

const profileKey = (profile: string) => `hd_profile_${profile.replace("/", "_")}`;

/** Разделы разбора конкретной карты. */
export function hdSections(chart: HumanDesignChart): HdSection[] {
  const sections: HdSection[] = [
    {
      id: "type",
      title: "Тип и стратегия",
      lead: "С чего начинается вся система: как устроен обмен энергией и какой способ принимать решения тратит меньше сил.",
      slots: [
        {
          id: "hd_type",
          label: `Ваш тип: ${chart.type.name}`,
          kind: "type",
          free: true,
          key: `hd_type_${chart.type.id}`,
        },
        {
          id: "hd_strategy",
          label: `Стратегия: ${chart.type.strategy}`,
          kind: "strategy",
          free: true,
          key: `hd_strategy_${chart.type.id}`,
        },
      ],
    },
    {
      id: "authority",
      title: "Авторитет",
      lead: "На что опираться в момент выбора: на тело, на эмоцию, на паузу или на разговор.",
      slots: [
        {
          id: "hd_authority",
          label: `Ваш авторитет: ${chart.authority.name}`,
          kind: "authority",
          free: false,
          key: `hd_authority_${chart.authority.id}`,
        },
      ],
    },
    {
      id: "profile",
      title: "Профиль",
      lead: "Две цифры, описывающие роль: как вы учитесь сами и что даёте другим.",
      slots: [
        {
          id: "hd_profile",
          label: `Профиль ${chart.profile}: ${PROFILE_NAMES[chart.profile] ?? ""}`.trim(),
          kind: "profile",
          free: false,
          key: profileKey(chart.profile),
        },
      ],
    },
    {
      id: "centers",
      title: "Девять центров",
      lead: "Что в вас устойчиво, а что зависит от людей рядом. Определённый центр работает одинаково всегда, открытый усиливает то, что приходит извне.",
      slots: CENTER_ORDER.map((id) => {
        const defined = chart.definedCenters.includes(id);
        return {
          id: `hd_center_${id}`,
          label: `${CENTERS[id].name}: ${defined ? "определён" : "открыт"}`,
          kind: "center" as const,
          free: false,
          key: `hd_center_${id}_${defined ? "defined" : "open"}`,
          center: id,
        };
      }),
    },
  ];

  if (chart.channels.length > 0) {
    sections.push({
      id: "channels",
      title: "Каналы",
      lead: "Горящие каналы — то, что работает в вас постоянно. Именно из них складывается тип.",
      slots: chart.channels.map((c) => ({
        id: `hd_channel_${c.a}_${c.b}`,
        label: `Канал ${c.a}—${c.b}: ${c.name}`,
        kind: "channel" as const,
        free: false,
        key: `hd_channel_${channelKey(c.a, c.b)}`,
        channel: { a: c.a, b: c.b },
      })),
    });
  }

  sections.push({
    id: "gates",
    title: "Ворота",
    lead: "Отдельные активированные ворота: подробности характера, из которых собрана схема.",
    slots: chart.gates.map((g) => ({
      id: `hd_gate_${g}`,
      label: `Ворота ${g}: ${gateName(g)}`,
      kind: "gate" as const,
      free: false,
      key: `hd_gate_${g}`,
      gate: g,
    })),
  });

  sections.push({
    id: "cross",
    title: "Крест воплощения",
    lead: "Четыре ворот, задающие общее направление жизни: два от карты личности и два от карты дизайна.",
    slots: [
      {
        id: "hd_cross",
        label: chart.cross.label,
        kind: "cross",
        free: false,
        key: `hd_cross_${chart.cross.angle}_${chart.cross.gates[0]}`,
      },
    ],
  });

  return sections;
}

/* ─── короткие абзацы для страницы по дате ──────────────────────── */

/**
 * КОРОТКИЕ АБЗАЦЫ О ЦЕНТРАХ. Открыты всем и попадают в HTML страницы по
 * дате (/dizayn-cheloveka/26-07-1990) — это её содержимое для читателя и
 * для поисковика. Ключ: hd_brief_center_sacral_defined.
 *
 * Тип и стратегия своих коротких текстов не получают: они и так открыты
 * целиком, и короткая версия рядом с полной была бы пересказом.
 *
 * Это ОТДЕЛЬНЫЕ тексты, а не начало платных: у них свой промпт и своя
 * задача — назвать состояние центра и один узнаваемый признак.
 */
export function hdBriefSlots(chart: HumanDesignChart): HdSlot[] {
  return CENTER_ORDER.map((id) => {
    const defined = chart.definedCenters.includes(id);
    return {
      id: `hd_brief_center_${id}`,
      label: `${CENTERS[id].name}: ${defined ? "определён" : "открыт"}`,
      kind: "brief_center" as const,
      free: true,
      key: `hd_brief_center_${id}_${defined ? "defined" : "open"}`,
      center: id,
    };
  });
}

/** Слот по идентификатору — для проверки запроса с клиента. */
export function findHdSlot(id: string, chart: HumanDesignChart): HdSlot | null {
  for (const section of hdSections(chart)) {
    const slot = section.slots.find((s) => s.id === id);
    if (slot) return slot;
  }
  // Короткие абзацы живут вне разделов разбора, но запрашиваются тем же API.
  return hdBriefSlots(chart).find((s) => s.id === id) ?? null;
}

/** Сколько вопросов открыто бесплатно и сколько всего в этой карте. */
export function countHdSlots(chart: HumanDesignChart): { free: number; total: number } {
  const slots = hdSections(chart).flatMap((s) => s.slots);
  return { free: slots.filter((s) => s.free).length, total: slots.length };
}
