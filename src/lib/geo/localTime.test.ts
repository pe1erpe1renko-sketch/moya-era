/**
 * Перевод местного времени в UTC на советской истории поясов.
 * Ожидаемые смещения — из базы tzdata (IANA), которую использует Node.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatOffset, isValidTimeZone, localToUtc, zoneOffsetMinutes } from "./localTime";
import { resolveBirthMoment } from "./birthMoment";

/** [пояс, местная дата, местное время, ожидаемый момент UTC, смещение в часах] */
const CASES: Array<[string, string, string, string, number]> = [
  ["Europe/Moscow", "1925-07-01", "12:00", "1925-07-01T10:00:00Z", 2], // до декретного времени
  ["Europe/Moscow", "1935-07-01", "12:00", "1935-07-01T09:00:00Z", 3], // декретное время с 1930
  ["Europe/Moscow", "1975-07-01", "12:00", "1975-07-01T09:00:00Z", 3], // летнего времени ещё нет
  ["Europe/Moscow", "1985-01-15", "12:00", "1985-01-15T09:00:00Z", 3],
  ["Europe/Moscow", "1985-07-15", "12:00", "1985-07-15T08:00:00Z", 4], // декретное + летнее
  ["Europe/Moscow", "1991-04-15", "12:00", "1991-04-15T09:00:00Z", 3], // декретное отменено 31.03.1991
  ["Europe/Moscow", "1991-10-15", "12:00", "1991-10-15T10:00:00Z", 2], // осень 1991 без декретного
  ["Europe/Moscow", "1992-07-15", "12:00", "1992-07-15T08:00:00Z", 4], // декретное вернули 19.01.1992
  ["Europe/Moscow", "2012-01-15", "12:00", "2012-01-15T08:00:00Z", 4], // постоянное летнее 2011–2014
  ["Europe/Moscow", "2015-01-15", "12:00", "2015-01-15T09:00:00Z", 3],
  ["Asia/Novosibirsk", "1985-07-15", "12:00", "1985-07-15T04:00:00Z", 8],
  ["Asia/Novosibirsk", "2000-07-15", "12:00", "2000-07-15T05:00:00Z", 7],
  ["Asia/Yekaterinburg", "1991-10-15", "12:00", "1991-10-15T08:00:00Z", 4],
  ["Europe/Samara", "1991-04-15", "12:00", "1991-04-15T09:00:00Z", 3], // Самара в 1991 жила по Москве
  ["Europe/Kaliningrad", "1935-07-01", "12:00", "1935-07-01T11:00:00Z", 1], // немецкое время
  ["Europe/Kyiv", "1985-07-15", "12:00", "1985-07-15T08:00:00Z", 4],
  ["Europe/Kyiv", "2012-01-15", "12:00", "2012-01-15T10:00:00Z", 2],
  ["Europe/Minsk", "1991-10-15", "12:00", "1991-10-15T10:00:00Z", 2],
  ["Asia/Almaty", "1985-07-15", "12:00", "1985-07-15T05:00:00Z", 7],
  ["Asia/Tashkent", "1992-07-15", "12:00", "1992-07-15T07:00:00Z", 5],
  ["Asia/Tbilisi", "2000-07-15", "12:00", "2000-07-15T07:00:00Z", 5],
  ["Europe/Riga", "1925-07-01", "12:00", "1925-07-01T10:23:26Z", 1 + 36 / 60 + 34 / 3600], // местное среднее время
];

describe("местное время → UTC с историей поясов", () => {
  for (const [tz, date, time, expected, hours] of CASES) {
    it(`${tz} ${date} ${time} → ${expected}`, () => {
      const r = localToUtc(date, time, tz);
      assert.equal(r.utc.toISOString(), new Date(expected).toISOString());
      assert.ok(Math.abs(r.offsetMinutes - hours * 60) < 0.02, `смещение ${r.offsetMinutes}`);
      assert.equal(r.nonexistent, false);
      assert.equal(r.ambiguous, false);
      assert.ok(Math.abs(zoneOffsetMinutes(r.utc, tz) - hours * 60) < 0.02);
    });
  }

  it("несуществовавшее время: 1 апреля 1981, 00:30, часы перевели с 00:00 на 01:00", () => {
    const r = localToUtc("1981-04-01", "00:30", "Europe/Moscow");
    assert.equal(r.nonexistent, true);
    assert.equal(r.offsetMinutes, 180);
    assert.equal(r.utc.toISOString(), "1981-03-31T21:30:00.000Z");
  });

  it("двойное время: 30 сентября 1981, 23:30, часы перевели с 00:00 на 23:00", () => {
    const r = localToUtc("1981-09-30", "23:30", "Europe/Moscow");
    assert.equal(r.ambiguous, true);
    assert.equal(r.offsetMinutes, 240); // первое, летнее
    assert.equal(r.utc.toISOString(), "1981-09-30T19:30:00.000Z");
  });

  it("пояса: старое и новое имя Киева, неизвестный пояс", () => {
    assert.equal(isValidTimeZone("Europe/Kiev"), true);
    assert.equal(isValidTimeZone("Europe/Kyiv"), true);
    assert.equal(isValidTimeZone("Mars/Olympus"), false);
  });

  it("запись смещения", () => {
    assert.equal(formatOffset(180), "UTC+3");
    assert.equal(formatOffset(330), "UTC+5:30");
    assert.equal(formatOffset(-60), "UTC−1");
    assert.equal(formatOffset(0), "UTC+0");
    assert.equal(formatOffset(96 + 34 / 60), "UTC+1:36:34");
  });
});

describe("момент рождения для расчёта", () => {
  it("время и место известны", () => {
    const m = resolveBirthMoment({ date: "1985-07-15", time: "12:00", tz: "Asia/Novosibirsk", latitude: 55.03, longitude: 82.92 });
    assert.equal(m.precision, "exact");
    assert.equal(m.hasPlace, true);
    assert.equal(m.utc.toISOString(), "1985-07-15T04:00:00.000Z");
    assert.equal(m.offsetLabel, "UTC+8");
    assert.equal(m.clockShiftNote, null);
  });

  it("время неизвестно: полдень местного времени, дома не определены", () => {
    const m = resolveBirthMoment({ date: "1985-07-15", time: null, tz: "Asia/Novosibirsk", latitude: 55.03, longitude: 82.92 });
    assert.equal(m.precision, "noon");
    assert.equal(m.utc.toISOString(), "1985-07-15T04:00:00.000Z");
  });

  it("место не распознано: полдень UTC", () => {
    const m = resolveBirthMoment({ date: "1985-07-15", time: "09:00", tz: null, latitude: null, longitude: null });
    assert.equal(m.precision, "date_only");
    assert.equal(m.hasPlace, false);
    assert.equal(m.utc.toISOString(), "1985-07-15T12:00:00.000Z");
    assert.equal(m.offsetLabel, null);
  });

  it("перевод часов отмечается словами", () => {
    const m = resolveBirthMoment({ date: "1981-04-01", time: "00:30", tz: "Europe/Moscow", latitude: 55.75, longitude: 37.62 });
    assert.ok(m.clockShiftNote && m.clockShiftNote.includes("вперёд"));
  });
});
