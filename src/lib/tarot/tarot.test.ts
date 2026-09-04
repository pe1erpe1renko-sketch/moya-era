/**
 * Карта дня: выбор аркана, московские сутки и позиции разбора.
 *
 * Смысл проверок. Карта дня держится на одном обещании: она у всех
 * меняется в один момент и не зависит ни от случая, ни от часового пояса
 * читателя. Обещание легко сломать незаметно — часами сервера, часами
 * браузера, лишним аргументом в затравке, — и заметно это станет только
 * по жалобам «у нас с подругой разные карты». Поэтому проверяется именно
 * оно, а не форматирование.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arcana, centralArcanum } from "../arcana";
import { dayArcanum } from "../dayCard";
import {
  arcanumInfo,
  briefSlot,
  buildDayCard,
  buildTaroRequest,
  countTarotSlots,
  dayCardArcanum,
  findTarotSlot,
  moscowDay,
  nextMoscowMidnight,
  taroContextFor,
  tarotSections,
  TARO_PROMPT_VERSION,
} from "./index";

const BIRTH = "1990-07-26";

describe("московские сутки", () => {
  it("полночь по Москве — это 21:00 предыдущего дня по всемирному времени", () => {
    assert.equal(moscowDay(new Date("2026-09-04T20:59:59Z")), "2026-09-04");
    assert.equal(moscowDay(new Date("2026-09-04T21:00:00Z")), "2026-09-05");
  });

  it("день не зависит от того, где стоит сервер", () => {
    // Один и тот же момент — один и тот же день, как его ни спрашивай.
    const moment = new Date("2026-01-01T00:30:00Z");
    assert.equal(moscowDay(moment), "2026-01-01", "по Москве уже 3:30 первого января");
    assert.equal(moment.toISOString().slice(0, 10), "2026-01-01");

    const newYearEve = new Date("2025-12-31T21:30:00Z");
    assert.equal(moscowDay(newYearEve), "2026-01-01", "по Москве новый год уже наступил");
    assert.equal(newYearEve.toISOString().slice(0, 10), "2025-12-31", "а по всемирному ещё нет");
  });

  it("следующая смена карты — ближайшая московская полночь", () => {
    const at = nextMoscowMidnight(new Date("2026-09-04T10:00:00Z"));
    assert.equal(at.toISOString(), "2026-09-04T21:00:00.000Z");
    assert.equal(moscowDay(new Date(at.getTime() + 1000)), "2026-09-05");
  });

  it("смена всегда впереди и не дальше суток", () => {
    for (const iso of ["2026-09-04T20:59:00Z", "2026-09-04T21:01:00Z", "2026-03-08T02:00:00Z", "2026-12-31T23:59:00Z"]) {
      const now = new Date(iso);
      const gap = nextMoscowMidnight(now).getTime() - now.getTime();
      assert.ok(gap > 0, iso);
      assert.ok(gap <= 86_400_000, iso);
    }
  });
});

describe("выбор карты", () => {
  it("одна и та же дата в один и тот же день даёт одну и ту же карту", () => {
    const a = dayCardArcanum(BIRTH, "2026-09-04");
    for (let i = 0; i < 50; i++) assert.equal(dayCardArcanum(BIRTH, "2026-09-04"), a);
  });

  it("механика взята из общей, а не написана заново", () => {
    // Если кто-то заведёт вторую перемешивалку, карта на странице и карта
    // в кабинете разойдутся — а человек увидит это как враньё.
    for (const day of ["2026-09-04", "2026-01-01", "2030-12-31"]) {
      assert.equal(dayCardArcanum(BIRTH, day), dayArcanum(BIRTH, day));
    }
  });

  it("карта меняется от дня ко дню и от даты к дате", () => {
    const days = Array.from({ length: 40 }, (_, i) => `2026-09-${String(i % 30 + 1).padStart(2, "0")}`);
    const seen = new Set(days.map((d) => dayCardArcanum(BIRTH, d)));
    assert.ok(seen.size > 5, `за месяц выпало всего ${seen.size} разных арканов`);

    const sameDay = new Set(
      ["1990-07-26", "1990-07-27", "1985-01-01", "2001-12-31"].map((b) => dayCardArcanum(b, "2026-09-04")),
    );
    assert.ok(sameDay.size > 1, "в один день у всех одна и та же карта — так быть не должно");
  });

  it("аркан всегда в пределах колоды старших", () => {
    for (let i = 0; i < 3000; i++) {
      const n = dayCardArcanum(`19${String(50 + (i % 50))}-0${(i % 9) + 1}-1${i % 10}`, `2026-0${(i % 9) + 1}-1${i % 10}`);
      assert.ok(n >= 1 && n <= 22, `${n}`);
      assert.ok(Number.isInteger(n));
    }
  });

  it("за длинный срок выпадают все 22 аркана", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      seen.add(dayCardArcanum(BIRTH, d));
    }
    assert.equal(seen.size, 22, "какой-то аркан не выпадает никогда");
  });
});

describe("карта дня целиком", () => {
  const now = new Date("2026-09-04T10:00:00Z");

  it("собирается по дате рождения и московским суткам", () => {
    const card = buildDayCard(BIRTH, now)!;
    assert.equal(card.birth, BIRTH);
    assert.equal(card.day, "2026-09-04");
    assert.equal(card.arcanum, dayCardArcanum(BIRTH, "2026-09-04"));
  });

  it("аркан рождения — тот же, что в матрице и быстром расчёте", () => {
    const card = buildDayCard(BIRTH, now)!;
    assert.equal(card.birthArcanum, centralArcanum(26, 7, 1990), "тот же расчёт, что у матрицы");
    assert.equal(card.birthArcanum, 5, "26.07.1990 — пятый аркан");
    assert.ok(card.birthArcanum >= 1 && card.birthArcanum <= 22);
  });

  it("негодная дата не даёт карты", () => {
    for (const bad of ["", "26-07-1990", "1990-13-01", "1990-02-30", "не дата"]) {
      assert.equal(buildDayCard(bad, now), null, bad);
    }
  });

  it("после московской полуночи карта другая", () => {
    const before = buildDayCard(BIRTH, new Date("2026-09-04T20:59:00Z"))!;
    const after = buildDayCard(BIRTH, new Date("2026-09-04T21:01:00Z"))!;
    assert.equal(before.day, "2026-09-04");
    assert.equal(after.day, "2026-09-05");
    assert.notEqual(before.arcanum, after.arcanum);
  });
});

describe("названия арканов", () => {
  it("тяжёлые названы по-нашему", () => {
    // Решение заказчика: со «Смертью» и «Дьяволом» человек читает не
    // текст, а свой испуг. Названия держатся по всему сайту.
    assert.equal(arcanumInfo(13).name, "Перерождение");
    assert.equal(arcanumInfo(15).name, "Искушение");
    assert.equal(arcanumInfo(16).name, "Обновление");
    assert.equal(arcanumInfo(20).name, "Пробуждение");
  });

  it("страшных названий на сайте нет ни одного", () => {
    const forbidden = ["смерть", "дьявол", "башня", "страшный суд"];
    for (const card of arcana) {
      assert.ok(!forbidden.includes(card.name.toLowerCase()), `аркан ${card.n}: ${card.name}`);
    }
  });

  it("у всех 22 арканов есть имя и строка", () => {
    for (let n = 1; n <= 22; n++) {
      const info = arcanumInfo(n);
      assert.ok(info.name.length > 0, `${n}`);
      assert.ok(info.line.length > 0, `${n}`);
    }
  });
});

describe("позиции разбора", () => {
  const card = buildDayCard(BIRTH, new Date("2026-09-04T10:00:00Z"))!;

  it("бесплатна одна справка, остальное под замком", () => {
    assert.equal(countTarotSlots(card).free, 1);
    assert.equal(countTarotSlots(card).total, 4);
    assert.equal(briefSlot(card).free, true);
    assert.ok(tarotSections(card).flatMap((s) => s.slots).every((s) => !s.free));
  });

  it("ключ справки зависит только от аркана дня", () => {
    assert.equal(briefSlot(card).key, `taro_day_${card.arcanum}`);
  });

  it("ключ парного разбора зависит от обоих арканов", () => {
    const pair = tarotSections(card)[0].slots.find((s) => s.id === "taro_on")!;
    assert.equal(pair.key, `taro_on_${card.arcanum}_${card.birthArcanum}`);

    // Разные арканы рождения — разные тексты: иначе «на фоне вашей карты
    // рождения» было бы пустым обещанием.
    const other = { ...card, birthArcanum: card.birthArcanum === 1 ? 2 : 1 };
    assert.notEqual(tarotSections(other)[0].slots.find((s) => s.id === "taro_on")!.key, pair.key);
  });

  it("всего ключей ровно столько, сколько обещано", () => {
    const keys = new Set<string>();
    for (let day = 1; day <= 22; day++) {
      for (let birth = 1; birth <= 22; birth++) {
        const c = { ...card, arcanum: day, birthArcanum: birth };
        keys.add(briefSlot(c).key);
        for (const slot of tarotSections(c).flatMap((s) => s.slots)) keys.add(slot.key);
      }
    }
    // 22 справки + 22×22 парных + 22 «что делать» + 22 «обратная сторона»
    assert.equal(keys.size, 22 + 484 + 22 + 22);
    assert.equal(keys.size, 550);
  });

  it("слот находится по идентификатору", () => {
    assert.ok(findTarotSlot(card, "taro_day"));
    assert.ok(findTarotSlot(card, "taro_on"));
    assert.equal(findTarotSlot(card, "нет такого"), null);
  });
});

describe("промпты", () => {
  const card = buildDayCard(BIRTH, new Date("2026-09-04T10:00:00Z"))!;
  const slots = [briefSlot(card), ...tarotSections(card).flatMap((s) => s.slots)];

  it("у каждой позиции есть свой промпт", () => {
    for (const slot of slots) {
      const ctx = taroContextFor(slot, card);
      assert.ok(ctx, slot.id);
      assert.equal(ctx!.key, slot.key);
      assert.ok(buildTaroRequest(ctx!).user.length > 50, slot.id);
      assert.equal(buildTaroRequest(ctx!).version, TARO_PROMPT_VERSION);
    }
  });

  it("одна позиция — один текст: промпты не совпадают между собой", () => {
    const texts = slots.map((s) => buildTaroRequest(taroContextFor(s, card)!).user);
    assert.equal(new Set(texts).size, texts.length);
  });

  it("в промпт подставлено название аркана, а не только номер", () => {
    const ctx = taroContextFor(briefSlot({ ...card, arcanum: 13 }), { ...card, arcanum: 13 })!;
    assert.ok(buildTaroRequest(ctx).user.includes("Перерождение"));
  });

  it("парный промпт знает оба аркана", () => {
    const c = { ...card, arcanum: 9, birthArcanum: 13 };
    const slot = tarotSections(c)[0].slots.find((s) => s.id === "taro_on")!;
    const user = buildTaroRequest(taroContextFor(slot, c)!).user;
    assert.ok(user.includes("Отшельник"));
    assert.ok(user.includes("Перерождение"));
  });

  it("совпадение арканов оговорено отдельно", () => {
    const c = { ...card, arcanum: 7, birthArcanum: 7 };
    const slot = tarotSections(c)[0].slots.find((s) => s.id === "taro_on")!;
    assert.ok(buildTaroRequest(taroContextFor(slot, c)!).user.includes("совпали"));

    const d = { ...card, arcanum: 7, birthArcanum: 8 };
    const other = tarotSections(d)[0].slots.find((s) => s.id === "taro_on")!;
    assert.ok(!buildTaroRequest(taroContextFor(other, d)!).user.includes("совпали"));
  });

  it("модели запрещено называть дату и обращаться по имени", () => {
    // Текст пишется один раз и живёт годами: «сегодня, 4 сентября» в нём
    // станет враньём завтра, а имя — послезавтра у другого человека.
    for (const slot of slots) {
      const system = buildTaroRequest(taroContextFor(slot, card)!).system;
      assert.ok(system.includes("ДАТЫ ТЫ ТОЖЕ НЕ ЗНАЕШЬ"), slot.id);
      assert.ok(system.includes("не называй число, месяц, день недели и время года"), slot.id);
    }
    assert.ok(buildTaroRequest(taroContextFor(slots[1], card)!).system.includes("ИМЕНИ ЧЕЛОВЕКА ТЫ НЕ ЗНАЕШЬ"));
  });

  it("названия тяжёлых арканов защищены в самом промпте", () => {
    for (const slot of slots) {
      assert.ok(buildTaroRequest(taroContextFor(slot, card)!).system.includes("Перерождение"), slot.id);
    }
  });
});
