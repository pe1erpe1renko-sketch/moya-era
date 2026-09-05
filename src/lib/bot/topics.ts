/**
 * НАПРАВЛЕНИЯ СВОДКИ — что человек хочет получать утром.
 *
 * Каждое включается и выключается кнопкой в боте. Выключил все —
 * сообщение не отправляется вовсе: пустая сводка хуже её отсутствия.
 *
 * АСТРОЛОГИИ В СВОДКЕ НЕТ, и это решение, а не недоделка: для дневного
 * прогноза нужны транзиты — положения планет на сегодня относительно
 * натальной карты, — а их мы не считаем. Показывать вместо них общие
 * слова значило бы врать в единственном месте, где человек видит нас
 * каждый день.
 */

export type BotTopic = "matrix" | "tarot" | "numerology";

export const BOT_TOPICS: Array<{ id: BotTopic; label: string; hint: string }> = [
  { id: "matrix", label: "Аркан дня", hint: "матрица судьбы" },
  { id: "tarot", label: "Карта дня", hint: "таро" },
  { id: "numerology", label: "Число дня", hint: "нумерология" },
];

export const ALL_TOPICS: BotTopic[] = BOT_TOPICS.map((t) => t.id);

export function isBotTopic(value: string): value is BotTopic {
  return ALL_TOPICS.includes(value as BotTopic);
}

/** Оставляет только известные направления и держит их в постоянном порядке. */
export function normalizeTopics(raw: readonly string[] | null | undefined): BotTopic[] {
  const set = new Set((raw ?? []).filter(isBotTopic));
  return ALL_TOPICS.filter((t) => set.has(t));
}

/** Переключает одно направление. */
export function toggleTopic(current: readonly string[], topic: BotTopic): BotTopic[] {
  const now = normalizeTopics(current);
  return now.includes(topic) ? now.filter((t) => t !== topic) : normalizeTopics([...now, topic]);
}
