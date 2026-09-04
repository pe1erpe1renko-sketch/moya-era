/**
 * ЧИСЛО СУДЬБЫ ПО ИМЕНИ
 *
 * МЕТОДИКА. Пифагорейская таблица букв: каждая буква получает номер своей
 * позиции в алфавите, свёрнутый до 1–9. Для латиницы это классическое
 * A=1 … I=9, J=1 … R=9, S=1 … Z=8; для кириллицы — то же правило по
 * русскому алфавиту из 33 букв: А=1 … З=9, И=1 … Р=9, С=1 … Щ=9, Ъ=1 … Я=6.
 *
 * Почему эта. Она — прямой аналог того, как мы считаем даты: складываем
 * всё подряд и сворачиваем один раз, останавливаясь на 11 и 22. И она же
 * стоит в обоих открытых калькуляторах, с которыми мы сверялись по датам:
 * их таблицы букв совпали до последней буквы (см. `letters.test.ts`).
 *
 * Халдейскую таблицу не берём. Она устроена иначе — по звучанию, без
 * девятки, — и смешивать её с пифагорейским счётом дат нельзя: получится
 * винегрет из двух школ в одном разборе.
 *
 * БУКВА Ё. В печатных таблицах у неё своё значение 7. Мы приводим её к Е
 * перед подсчётом, и вот почему: «Фёдор» и «Федор» — одно имя, человек
 * пишет его то так, то этак, а число судьбы у него одно. Пусть лучше
 * расчёт не зависит от привычки ставить точки, чем совпадает с печатной
 * таблицей ценой двух разных ответов на одно имя. То же и с Ь, Ъ — они
 * считаются как обычные буквы, у них есть свои значения.
 */

import { reduceNumber } from "./numbers";

const CYRILLIC = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const LATIN = "abcdefghijklmnopqrstuvwxyz";

/** Позиция буквы в алфавите, свёрнутая до 1–9. */
function tableOf(alphabet: string): Record<string, number> {
  const out: Record<string, number> = {};
  alphabet.split("").forEach((ch, i) => {
    out[ch] = ((i % 9) + 1) as number;
  });
  return out;
}

/**
 * Таблица кириллицы по алфавиту из 33 букв. Значение Ё здесь есть, но в
 * расчёт не попадает: буква приводится к Е раньше (см. `nameLetters`).
 */
export const CYRILLIC_LETTERS = tableOf(CYRILLIC);

/** Классическая пифагорейская таблица латиницы. */
export const LATIN_LETTERS = tableOf(LATIN);

/** Значение одной буквы или null, если это не буква. */
export function letterValue(ch: string): number | null {
  const lower = ch.toLowerCase();
  return CYRILLIC_LETTERS[lower] ?? LATIN_LETTERS[lower] ?? null;
}

/**
 * Буквы имени, годные для счёта: без пробелов, дефисов, цифр и точек.
 * Ё приводится к Е, регистр не важен.
 */
export function nameLetters(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .split("")
    .filter((ch) => letterValue(ch) !== null);
}

/** Есть ли в строке хоть что-то, что можно считать именем. */
export function isCountableName(name: string): boolean {
  return nameLetters(name).length >= 2;
}

export type DestinyBreakdown = {
  /** число судьбы: 1–9, 11 или 22 */
  value: number;
  /** сумма значений всех букв до свёртки */
  sum: number;
  /** буквы и их значения — чтобы показать арифметику на виду */
  letters: Array<{ letter: string; value: number }>;
};

/**
 * Число судьбы: сумма значений всех букв полного имени, свёрнутая один
 * раз. Мастер-числа 11 и 22 сохраняются, как и в числах по дате.
 * null — считать нечего.
 */
export function destinyNumber(name: string): DestinyBreakdown | null {
  const letters = nameLetters(name);
  if (letters.length < 2) return null;
  const detailed = letters.map((letter) => ({ letter, value: letterValue(letter) as number }));
  const sum = detailed.reduce((a, b) => a + b.value, 0);
  return { value: reduceNumber(sum), sum, letters: detailed };
}

/**
 * Имя для обращения — первое слово, с заглавной буквы: «Пётр Иванович
 * Петров» → «Пётр». Пустая строка, если обращаться не к кому.
 *
 * Этим же местом пользуются письма и телеграм-бот: обращение собирается
 * снаружи текста, а не подставляется в него. Тексты разборов пишутся один
 * раз и лежат в базе, имени в них нет и быть не может — иначе один текст
 * пришлось бы хранить для каждого имени на свете.
 */
export function addressName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/[\s-]+/)[0] ?? "";
  const clean = first.replace(/[^\p{L}]/gu, "");
  if (clean.length < 2) return "";
  return clean[0].toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Обращение перед фразой: «Пётр, » или пустая строка. Без имени
 * предложение должно читаться само по себе, без дырки на его месте.
 */
export function greeting(name: string | null | undefined): string {
  const who = addressName(name);
  return who ? `${who}, ` : "";
}

/** Первая буква фразы после обращения: с именем строчная, без него — заглавная. */
export function afterGreeting(name: string | null | undefined, sentence: string): string {
  const who = greeting(name);
  if (!who) return sentence;
  return who + sentence[0].toLowerCase() + sentence.slice(1);
}
