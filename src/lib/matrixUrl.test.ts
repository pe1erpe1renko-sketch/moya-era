/**
 * Даты в адресах разборов матрицы: /matrica/13-07-1998.
 *
 * Смысл проверки. Адрес — вход без формы: любую строку из него сайт
 * превращает в дату и строит по ней разбор. Значит, всё, что форма не
 * пропустила бы, должно отсекаться здесь же, иначе по адресу можно
 * получить матрицу несуществующего дня или человека, который ещё не
 * родился, — с заголовком, OG-картинкой и адресом, годным для индексации.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { urlDateToIso, isoToUrlDate } from "./matrix";
import { isFutureDate, isValidDate } from "./arcana";

const NOW = new Date("2026-09-05T12:00:00Z");

describe("дата в адресе разбора", () => {
  it("обычная дата проходит", () => {
    assert.equal(urlDateToIso("26-07-1990", NOW), "1990-07-26");
    assert.equal(urlDateToIso("01-01-1900", NOW), "1900-01-01");
  });

  it("несуществующий день не проходит", () => {
    for (const bad of ["31-02-1990", "30-02-2000", "31-04-1985", "00-01-1990", "32-01-1990", "01-13-1990"]) {
      assert.equal(urlDateToIso(bad, NOW), null, bad);
    }
  });

  it("29 февраля — только в високосный год", () => {
    assert.equal(urlDateToIso("29-02-2000", NOW), "2000-02-29");
    assert.equal(urlDateToIso("29-02-1900", NOW), null, "1900 не високосный");
    assert.equal(urlDateToIso("29-02-2001", NOW), null);
  });

  it("будущее не проходит — по дню, а не по году", () => {
    // Раньше отсекался только следующий год, и 31 декабря текущего
    // считалось годной датой рождения.
    assert.equal(urlDateToIso("31-12-2026", NOW), null, "конец текущего года");
    assert.equal(urlDateToIso("06-09-2026", NOW), null, "завтра");
    assert.equal(urlDateToIso("05-09-2026", NOW), "2026-09-05", "сегодня — годится");
    assert.equal(urlDateToIso("04-09-2026", NOW), "2026-09-04");
  });

  it("раньше 1900 года не проходит", () => {
    assert.equal(urlDateToIso("31-12-1899", NOW), null);
  });

  it("мусор и другой формат не проходят", () => {
    for (const bad of ["abc", "1990-07-26", "26.07.1990", "26-7-1990", "", "26-07-1990/", "../26-07-1990"]) {
      assert.equal(urlDateToIso(bad, NOW), null, JSON.stringify(bad));
    }
  });

  it("туда и обратно без потерь", () => {
    for (const d of ["26-07-1990", "01-01-1950", "29-02-2000"]) {
      assert.equal(isoToUrlDate(urlDateToIso(d, NOW) as string), d);
    }
  });
});

describe("проверка даты в калькуляторах", () => {
  // Та же граница, что и в адресах: сегодня — можно, завтра — нет. Один
  // помощник на три калькулятора, чтобы они не расходились.
  const now = new Date(2026, 8, 5, 12);

  it("сегодня и раньше — не будущее", () => {
    assert.equal(isFutureDate(5, 9, 2026, now), false);
    assert.equal(isFutureDate(4, 9, 2026, now), false);
    assert.equal(isFutureDate(26, 7, 1990, now), false);
  });

  it("завтра и конец года — будущее", () => {
    assert.equal(isFutureDate(6, 9, 2026, now), true);
    assert.equal(isFutureDate(31, 12, 2026, now), true);
  });

  it("несуществующая дата ловится раньше, чем будущее", () => {
    // Порядок в калькуляторах: сначала «такой даты нет», потом «ещё не
    // наступила». 31 февраля — не будущее, а несуществующий день.
    assert.equal(isValidDate(31, 2, 2026), false);
  });
});
