/**
 * СВЕРКА НУМЕРОЛОГИИ С ДВУМЯ НЕЗАВИСИМЫМИ КАЛЬКУЛЯТОРАМИ
 *
 * Методик в нумерологии несколько, и они дают разные ответы на одной дате
 * из десяти. Мы держимся одной (см. `numbers.ts`), а тест следит, чтобы
 * расхождения с чужими калькуляторами были ОБЪЯСНЁННЫМИ, а не случайными:
 * каждое расхождение обязано попадать ровно в известный класс —
 * мастер-число. Во всём остальном мы совпадаем с обоими эталонами.
 *
 * Так поймается настоящая ошибка: если завтра расчёт разъедется с
 * эталонами там, где мастер-чисел нет, тест упадёт.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NUMEROLOGY_REFERENCE } from "./fixtures/calculators";
import {
  MASTER_NUMBERS,
  attitudeNumber,
  birthdayNumber,
  buildNumRequest,
  buildNumerology,
  buildNumerologyWithDestiny,
  cellBucket,
  briefSlots,
  findNumerologySlot,
  lifePathNumber,
  numContextFor,
  numberValue,
  numerologySections,
  personalYear,
  pythagoras,
  reduceNumber,
} from "./index";

const parse = (date: string) => date.split("-").map(Number) as [number, number, number];

describe("свёртка и мастер-числа", () => {
  it("сворачивает до одной цифры, останавливаясь на 11 и 22", () => {
    assert.equal(reduceNumber(38), 11, "38 → 11 и стоп");
    assert.equal(reduceNumber(22), 22);
    assert.equal(reduceNumber(33), 6, "33 мастер-числом не считаем");
    assert.equal(reduceNumber(44), 8);
    assert.equal(reduceNumber(9), 9);
    assert.equal(reduceNumber(0), 0);
  });

  it("для личного года мастер-чисел нет: фаз в цикле девять", () => {
    assert.equal(reduceNumber(38, { masters: false }), 2);
    assert.equal(reduceNumber(22, { masters: false }), 4);
    for (let y = 1940; y <= 2030; y++) {
      const v = personalYear(29, 2, y);
      assert.ok(v >= 1 && v <= 9, `${y}: личный год ${v} вне 1–9`);
    }
  });
});

describe("сверка с открытыми калькуляторами", () => {
  /**
   * Главная проверка арифметики. Свёрнутое до 1–9 значение не зависит от
   * методики вовсе: это цифровой корень суммы. Если мы где-то ошибёмся в
   * сложении, корни разойдутся — и тест это поймает, не придираясь к
   * мастер-числам, в которых школы законно расходятся.
   */
  it("свёрнутое число пути сходится с обоими эталонами на всех датах", () => {
    for (const r of NUMEROLOGY_REFERENCE) {
      const [y, m, d] = parse(r.date);
      const root = reduceNumber(lifePathNumber(d, m, y), { masters: false });
      assert.equal(root, reduceNumber(r.ref1.life, { masters: false }), `${r.date}: против эталона 1`);
      assert.equal(root, reduceNumber(r.ref2.life, { masters: false }), `${r.date}: против эталона 2`);
    }
  });

  it("расхождения бывают только там, где школы расходятся в мастер-числах", () => {
    let diffs = 0;
    for (const r of NUMEROLOGY_REFERENCE) {
      const [y, m, d] = parse(r.date);
      const ours = lifePathNumber(d, m, y);
      if (ours === r.ref1.life && ours === r.ref2.life) continue;
      diffs += 1;
      const theirs = [r.ref1.life, r.ref2.life];
      const masterInvolved = MASTER_NUMBERS.includes(ours) || theirs.some((t) => [11, 22, 33].includes(t));
      // Второй эталон местами не доводит свёртку до конца и отдаёт 10 —
      // это его дефект, а не другая методика. Такой случай тоже известен.
      const unreduced = theirs.some((t) => t > 9 && ![11, 22, 33].includes(t));
      assert.ok(
        masterInvolved || unreduced,
        `${r.date}: необъяснённое расхождение — наш ${ours}, эталоны ${theirs.join(" и ")}`,
      );
    }
    assert.ok(diffs > 0, "в эталоне должны быть расходящиеся случаи, иначе он бесполезен");
    assert.ok(diffs < NUMEROLOGY_REFERENCE.length / 2, "расхождений не должно быть больше половины");
  });

  it("свёрнутое число дня рождения сходится с обоими", () => {
    for (const r of NUMEROLOGY_REFERENCE) {
      const [, , d] = parse(r.date);
      const root = reduceNumber(birthdayNumber(d), { masters: false });
      assert.equal(root, reduceNumber(r.ref1.day, { masters: false }), `${r.date}: день против эталона 1`);
      assert.equal(root, reduceNumber(r.ref2.day, { masters: false }), `${r.date}: день против эталона 2`);
    }
  });

  it("наш ответ всегда доведён до конца: 10 и прочие огрызки невозможны", () => {
    // Второй эталон на некоторых датах отдаёт 10. У нас такого быть не может.
    for (const r of NUMEROLOGY_REFERENCE) {
      const [y, m, d] = parse(r.date);
      for (const v of [lifePathNumber(d, m, y), birthdayNumber(d), attitudeNumber(d, m), personalYear(d, m, 2026)]) {
        assert.ok(v <= 9 || MASTER_NUMBERS.includes(v), `${r.date}: ${v} не свёрнуто`);
      }
    }
  });

  it("личный год совпадает со вторым эталоном", () => {
    for (const r of NUMEROLOGY_REFERENCE) {
      const [, m, d] = parse(r.date);
      assert.equal(personalYear(d, m, 2026), r.ref2.personalYear2026, `${r.date}: личный год на 2026`);
    }
  });
});

