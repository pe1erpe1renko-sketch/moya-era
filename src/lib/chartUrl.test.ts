/**
 * Постоянные адреса карт: разбор адреса, диапазон дат и параметры запроса.
 *
 * Смысл проверок: адрес — это обещание поисковику. Он должен разбираться
 * одинаково всегда, а всё, что за пределами диапазона, честно отдавать 404,
 * а не строить карту на 2200 год.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPairQuery,
  parsePairQuery,
  CHART_SYSTEMS,
  FIRST_CHART_DATE,
  allChartDates,
  buildChartQuery,
  chartPath,
  chartUrlDateToIso,
  hasChartQuery,
  isoToChartUrlDate,
  lastChartYear,
  parseChartQuery,
} from "./chartUrl";

const NOW = new Date("2026-09-04T00:00:00Z");

describe("адрес по дате", () => {
  it("разбирается в обе стороны", () => {
    assert.equal(chartUrlDateToIso("26-07-1990", NOW), "1990-07-26");
    assert.equal(isoToChartUrlDate("1990-07-26"), "26-07-1990");
    assert.equal(chartPath("natal", "1990-07-26"), "/natalnaya-karta/26-07-1990");
    assert.equal(chartPath("humandesign", "1990-07-26"), "/dizayn-cheloveka/26-07-1990");
  });

  it("несуществующие даты отвергаются", () => {
    assert.equal(chartUrlDateToIso("31-02-1990", NOW), null);
    assert.equal(chartUrlDateToIso("00-07-1990", NOW), null);
    assert.equal(chartUrlDateToIso("26-13-1990", NOW), null);
    assert.equal(chartUrlDateToIso("1990-07-26", NOW), null, "формат матрицы, а не наш");
    assert.equal(chartUrlDateToIso("sitemap.xml", NOW), null);
    assert.equal(chartUrlDateToIso("", NOW), null);
  });

  it("29 февраля есть только в високосный год", () => {
    assert.equal(chartUrlDateToIso("29-02-2000", NOW), "2000-02-29");
    assert.equal(chartUrlDateToIso("29-02-1900", NOW), null, "1900 не високосный, да и вне диапазона");
    assert.equal(chartUrlDateToIso("29-02-1990", NOW), null);
  });

  it("диапазон: с 1940 года по позапрошлый включительно", () => {
    assert.equal(lastChartYear(NOW), 2024);
    assert.equal(chartUrlDateToIso("01-01-1940", NOW), "1940-01-01");
    assert.equal(chartUrlDateToIso("31-12-1939", NOW), null, "раньше диапазона");
    assert.equal(chartUrlDateToIso("31-12-2024", NOW), "2024-12-31");
    assert.equal(chartUrlDateToIso("01-01-2025", NOW), null, "прошлый год ещё не открыт");
  });
});

describe("время и место в параметрах запроса", () => {
  it("разбираются", () => {
    assert.deepEqual(parseChartQuery({ t: "0940", g: "524901" }), { time: "09:40", placeId: 524901 });
    assert.deepEqual(parseChartQuery({ t: "0000", g: null }), { time: "00:00", placeId: null });
    assert.deepEqual(parseChartQuery({}), { time: null, placeId: null });
  });

  it("мусор молча игнорируется, а не ломает страницу", () => {
    assert.deepEqual(parseChartQuery({ t: "2460", g: "-1" }), { time: null, placeId: null });
    assert.deepEqual(parseChartQuery({ t: "9:40", g: "abc" }), { time: null, placeId: null });
    assert.deepEqual(parseChartQuery({ t: "0940x" }), { time: null, placeId: null });
  });

  it("собираются обратно тем же видом", () => {
    assert.equal(buildChartQuery({ time: "09:40", placeId: 524901 }), "?t=0940&g=524901");
    assert.equal(buildChartQuery({ time: "09:40", placeId: null }), "?t=0940");
    assert.equal(buildChartQuery({ time: null, placeId: 524901 }), "?g=524901");
    assert.equal(buildChartQuery({ time: null, placeId: null }), "");
  });

  it("уточнение видно — от этого зависит noindex", () => {
    assert.equal(hasChartQuery({ time: null, placeId: null }), false);
    assert.equal(hasChartQuery({ time: "09:40", placeId: null }), true);
    assert.equal(hasChartQuery({ time: null, placeId: 524901 }), true);
  });
});

describe("уточнение для пары", () => {
  it("у первого t1/g1, у второго t2/g2", () => {
    const [a, b] = parsePairQuery({ t1: "0940", g1: "524901", t2: "1430", g2: "1496747" });
    assert.deepEqual(a, { time: "09:40", placeId: 524901 });
    assert.deepEqual(b, { time: "14:30", placeId: 1496747 });
  });

  it("уточнён может быть один из двоих", () => {
    const [a, b] = parsePairQuery({ t2: "1430" });
    assert.deepEqual(a, { time: null, placeId: null });
    assert.deepEqual(b, { time: "14:30", placeId: null });
  });

  it("собирается обратно тем же видом", () => {
    assert.equal(
      buildPairQuery({ time: "09:40", placeId: 524901 }, { time: "14:30", placeId: 1496747 }),
      "?t1=0940&g1=524901&t2=1430&g2=1496747",
    );
    assert.equal(buildPairQuery({ time: null, placeId: null }, { time: "14:30", placeId: null }), "?t2=1430");
    assert.equal(buildPairQuery({ time: null, placeId: null }, { time: null, placeId: null }), "");
  });

  it("мусор игнорируется", () => {
    assert.deepEqual(parsePairQuery({ t1: "2599", g1: "0", t2: "abc", g2: "-5" }), [
      { time: null, placeId: null },
      { time: null, placeId: null },
    ]);
  });
});

describe("список дат для карты сайта", () => {
  const dates = allChartDates(NOW);

  it("непрерывен от первой даты до конца диапазона", () => {
    assert.equal(dates[0], FIRST_CHART_DATE);
    assert.equal(dates[dates.length - 1], "2024-12-31");
    const days = (Date.parse("2024-12-31") - Date.parse(FIRST_CHART_DATE)) / 86_400_000 + 1;
    assert.equal(dates.length, days);
    assert.equal(new Set(dates).size, dates.length, "без повторов");
  });

  it("каждая дата даёт рабочий адрес", () => {
    for (const iso of [dates[0], dates[10_000], dates[dates.length - 1]]) {
      assert.equal(chartUrlDateToIso(isoToChartUrlDate(iso), NOW), iso);
    }
  });

  it("29 февраля на месте", () => {
    assert.ok(dates.includes("2000-02-29"));
    assert.ok(!dates.includes("2001-02-29"));
  });

  it("каждой системе хватает файлов карты сайта по 50 000 адресов", () => {
    // Правило: не больше 50 000 адресов в файле. Проверяем, что нарезка
    // по 45 000 даёт целое число файлов и ни один не переполнен.
    const perFile = 45_000;
    const files = Math.ceil(dates.length / perFile);
    assert.ok(files >= 1);
    assert.ok(dates.length - (files - 1) * perFile <= 50_000);
    // Три системы с адресами по дате: карта, дизайн человека, нумерология.
    assert.equal(Object.keys(CHART_SYSTEMS).length, 3);
    for (const system of Object.keys(CHART_SYSTEMS)) {
      assert.match(chartPath(system as never, "1990-07-26"), /^\/[a-z-]+\/26-07-1990$/);
    }
  });
});
