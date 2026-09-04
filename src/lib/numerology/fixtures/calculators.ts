/**
 * ЭТАЛОН ДЛЯ СВЕРКИ НУМЕРОЛОГИИ
 *
 * Значения сняты один раз двумя независимыми открытыми калькуляторами и
 * зафиксированы числами. Сами библиотеки в проект не входят.
 *
 *   ref1 — PyPI `numerology` 1.8, класс Pythagorean.
 *          Мастер-числа НЕ сохраняет: сворачивает всё до 1–9.
 *   ref2 — npm `@thanhpham99/numerology` 1.0.2 (MIT).
 *          Сохраняет 11, 22 и 33, но считает по СВЁРНУТЫМ частям даты
 *          (день + месяц + год по отдельности), а не по сумме всех цифр.
 *
 * Мы держимся третьей, своей методики и не смешиваем её с этими двумя —
 * см. `numbers.ts`. Эталон нужен, чтобы расхождения были видимыми и
 * объяснёнными, а не случайными: тест проверяет, что каждое расхождение
 * попадает ровно в известный класс (мастер-число), а во всём остальном
 * мы совпадаем с обоими.
 */

export type NumerologyReference = {
  /** YYYY-MM-DD */
  date: string;
  ref1: { life: number; day: number; month: number; year: number };
  ref2: { life: number; day: number; personalYear2026: number };
};

export const NUMEROLOGY_REFERENCE: NumerologyReference[] = [
  { date: "1990-07-26", ref1: { life: 7, day: 8, month: 7, year: 1 }, ref2: { life: 7, day: 8, personalYear2026: 7 } },
  { date: "1998-07-13", ref1: { life: 2, day: 4, month: 7, year: 9 }, ref2: { life: 2, day: 4, personalYear2026: 3 } },
  { date: "1992-04-09", ref1: { life: 7, day: 9, month: 4, year: 3 }, ref2: { life: 7, day: 9, personalYear2026: 5 } },
  { date: "1966-09-11", ref1: { life: 6, day: 2, month: 9, year: 4 }, ref2: { life: 6, day: 11, personalYear2026: 3 } },
  { date: "1975-08-29", ref1: { life: 5, day: 2, month: 8, year: 4 }, ref2: { life: 5, day: 2, personalYear2026: 2 } },
  { date: "2000-01-01", ref1: { life: 4, day: 1, month: 1, year: 2 }, ref2: { life: 4, day: 1, personalYear2026: 3 } },
  { date: "1940-01-01", ref1: { life: 7, day: 1, month: 1, year: 5 }, ref2: { life: 7, day: 1, personalYear2026: 3 } },
  { date: "2024-12-31", ref1: { life: 6, day: 4, month: 3, year: 8 }, ref2: { life: 6, day: 4, personalYear2026: 8 } },
  { date: "1991-10-10", ref1: { life: 4, day: 1, month: 1, year: 2 }, ref2: { life: 4, day: 10, personalYear2026: 3 } },
  { date: "2022-11-05", ref1: { life: 4, day: 5, month: 2, year: 6 }, ref2: { life: 22, day: 5, personalYear2026: 8 } },
  { date: "1990-09-23", ref1: { life: 6, day: 5, month: 9, year: 1 }, ref2: { life: 33, day: 5, personalYear2026: 6 } },
  { date: "1951-12-12", ref1: { life: 4, day: 3, month: 3, year: 7 }, ref2: { life: 22, day: 3, personalYear2026: 7 } },
  { date: "2001-01-15", ref1: { life: 1, day: 6, month: 1, year: 3 }, ref2: { life: 10, day: 6, personalYear2026: 8 } },
  { date: "2013-03-20", ref1: { life: 2, day: 2, month: 3, year: 6 }, ref2: { life: 11, day: 2, personalYear2026: 6 } },
  { date: "1947-09-17", ref1: { life: 2, day: 8, month: 9, year: 3 }, ref2: { life: 2, day: 8, personalYear2026: 9 } },
  { date: "1999-09-09", ref1: { life: 1, day: 9, month: 9, year: 1 }, ref2: { life: 1, day: 9, personalYear2026: 1 } },
  { date: "1969-01-19", ref1: { life: 9, day: 1, month: 1, year: 7 }, ref2: { life: 9, day: 1, personalYear2026: 3 } },
  { date: "1953-07-14", ref1: { life: 3, day: 5, month: 7, year: 9 }, ref2: { life: 3, day: 5, personalYear2026: 4 } },
  { date: "1975-06-03", ref1: { life: 4, day: 3, month: 6, year: 4 }, ref2: { life: 4, day: 3, personalYear2026: 1 } },
  { date: "1998-05-25", ref1: { life: 3, day: 7, month: 5, year: 9 }, ref2: { life: 3, day: 7, personalYear2026: 4 } },
  { date: "1944-05-01", ref1: { life: 6, day: 1, month: 5, year: 9 }, ref2: { life: 6, day: 1, personalYear2026: 7 } },
  { date: "1946-07-01", ref1: { life: 1, day: 1, month: 7, year: 2 }, ref2: { life: 1, day: 1, personalYear2026: 9 } },
  { date: "2013-09-05", ref1: { life: 2, day: 5, month: 9, year: 6 }, ref2: { life: 2, day: 5, personalYear2026: 6 } },
  { date: "1988-01-28", ref1: { life: 1, day: 1, month: 1, year: 8 }, ref2: { life: 1, day: 1, personalYear2026: 3 } },
  { date: "1948-06-11", ref1: { life: 3, day: 2, month: 6, year: 4 }, ref2: { life: 3, day: 11, personalYear2026: 9 } },
  { date: "1972-10-21", ref1: { life: 5, day: 3, month: 1, year: 1 }, ref2: { life: 5, day: 3, personalYear2026: 5 } },
  { date: "1992-04-13", ref1: { life: 2, day: 4, month: 4, year: 3 }, ref2: { life: 2, day: 4, personalYear2026: 9 } },
  { date: "1945-03-15", ref1: { life: 1, day: 6, month: 3, year: 1 }, ref2: { life: 1, day: 6, personalYear2026: 1 } },
  { date: "2021-08-12", ref1: { life: 7, day: 3, month: 8, year: 5 }, ref2: { life: 7, day: 3, personalYear2026: 3 } },
  { date: "1985-07-10", ref1: { life: 4, day: 1, month: 7, year: 5 }, ref2: { life: 4, day: 10, personalYear2026: 9 } },
];