describe("квадрат Пифагора", () => {
  it("третье рабочее число не бывает отрицательным", () => {
    // Раньше для дат двухтысячных выходило «12 − 2×9 = −6», а квадрат при
    // этом считался по модулю: человек видел одно, а получал другое.
    let checked = 0;
    for (let y = 1940; y <= 2024; y++) {
      for (let m = 1; m <= 12; m++) {
        const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
        for (let d = 1; d <= days; d++) {
          const sq = pythagoras(d, m, y);
          assert.ok(sq.third >= 0, `${d}.${m}.${y}: третье число ${sq.third}`);
          checked += 1;
        }
      }
    }
    assert.equal(checked, 31047, "проверен весь диапазон адресов");
  });

  it("9 января 2000: то самое место, где раньше выходил минус", () => {
    const sq = pythagoras(9, 1, 2000);
    assert.equal(sq.first, 12, "9+1+2+0+0+0");
    assert.equal(sq.third, 6, "|12 − 2×9|");
    assert.equal(sq.fourth, 6);
  });

  it("26 июля 1990: рабочие числа считаются по правилу", () => {
    const sq = pythagoras(26, 7, 1990);
    assert.equal(sq.first, 34, "2+6+7+1+9+9+0");
    assert.equal(sq.second, 7, "3+4");
    assert.equal(sq.third, 30, "34 − 2×2");
    assert.equal(sq.fourth, 3, "3+0");
  });

  it("в квадрат попадают цифры даты и всех четырёх рабочих чисел", () => {
    const sq = pythagoras(26, 7, 1990);
    // 2 6 7 1 9 9 0 | 3 4 | 7 | 3 0 | 3 — нули не считаются
    assert.equal(sq.counts[3], 3, "тройки: из 34, из 30 и само четвёртое");
    assert.equal(sq.counts[9], 2);
    assert.equal(sq.counts[7], 2, "семёрка даты и второе рабочее число");
    // Цифры даты 2 6 7 1 9 9 (ноль не считается) плюс 3 4 | 7 | 3 | 3.
    const total = Object.values(sq.counts).reduce((a, b) => a + b, 0);
    assert.equal(total, 11);
  });

  it("корзины ячеек: пять и больше — одна", () => {
    assert.equal(cellBucket(0), 0);
    assert.equal(cellBucket(4), 4);
    assert.equal(cellBucket(5), 5);
    assert.equal(cellBucket(9), 5);
  });
});

