/**
 * НУМЕРОЛОГИЯ ПО ДАТЕ РОЖДЕНИЯ — расчёт.
 *
 * МЕТОДИКА (выбрана одна, смешивать нельзя).
 * Пифагорейская школа, счёт только по дате: все цифры даты складываются в
 * одну сумму, сумма сворачивается до одной цифры, и свёртка
 * останавливается на 11 или 22 — это мастер-числа, у них своё значение.
 * Тридцать три мастер-числом НЕ считаем.
 *
 * Так было задумано с самого начала: на сайте уже написаны одиннадцать
 * текстов чисел пути (1–9, 11, 22) и объяснение в вопросах и ответах.
 * Менять правило значит выбросить их и переучить читателя.
 *
 * ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ ДРУГИХ КАЛЬКУЛЯТОРОВ. Их две больших семьи:
 *  - одни вовсе не сохраняют мастер-числа и сворачивают всё до 1–9;
 *  - другие сохраняют 11, 22 и 33, но складывают не все цифры подряд, а
 *    свёрнутые по отдельности день, месяц и год.
 * Обе дают другие ответы примерно на одной дате из десяти. Расхождения
 * зафиксированы в тесте поимённо: см. `fixtures/calculators.ts`.
 *
 * ЧИСЛО СУДЬБЫ считается по полному имени, а не по дате, — см.
 * `letters.ts`. Имя необязательно: без него считается всё остальное.
 */

import { destinyNumber, isCountableName, type DestinyBreakdown } from "./letters";

const digits = (s: string) => s.split("").map(Number);
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/** Мастер-числа: свёртка на них останавливается. */
export const MASTER_NUMBERS = [11, 22];

/** Все возможные значения чисел, которые могут быть мастерами. */
export const NUMBER_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22];

/** Значения личного года: это позиция в девятилетнем цикле, мастеров тут нет. */
export const YEAR_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Свёртка до одной цифры с остановкой на мастер-числе.
 * `masters: false` — свернуть до 1–9 без остановок.
 */
export function reduceNumber(value: number, { masters = true } = {}): number {
  let total = Math.abs(value);
  while (total > 9 && !(masters && MASTER_NUMBERS.includes(total))) {
    total = sum(digits(String(total)));
  }
  return total;
}

/** Все цифры даты в порядке день, месяц, год. Нули ведущих разрядов на сумму не влияют. */
export function dateDigits(day: number, month: number, year: number): number[] {
  return digits(`${day}${month}${year}`);
}

/** Число жизненного пути: сумма всех цифр даты. 11 и 22 не сворачиваются. */
export function lifePathNumber(day: number, month: number, year: number): number {
  return reduceNumber(sum(dateDigits(day, month, year)));
}

/** Число дня рождения: число месяца, свёрнутое до одной цифры или мастера. */
export function birthdayNumber(day: number): number {
  return reduceNumber(day);
}

/**
 * Число отношения: день плюс месяц. Описывает не человека изнутри, а то,
 * каким его застают при первой встрече.
 */
export function attitudeNumber(day: number, month: number): number {
  return reduceNumber(sum([...digits(String(day)), ...digits(String(month))]));
}

/**
 * Личный год: день, месяц и текущий год. Это фаза девятилетнего цикла, а
 * не свойство человека, поэтому мастер-числа здесь не сохраняются — иначе
 * из девяти фаз получилось бы одиннадцать.
 */
export function personalYear(day: number, month: number, year: number): number {
  return reduceNumber(sum([...digits(String(day)), ...digits(String(month)), ...digits(String(year))]), {
    masters: false,
  });
}

export type PythagorasResult = {
  /** сумма всех цифр даты */
  first: number;
  /** сумма цифр первого */
  second: number;
  /** первое минус удвоенная первая цифра дня, по модулю */
  third: number;
  /** сумма цифр третьего */
  fourth: number;
  /** сколько раз встречается каждая цифра, counts[1..9] */
  counts: Record<number, number>;
};

