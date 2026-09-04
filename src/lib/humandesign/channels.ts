/**
 * ТРИДЦАТЬ ШЕСТЬ КАНАЛОВ
 *
 * Канал горит, когда активны обе его ворота — неважно, из карты личности
 * или из карты дизайна. Горящий канал определяет оба своих центра.
 * Из набора определённых центров выводится тип, поэтому ошибка в одном
 * канале меняет весь результат.
 *
 * Список сверен с открытым калькулятором human-design-mcp (MIT, ссылается
 * на Jovian Archive): те же 36 пар ворот.
 */

import { centerOfGate, type CenterId } from "./centers";

export type Circuit = "individual" | "collective" | "tribal" | "integration";

export type Channel = {
  /** меньшие ворота первыми — от этого зависит ключ текста */
  a: number;
  b: number;
  name: string;
  circuit: Circuit;
};

const RAW: Array<[number, number, string, Circuit]> = [
  // Интеграция
  [10, 20, "Пробуждение", "integration"],
  [20, 34, "Харизма", "integration"],
  [20, 57, "Мозговая волна", "integration"],
  [34, 57, "Сила", "integration"],
  [10, 34, "Исследование", "integration"],
  [10, 57, "Совершенная форма", "integration"],
  // Индивидуальный контур
  [1, 8, "Вдохновение", "individual"],
  [23, 43, "Структурирование", "individual"],
  [24, 61, "Осознанность", "individual"],
  [25, 51, "Инициация", "individual"],
  [2, 14, "Ритм", "individual"],
  [3, 60, "Мутация", "individual"],
  [28, 38, "Борьба", "individual"],
  [39, 55, "Эмоциональность", "individual"],
  [12, 22, "Открытость", "individual"],
  [38, 28, "Борьба", "individual"],
  [22, 12, "Открытость", "individual"],
  [55, 39, "Эмоциональность", "individual"],
  // Коллективный контур: логика
  [4, 63, "Логика", "collective"],
  [7, 31, "Альфа", "collective"],
  [9, 52, "Концентрация", "collective"],
  [11, 56, "Любознательность", "collective"],
  [15, 5, "Ритм жизни", "collective"],
  [16, 48, "Волна", "collective"],
  [17, 62, "Принятие", "collective"],
  [18, 58, "Суждение", "collective"],
  [47, 64, "Абстракция", "collective"],
  // Коллективный контур: чувственный
  [13, 33, "Пророк", "collective"],
  [29, 46, "Открытие", "collective"],
  [30, 41, "Признание", "collective"],
  [35, 36, "Переменчивость", "collective"],
  [42, 53, "Зрелость", "collective"],
  // Племенной контур
  [6, 59, "Близость", "tribal"],
  [19, 49, "Синтез", "tribal"],
  [21, 45, "Деньги", "tribal"],
  [26, 44, "Предприимчивость", "tribal"],
  [27, 50, "Сохранение", "tribal"],
  [32, 54, "Преображение", "tribal"],
  [37, 40, "Общность", "tribal"],
];

/** Каналы без повторов, ворота упорядочены по возрастанию. */
export const CHANNELS: Channel[] = (() => {
  const seen = new Set<string>();
  const out: Channel[] = [];
  for (const [x, y, name, circuit] of RAW) {
    const a = Math.min(x, y);
    const b = Math.max(x, y);
    const key = `${a}_${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ a, b, name, circuit });
  }
  return out.sort((p, q) => p.a - q.a || p.b - q.b);
})();

export function channelKey(a: number, b: number): string {
  return `${Math.min(a, b)}_${Math.max(a, b)}`;
}

const BY_KEY = new Map(CHANNELS.map((c) => [channelKey(c.a, c.b), c]));

export function findChannel(a: number, b: number): Channel | null {
  return BY_KEY.get(channelKey(a, b)) ?? null;
}

/** Центры, которые соединяет канал. */
export function channelCenters(channel: Channel): [CenterId, CenterId] {
  return [centerOfGate(channel.a), centerOfGate(channel.b)];
}

/** Каналы, оба конца которых есть в наборе активных ворот. */
export function activeChannels(gates: Set<number>): Channel[] {
  return CHANNELS.filter((c) => gates.has(c.a) && gates.has(c.b));
}