describe("разбор по дате", () => {
  const chart = buildNumerology("1990-07-26", 2026)!;

  it("считается целиком", () => {
    assert.ok(chart);
    assert.equal(chart.path, 7);
    assert.equal(chart.birthday, 8, "26 → 8");
    assert.equal(chart.attitude, 6, "2+6+7 = 15 → 6");
    assert.equal(chart.personalYear, 7, "2+6+7+2+0+2+6 = 25 → 7");
    assert.equal(chart.forYear, 2026);
  });

  it("негодные даты отвергаются", () => {
    assert.equal(buildNumerology("1990-02-31"), null);
    assert.equal(buildNumerology("26-07-1990"), null);
    assert.equal(buildNumerology(""), null);
  });

  it("бесплатно — четыре коротких абзаца, остальное под замком", () => {
    const brief = briefSlots(chart);
    assert.equal(brief.length, 4);
    assert.ok(brief.every((s) => s.free));
    assert.deepEqual(
      brief.map((s) => s.key),
      ["num_brief_path_7", "num_brief_birthday_8", "num_brief_attitude_6", "num_brief_year_7"],
    );

    const paid = numerologySections(chart).flatMap((s) => s.slots);
    assert.equal(paid.length, 13, "четыре числа и девять ячеек");
    assert.ok(paid.every((s) => !s.free));
    assert.ok(paid.every((s) => s.key.startsWith("num_")));
  });

  it("API находит слот по идентификатору", () => {
    assert.ok(findNumerologySlot(chart, "num_brief_path"));
    assert.ok(findNumerologySlot(chart, "num_cell_5"));
    assert.equal(findNumerologySlot(chart, "нет такого"), null);
  });

  it("без имени числа судьбы нет, и это не ошибка", () => {
    assert.equal(chart.name, null);
    assert.equal(chart.destiny, null);
    assert.equal(briefSlots(chart).length, 4, "четыре числа по дате");
    assert.ok(!briefSlots(chart).some((s) => s.id === "num_brief_destiny"));
  });

  it("с именем появляется пятое число и пятая справка", () => {
    const named = buildNumerology("1990-07-26", 2026, "Пётр Иванович Петров")!;
    assert.equal(named.name, "Пётр Иванович Петров");
    assert.ok(named.destiny);
    assert.equal(named.path, chart.path, "числа по дате от имени не зависят");
    assert.equal(named.birthday, chart.birthday);

    const brief = briefSlots(named);
    assert.equal(brief.length, 5);
    assert.equal(brief[4].id, "num_brief_destiny");
    assert.equal(brief[4].key, `num_brief_destiny_${named.destiny}`);
    assert.ok(named.destinyBreakdown!.letters.length > 0);
    assert.equal(named.destinyBreakdown!.value, named.destiny);
  });

  it("каждое число попадает в свой вопрос, а не в соседний", () => {
    // Числа добавлялись по одному, и подстановка значения по цепочке
    // условий однажды уже отдала числу судьбы значение личного года.
    // Проверяем все пять сразу: у справки и у полного разбора одного
    // числа значение в ключе совпадает со значением в расчёте.
    const named = buildNumerology("1990-07-26", 2026, "Пётр Иванович Петров")!;
    const expected: Record<string, number> = {
      path: named.path,
      birthday: named.birthday,
      attitude: named.attitude,
      year: named.personalYear,
      destiny: named.destiny!,
    };
    assert.equal(new Set(Object.values(expected)).size >= 3, true, "числа не совпадают все разом");

    for (const [id, value] of Object.entries(expected)) {
      assert.equal(numberValue(named, id as never), value, id);

      // И в ключе, и в промпте — одно и то же число. Раньше здесь
      // расходилось: ключ говорил num_brief_destiny_8, а промпт писал
      // текст про личный год.
      for (const slot of [
        briefSlots(named).find((s) => s.id === `num_brief_${id}`)!,
        numerologySections(named)[0].slots.find((s) => s.id === `num_${id}`)!,
      ]) {
        const ctx = numContextFor(slot, named)!;
        assert.ok(ctx, id);
        assert.equal(slot.key, `${slot.id === `num_${id}` ? "num" : "num_brief"}_${id}_${value}`);
        assert.equal(ctx.key, slot.key);
        assert.equal("value" in ctx ? ctx.value : null, value, `${slot.id}: промпт про другое число`);
        assert.ok(buildNumRequest(ctx).user.includes(`Число: ${value}`), slot.id);
      }
    }
  });

  it("число судьбы можно задать числом, без имени: так считает сервер", () => {
    const server = buildNumerologyWithDestiny("1990-07-26", 2026, 8)!;
    assert.equal(server.destiny, 8);
    assert.equal(server.name, null, "имя на сервер не уходит");
    assert.equal(server.destinyBreakdown, null, "и разложения по буквам он не знает");
    assert.equal(briefSlots(server).length, 5);
    assert.equal(briefSlots(server)[4].key, "num_brief_destiny_8");

    // То же число из имени даёт тот же ключ — сервер и браузер сойдутся.
    const named = buildNumerology("1990-07-26", 2026, "Пётр Иванович Петров")!;
    const same = buildNumerologyWithDestiny("1990-07-26", 2026, named.destiny)!;
    assert.deepEqual(briefSlots(same).map((x) => x.key), briefSlots(named).map((x) => x.key));
  });

  it("негодное число судьбы отбрасывается, а не подставляется", () => {
    for (const bad of [0, 10, 33, -1, 4.5, NaN]) {
      assert.equal(buildNumerologyWithDestiny("1990-07-26", 2026, bad)!.destiny, null, `${bad}`);
    }
    assert.equal(buildNumerologyWithDestiny("1990-07-26", 2026, null)!.destiny, null);
  });

  it("мусор вместо имени не создаёт числа судьбы", () => {
    for (const junk of ["", "  ", "1", "42", "-"]) {
      const c = buildNumerology("1990-07-26", 2026, junk)!;
      assert.equal(c.destiny, null, `«${junk}»`);
      assert.equal(c.name, null);
    }
  });

  it("личный год зависит от календарного года, остальное — нет", () => {
    const next = buildNumerology("1990-07-26", 2027)!;
    assert.equal(next.path, chart.path);
    assert.equal(next.birthday, chart.birthday);
    assert.notEqual(next.personalYear, chart.personalYear);
    assert.equal(next.personalYear, 8, "следующий год цикла");
  });
});

