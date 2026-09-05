/**
 * ЖИВОЙ РАСКЛАД — четыре вида, колода и позиции.
 *
 * КОЛОДА — 22 старших аркана, те самые, на которые есть иллюстрации.
 * Младших не заводим: без картинок они выглядели бы бедно рядом с
 * остальным сайтом, а рисовать 56 карт никто не подписывался.
 *
 * КАРТЫ ВЫПАДАЮТ И ПЕРЕВЁРНУТЫМИ. Это не украшение: перевёрнутая карта
 * читается иначе, и без неё расклад из двадцати двух карт слишком беден.
 * Изображение при этом разворачивается на сто восемьдесят градусов.
 *
 * ЦЕНЫ ЗДЕСЬ — ТОЛЬКО ЗАПАСНЫЕ. Настоящие лежат в базе, рядом с тарифами
 * и пакетами кредитов, и меняются UPDATE-ом без деплоя. Эти нужны, чтобы
 * расклады работали до первого наполнения таблицы и чтобы тесты не
 * зависели от базы.
 */

export type SpreadId = "one" | "three" | "love" | "big";

export type SpreadPosition = {
  /** устойчивый идентификатор позиции */
  id: string;
  /** что означает место в раскладе */
  label: string;
};

export type SpreadKind = {
  id: SpreadId;
  title: string;
  /**
   * Одна строка о том, когда его брать. Число карт сюда не пишется:
   * витрина ставит его рядом сама, и в подсказке оно повторялось бы
   * дважды («5 карт · пять карт о том, что…»).
   */
  hint: string;
  /** запасная цена в кредитах; настоящая — из базы */
  credits: number;
  positions: SpreadPosition[];
};

export const SPREADS: SpreadKind[] = [
  {
    id: "one",
    title: "Одна карта",
    hint: "короткий ответ на один вопрос",
    credits: 1,
    positions: [{ id: "answer", label: "Ответ" }],
  },
  {
    id: "three",
    title: "Три карты",
    hint: "ситуация, препятствие, совет",
    credits: 3,
    positions: [
      { id: "situation", label: "Ситуация" },
      { id: "obstacle", label: "Препятствие" },
      { id: "advice", label: "Совет" },
    ],
  },
  {
    id: "love",
    title: "Отношения",
    hint: "что происходит между двумя",
    credits: 4,
    positions: [
      { id: "you", label: "Вы в этих отношениях" },
      { id: "partner", label: "Второй человек" },
      { id: "between", label: "Что между вами" },
      { id: "obstacle", label: "Что мешает" },
      { id: "direction", label: "Куда это идёт" },
    ],
  },
  {
    id: "big",
    title: "Большой расклад",
    hint: "подробный разбор одного вопроса",
    credits: 7,
    positions: [
      { id: "core", label: "Суть вопроса" },
      { id: "cross", label: "Что пересекает" },
      { id: "root", label: "Основание, откуда всё растёт" },
      { id: "past", label: "Что уходит" },
      { id: "crown", label: "К чему вы стремитесь" },
      { id: "future", label: "Что приближается" },
      { id: "self", label: "Вы сами в этой истории" },
      { id: "outside", label: "Окружение и обстоятельства" },
      { id: "hopes", label: "Надежды и страхи" },
      { id: "outcome", label: "К чему всё идёт" },
    ],
  },
];

export function findSpread(id: string): SpreadKind | null {
  return SPREADS.find((s) => s.id === id) ?? null;
}

/** Сколько карт в раскладе. */
export function spreadSize(id: SpreadId): number {
  return findSpread(id)?.positions.length ?? 0;
}

/* ─── колода ────────────────────────────────────────────────────── */

export const DECK_SIZE = 22;

export type DrawnCard = {
  /** аркан, 1..22 */
  arcanum: number;
  /** карта легла перевёрнутой */
  reversed: boolean;
  /** какое место в раскладе занимает */
  position: SpreadPosition;
};

/**
 * Источник случайности: целое от 0 (включительно) до `max` (исключая).
 *
 * В бою сюда приходит `crypto.randomInt`. `Math.random` здесь не годится
 * не из суеверия: человек платит кредитами, и предсказуемая раздача —
 * это подделка результата, за который заплатили.
 */
export type RandomInt = (max: number) => number;

/**
 * Тянет карты без повторов.
 *
 * Перемешивание Фишера — Йетса по первым n позициям: каждая карта
 * равновероятно оказывается на каждом месте, и одна и та же карта не
 * может выпасть дважды в одном раскладе.
 */
export function drawCards(spread: SpreadKind, randomInt: RandomInt): DrawnCard[] {
  const deck = Array.from({ length: DECK_SIZE }, (_, i) => i + 1);
  const n = spread.positions.length;

  for (let i = 0; i < n; i++) {
    const j = i + randomInt(deck.length - i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return spread.positions.map((position, i) => ({
    arcanum: deck[i],
    // Половина на половину: перевёрнутая карта не реже прямой.
    reversed: randomInt(2) === 1,
    position,
  }));
}
