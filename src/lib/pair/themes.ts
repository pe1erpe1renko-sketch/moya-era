/**
 * ТЕМЫ РАЗБОРА ПАРЫ И ГЛОССАРИЙ
 *
 * Аспекты синастрии, наложения домов и каналы композита показываются не
 * списком по точности, а сгруппированными по пяти житейским темам:
 * чувства, общение, страсть, быт, деньги. Человек ищет не «квадрат
 * Венеры к Сатурну», а «где у нас трение» — и находит это по теме.
 *
 * Рядом с каждым термином стоит человеческое пояснение: «квадрат —
 * трение, которое растит». Пояснения короткие и одни на весь сайт —
 * менять здесь, а не в компонентах.
 *
 * Разнесение по темам — редакторское решение, а не астрологическая
 * догма: планета определяет тему по приоритету (Меркурий — общение,
 * Марс и Плутон — страсть, Луна, Венера и Нептун — чувства, Юпитер —
 * деньги, остальное — быт), канал дизайна — по тому, о чём он.
 */

import type { AspectKey, AspectPoint } from "@/lib/natal";
import { channelKey, type Channel } from "@/lib/humandesign";

export type ThemeId = "feelings" | "talk" | "passion" | "life" | "money";

export type Theme = { id: ThemeId; title: string; lead: string; /** «в чувствах» — для сводки */ where: string };

export const THEMES: Theme[] = [
  { id: "feelings", title: "Чувства", lead: "Тепло, привязанность и то, как вы чувствуете друг друга без слов", where: "в чувствах" },
  { id: "talk", title: "Общение", lead: "Разговоры, идеи и то, насколько легко вам понимать друг друга", where: "в общении" },
  { id: "passion", title: "Страсть", lead: "Влечение, напор и энергия, которая рождается между вами", where: "в страсти" },
  { id: "life", title: "Быт", lead: "Ритмы, дом, обязанности и то, как вы живёте рядом изо дня в день", where: "в быте" },
  { id: "money", title: "Деньги", lead: "Ресурсы, амбиции и общее дело", where: "в деньгах и общем деле" },
];

export const themeById = (id: ThemeId): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];

/* ─── синастрия ─────────────────────────────────────────────────── */

/** Тема аспекта между планетой одного и планетой другого. */
export function synastryTheme(a: AspectPoint, b: AspectPoint): ThemeId {
  const has = (p: AspectPoint) => a === p || b === p;
  if (has("mercury")) return "talk";
  if (has("mars") || has("pluto")) return "passion";
  if (has("moon") || has("venus") || has("neptune")) return "feelings";
  if (has("jupiter")) return "money";
  return "life";
}

/** Тема дома: в какую область жизни одного попадает планета другого. */
export function houseTheme(house: number): ThemeId {
  if (house === 5) return "passion";
  if (house === 12) return "feelings";
  if (house === 2 || house === 8 || house === 10) return "money";
  if (house === 3 || house === 9 || house === 11) return "talk";
  return "life";
}

/** Что значит аспект — одной строкой, для подписи рядом с термином. */
export const ASPECT_GLOSS: Record<AspectKey, string> = {
  conjunction: "соединение — усиливают друг друга",
  trine: "тригон — легко и само собой",
  sextile: "секстиль — возможность, если её взять",
  square: "квадрат — трение, которое растит",
  opposition: "оппозиция — противоположности, которые дополняют друг друга",
};

/** О чём дом — одной строкой. */
export const HOUSE_GLOSS: Record<number, string> = {
  1: "как вы видите друг друга",
  2: "деньги и ценности",
  3: "разговоры и повседневные связи",
  4: "дом и семья",
  5: "романтика, игра, дети",
  6: "быт, работа, забота",
  7: "партнёрство",
  8: "общие ресурсы и глубина",
  9: "взгляды и дальние планы",
  10: "цели и статус",
  11: "друзья и общее будущее",
  12: "скрытое и невысказанное",
};

export const houseGloss = (house: number): string => HOUSE_GLOSS[house] ?? "";

/* ─── композит ──────────────────────────────────────────────────── */

/** Тема каждого из тридцати шести каналов — по тому, о чём он. */
export const CHANNEL_THEMES: Array<[number, number, ThemeId]> = [
  [12, 22, "feelings"],
  [19, 49, "feelings"],
  [35, 36, "feelings"],
  [39, 55, "feelings"],
  [1, 8, "talk"],
  [4, 63, "talk"],
  [10, 20, "talk"],
  [11, 56, "talk"],
  [13, 33, "talk"],
  [17, 62, "talk"],
  [20, 57, "talk"],
  [23, 43, "talk"],
  [24, 61, "talk"],
  [47, 64, "talk"],
  [6, 59, "passion"],
  [25, 51, "passion"],
  [28, 38, "passion"],
  [30, 41, "passion"],
  [34, 57, "passion"],
  [3, 60, "life"],
  [5, 15, "life"],
  [7, 31, "life"],
  [9, 52, "life"],
  [10, 34, "life"],
  [10, 57, "life"],
  [18, 58, "life"],
  [20, 34, "life"],
  [27, 50, "life"],
  [29, 46, "life"],
  [37, 40, "life"],
  [42, 53, "life"],
  [2, 14, "money"],
  [16, 48, "money"],
  [21, 45, "money"],
  [26, 44, "money"],
  [32, 54, "money"],
];

const CHANNEL_THEME_BY_KEY = new Map(CHANNEL_THEMES.map(([a, b, theme]) => [channelKey(a, b), theme]));

/** Тема канала. Неизвестный канал уходит в быт, чтобы не потеряться. */
export function channelTheme(channel: Pick<Channel, "a" | "b">): ThemeId {
  return CHANNEL_THEME_BY_KEY.get(channelKey(channel.a, channel.b)) ?? "life";
}