/**
 * Квадрат Пифагора: четыре рабочих числа и плотность каждой цифры.
 *
 * ТРЕТЬЕ ЧИСЛО БЕРЁТСЯ ПО МОДУЛЮ. Метод придуман для дат XX века, где
 * сумма цифр заведомо больше удвоенной первой цифры дня. Для дат
 * двухтысячных разность уходит в минус: 9 января 2000 года это 12 − 18.
 * Раньше знак сохранялся в числе, но четвёртое число и сам квадрат уже
 * считались по модулю — и человек видел «12 − 2×9 = −6», а следом «6».
 * Теперь по модулю считается всё: 207 дат диапазона перестали показывать
 * отрицательное рабочее число, которого в методике не бывает.
 */
export function pythagoras(day: number, month: number, year: number): PythagorasResult {
  const dd = dateDigits(day, month, year);
  const first = sum(dd);
  const second = sum(digits(String(first)));
  const firstDayDigit = Number(String(day)[0]);
  const third = Math.abs(first - 2 * firstDayDigit);
  const fourth = sum(digits(String(third)));

  const all = [
    ...dd,
    ...digits(String(first)),
    ...digits(String(second)),
    ...digits(String(third)),
    ...digits(String(fourth)),
  ];

  const counts: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;
  for (const d of all) if (d >= 1 && d <= 9) counts[d] = (counts[d] ?? 0) + 1;

  return { first, second, third, fourth, counts };
}

/** Сколько повторов цифры считаем отдельным текстом: пять и больше — один. */
export const MAX_CELL_BUCKET = 5;

/** Корзина ячейки квадрата: 0, 1, 2, 3, 4 или 5 («пять и больше»). */
export function cellBucket(count: number): number {
  return Math.min(count, MAX_CELL_BUCKET);
}

export type NumerologyChart = {
  /** YYYY-MM-DD */
  date: string;
  day: number;
  month: number;
  year: number;
  path: number;
  birthday: number;
  attitude: number;
  /** личный год на календарный год `forYear` */
  personalYear: number;
  forYear: number;
  square: PythagorasResult;
  /**
   * Имя, если его назвали, — только для обращения в тексте.
   * Живёт исключительно в браузере: на сервер уходит уже число судьбы.
   */
  name: string | null;
  /** число судьбы; null, если имени нет */
  destiny: number | null;
  /**
   * Как это число получилось. null, когда число известно, а имя — нет:
   * так расчёт выглядит на сервере, и это честно, а не «сумма 0».
   */
  destinyBreakdown: DestinyBreakdown | null;
};

/**
 * Полный расчёт по дате.
 * @param forYear для какого календарного года считать личный год
 * @param name    полное имя; без него не будет числа судьбы, остальное будет
 */
export function buildNumerology(
  date: string,
  forYear = new Date().getUTCFullYear(),
  name: string | null = null,
): NumerologyChart | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  const breakdown = name ? destinyNumber(name) : null;

  return {
    date,
    day,
    month,
    year,
    path: lifePathNumber(day, month, year),
    birthday: birthdayNumber(day),
    attitude: attitudeNumber(day, month),
    personalYear: personalYear(day, month, forYear),
    forYear,
    square: pythagoras(day, month, year),
    name: name && isCountableName(name) ? name.trim() : null,
    destiny: breakdown?.value ?? null,
    destinyBreakdown: breakdown,
  };
}

/**
 * Тот же расчёт, но число судьбы задано готовым числом, без имени.
 *
 * Так считает сервер. Имя ему не нужно: для выбора текста хватает числа,
 * а имя — персональные данные, и незачем возить их по сети и класть в
 * журналы запросов. Из имени число выводит браузер, сервер получает
 * результат и проверяет, что это вообще возможное значение.
 */
export function buildNumerologyWithDestiny(
  date: string,
  forYear?: number,
  destiny?: number | null,
): NumerologyChart | null {
  const chart = buildNumerology(date, forYear);
  if (!chart) return null;
  const value = destiny != null && NUMBER_VALUES.includes(destiny) ? destiny : null;
  return { ...chart, destiny: value };
}