describe("промпты", () => {
  it("короткий текст пишется другим промптом, чем платный", () => {
    const brief = buildNumRequest({ kind: "num_brief", slotLabel: "", number: "path", value: 7 });
    const full = buildNumRequest({ kind: "num_number", slotLabel: "Число пути", number: "path", value: 7 });
    assert.notEqual(brief.system, full.system);
    assert.ok(brief.maxTokens < full.maxTokens);
    for (const r of [brief, full]) {
      assert.ok(r.system.includes("Не предсказывай события"));
      assert.ok(r.system.includes("Пустая ячейка — не недостаток"));
      assert.ok(!r.user.includes("undefined"));
    }
  });

  it("мастер-число объясняется в промпте, обычное — нет", () => {
    assert.ok(buildNumRequest({ kind: "num_number", slotLabel: "x", number: "path", value: 11 }).user.includes("мастер-число"));
    assert.ok(!buildNumRequest({ kind: "num_number", slotLabel: "x", number: "path", value: 2 }).user.includes("мастер-число"));
  });

  it("пустая ячейка и заполненная — разные промпты", () => {
    const empty = buildNumRequest({ kind: "num_cell", slotLabel: "x", digit: 5, count: 0 });
    const full = buildNumRequest({ kind: "num_cell", slotLabel: "x", digit: 5, count: 3 });
    assert.ok(empty.user.includes("не встречается ни разу"));
    assert.ok(full.user.includes("повторов 3"));
    assert.notEqual(empty.user, full.user);
  });
});
