/**
 * Устойчивость результата за сутки рождения.
 *
 * Смысл проверок: оговорка должна появляться по факту, а не всегда.
 * Если за сутки результат один и тот же — оговорок нет. Если меняется —
 * назван момент перехода в местном времени.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clockLabel, dayBounds, formatLocalClock, scanDay } from "./dayScan";
import { localToUtc } from "./localTime";
import { hdDayVariation, hdSignature } from "@/lib/humandesign";
import { natalDayVariation } from "@/lib/natal";

describe("границы суток", () => {
  it("с поясом — местные сутки, без пояса — всемирные", () => {
    const moscow = dayBounds("1998-07-13", "Europe/Moscow");
    assert.equal(moscow.start.toISOString(), "1998-07-12T20:00:00.000Z");
    assert.equal(moscow.noon.toISOString(), "1998-07-13T08:00:00.000Z");
    assert.equal(moscow.end.toISOString(), "1998-07-13T19:59:00.000Z");

    const utc = dayBounds("1998-07-13", null);
    assert.equal(utc.start.toISOString(), "1998-07-13T00:00:00.000Z");
    assert.equal(utc.noon.toISOString(), "1998-07-13T12:00:00.000Z");
  });

  it("часы момента печатаются в местном времени", () => {
    const utc = localToUtc("1998-07-13", "14:20", "Europe/Moscow").utc;
    assert.equal(formatLocalClock(utc, "Europe/Moscow"), "14:20");
    assert.equal(formatLocalClock(utc, null), "10:20");
    // Летом 1998 Новосибирск жил по UTC+7, Москва по UTC+4: разница три часа.
    assert.equal(formatLocalClock(utc, "Asia/Novosibirsk"), "17:20");
  });

  it("подпись, чьё это время", () => {
    assert.equal(clockLabel("Москва, Россия"), "по времени в городе Москва");
    assert.equal(clockLabel(null), "по всемирному времени");
  });
});

describe("поиск момента перехода", () => {
  it("находит границу с точностью до минуты", () => {
    // Простая функция: до 15:30 по Москве «до», после — «после».
    const edge = localToUtc("2020-05-05", "15:30", "Europe/Moscow").utc.getTime();
    const scan = scanDay(
      "2020-05-05",
      "Europe/Moscow",
      (utc) => (utc.getTime() < edge ? "до" : "после"),
      (a, b) => a === b,
    );
    assert.equal(scan.stable, false);
    assert.equal(scan.changes.length, 1);
    assert.equal(formatLocalClock(scan.changes[0].at, "Europe/Moscow"), "15:30");
    assert.equal(scan.changes[0].from, "до");
    assert.equal(scan.changes[0].to, "после");
    assert.equal(scan.value, "до", "показываем значение на полдень");
  });

  it("ничего не меняется — сутки устойчивы", () => {
    const scan = scanDay("2020-05-05", "Europe/Moscow", () => "одно и то же", (a, b) => a === b);
    assert.equal(scan.stable, true);
    assert.deepEqual(scan.changes, []);
  });
});

describe("дизайн человека за сутки", () => {
  it("13 июля 1998 без места: результат меняется, поэтому нужна оговорка", () => {
    const v = hdDayVariation("1998-07-13", null, null);
    assert.equal(v.stable, false);
    assert.ok(v.facts.length > 0);
    assert.ok(
      v.facts.every((f) => /по всемирному времени/.test(f)),
      v.facts.join(" | "),
    );
  });

  it("26 июля 1990 в Москве: за сутки меняется тип, и он назван первым", () => {
    const v = hdDayVariation("1990-07-26", "Europe/Moscow", "Москва, Россия");
    assert.equal(v.stable, false);
    assert.match(v.facts[0], /^тип меняется с «Проектор» на «Генератор» после \d\d:\d\d по времени в городе Москва$/);
  });

  it("подпись карты личности и дизайна считается на полдень", () => {
    const noon = hdSignature(new Date("1990-07-26T09:00:00Z"));
    assert.ok(noon.type && noon.authority && /^\d\/\d$/.test(noon.profile));
    assert.equal(noon.centers.length + 0, new Set(noon.centers).size);
  });
});

describe("натальная карта за сутки", () => {
  it("26 июля 1990: Луна меняет знак — оговорка нужна", () => {
    const v = natalDayVariation("1990-07-26", "Europe/Moscow", "Москва, Россия");
    assert.equal(v.stable, false);
    assert.match(v.facts[0], /^Луна переходит из знака Дева в знак Весы в \d\d:\d\d по времени в городе Москва$/);
  });

  it("15 января 2024: за сутки ничего не меняется — оговорки нет", () => {
    const v = natalDayVariation("2024-01-15", "Europe/Moscow", "Москва, Россия");
    assert.equal(v.stable, true);
    assert.deepEqual(v.facts, []);
  });

  it("13 июля 1998: знаки планет за сутки не меняются", () => {
    const v = natalDayVariation("1998-07-13", null, null);
    assert.equal(v.stable, true);
  });
});
