/**
 * КАРТА ПОЗИЦИЙ НУМЕРОЛОГИЧЕСКОГО РАЗБОРА
 * =======================================
 * Единственный источник правды о том, из чего состоит разбор и какой
 * текст к какому числу привязан.
 *
 * КЛЮЧИ ТЕКСТОВ в общей таблице matrix_texts:
 *   num_brief_path_7      — короткая справка о числе пути (бесплатно)
 *   num_path_7            — полный разбор числа пути
 *   num_brief_birthday_8  — короткая справка о числе дня рождения
 *   num_birthday_8        — полный разбор
 *   num_brief_attitude_6  — короткая справка о числе отношения
 *   num_attitude_6        — полный разбор
 *   num_brief_year_3      — короткая справка о личном годе
 *   num_year_3            — полный разбор
 *   num_cell_5_0          — пустая ячейка пятёрки в квадрате Пифагора
 *   num_cell_1_3          — три единицы в квадрате
 *
 * ИДЕНТИФИКАТОРЫ НЕ ПЕРЕИМЕНОВЫВАТЬ: на них висят тексты в базе.
 *
 * БЕСПЛАТНО (решение заказчика от 04.09.2026): схема чисел и по короткому
 * абзацу на каждое число. Полные разборы и квадрат — по подписке.
 */

import { cellBucket, MAX_CELL_BUCKET, type NumerologyChart } from "./numbers";
import { squareLabels } from "./texts";

export type NumerologyNumberId = "path" | "birthday" | "attitude" | "year" | "destiny";

export type NumerologySlotKind = "brief" | "number" | "cell";

export type NumerologySlot = {
  /** устойчивый идентификатор */
  id: string;
  label: string;
  /** короткая подпись справа */
  hint?: string;
  kind: NumerologySlotKind;
  free: boolean;
  /** ключ текста в базе */
  key: string;
  /** для ячейки квадрата: цифра и сколько раз встречается */
  cell?: { digit: number; count: number };
};

export type NumerologySection = {
  id: string;
  title: string;
  lead: string;
  slots: NumerologySlot[];
};

/** Четыре числа разбора: что каждое означает и как называется. */
export const NUMEROLOGY_NUMBERS: Array<{
  id: NumerologyNumberId;
  title: string;
  /** строка под числом на схеме */
  about: string;
  /** вопрос платного разбора */
  question: string;
}> = [
  {
    id: "path",
    title: "Число жизненного пути",
    about: "основной способ действовать: с чего вы начинаете и к чему возвращаетесь",
    question: "Число жизненного пути: как вы устроены",
  },
  {
    id: "birthday",
    title: "Число дня рождения",
    about: "врождённый навык, который даётся без усилия",
    question: "Число дня рождения: что даётся вам даром",
  },
  {
    id: "attitude",
    title: "Число отношения",
    about: "каким вас застают при первой встрече",
    question: "Число отношения: каким вас видят сначала",
  },
  {
    id: "year",
    title: "Личный год",
    about: "фаза девятилетнего цикла, в которой вы сейчас",
    question: "Личный год: что это за фаза и чем она занята",
  },
  {
    id: "destiny",
    title: "Число судьбы",
    about: "задача, которую несёт ваше имя",
    question: "Число судьбы: какую задачу несёт ваше имя",
  },
];

/** Числа, которые считаются по одной дате. Число судьбы требует имени. */
export const DATE_NUMBERS = NUMEROLOGY_NUMBERS.filter((n) => n.id !== "destiny");

/** Значение числа в конкретном расчёте. null — считать его пока нечем. */
export function numberValue(chart: NumerologyChart, id: NumerologyNumberId): number | null {
  if (id === "path") return chart.path;
  if (id === "birthday") return chart.birthday;
  if (id === "attitude") return chart.attitude;
  if (id === "year") return chart.personalYear;
  return chart.destiny;
}

/** Числа, которые есть в этом расчёте: без имени числа судьбы среди них нет. */
export function availableNumbers(chart: NumerologyChart) {
  return NUMEROLOGY_NUMBERS.filter((n) => numberValue(chart, n.id) !== null);
}

/** Короткие справки — бесплатная часть страницы по дате. */
export function briefSlots(chart: NumerologyChart): NumerologySlot[] {
  return availableNumbers(chart).map((n) => {
    const value = numberValue(chart, n.id) as number;
    return {
      id: `num_brief_${n.id}`,
      label: `${n.title} — ${value}`,
      hint: n.id === "year" ? `на ${chart.forYear} год` : undefined,
      kind: "brief" as const,
      free: true,
      key: `num_brief_${n.id}_${value}`,
    };
  });
}

/** Разделы полного разбора. Всё платное. */
export function numerologySections(chart: NumerologyChart): NumerologySection[] {
  return [
    {
      id: "num_numbers",
      title: "Числа подробно",
      lead: "Каждое число отвечает на свой вопрос: как вы действуете, что даётся даром, каким вас видят и в какой фазе цикла вы сейчас. Число судьбы появляется, если назвать имя.",
      slots: availableNumbers(chart).map((n) => {
        const value = numberValue(chart, n.id) as number;
        return {
          id: `num_${n.id}`,
          label: `${n.question}`,
          hint: `${value}`,
          kind: "number" as const,
          free: false,
          key: `num_${n.id}_${value}`,
        };
      }),
    },
    {
      id: "num_square",
      title: "Квадрат Пифагора",
      lead: "Девять ячеек: сколько раз каждая цифра встречается в дате и в рабочих числах. Пустая ячейка говорит не меньше заполненной.",
      slots: Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
        const count = chart.square.counts[digit] ?? 0;
        return {
          id: `num_cell_${digit}`,
          label: `${squareLabels[digit - 1][0].toUpperCase()}${squareLabels[digit - 1].slice(1)}: ${
            count === 0 ? "ячейка пуста" : `${digit}`.repeat(count)
          }`,
          hint: count === 0 ? "пусто" : `${count} ${plural(count)}`,
          kind: "cell" as const,
          free: false,
          key: `num_cell_${digit}_${cellBucket(count)}`,
          cell: { digit, count },
        };
      }),
    },
  ];
}

function plural(n: number): string {
  const last = n % 10;
  if (n >= 11 && n <= 14) return "повторов";
  if (last === 1) return "повтор";
  if (last >= 2 && last <= 4) return "повтора";
  return "повторов";
}

/** Слот по идентификатору — для проверки запроса с клиента. */
export function findNumerologySlot(chart: NumerologyChart, id: string): NumerologySlot | null {
  const all = [...briefSlots(chart), ...numerologySections(chart).flatMap((s) => s.slots)];
  return all.find((s) => s.id === id) ?? null;
}

/** Сколько всего вопросов в разборе и сколько из них открыто. */
export function countNumerologySlots(chart: NumerologyChart): { free: number; total: number } {
  const free = briefSlots(chart).length;
  const paid = numerologySections(chart).reduce((n, s) => n + s.slots.length, 0);
  return { free, total: free + paid };
}

export { MAX_CELL_BUCKET };
