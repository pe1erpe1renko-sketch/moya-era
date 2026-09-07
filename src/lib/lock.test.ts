/**
 * ЗАМОК — ОДИН НА ВЕСЬ САЙТ.
 *
 * Проверяется то, ради чего замок переписан: первая строка — про то
 * место, где человек сейчас; остальные — про всё остальное, без
 * повторов; цена и объёмы берутся из тарифов, а не из текста; в
 * строках нет фальшивого дефицита; запасные тарифы совпадают с тем,
 * что заливает миграция.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLAN_COMMON, SYSTEMS, biggerPlansLine, creditsSpan, fromPrice, fromPriceLine, hereLine, lockItems, peopleSpan, planRows, type LockSystem } from "./lock";
import { DEFAULT_PLANS } from "./plansDefault";
import { BOT_LIMITS } from "./bot/limits";

const FORBIDDEN = [/осталось/i, /скидк/i, /только сегодня/i, /успей/i, /последн/i, /\bмест[ао]?\b/i, /таймер/i];

function everyLine(): string[] {
  const systems: LockSystem[] = ["matrix", "natal", "hd", "numerology", "daycard", "pair", "image", "bot", "people", "cabinet"];
  const lines = systems.flatMap((s) => lockItems(s, DEFAULT_PLANS, { spheres: 12, questions: 92 }).map((i) => i.text));
  lines.push(...PLAN_COMMON, fromPriceLine(DEFAULT_PLANS), biggerPlansLine(DEFAULT_PLANS, "basic"));
  for (const p of DEFAULT_PLANS) lines.push(...planRows(p).map((r) => `${r.label}: ${r.value}`));
  return lines;
}

describe("замок: подписка открывает всё", () => {
  it("первая строка — где человек сейчас, с числами разбора", () => {
    const items = lockItems("matrix", DEFAULT_PLANS, { spheres: 12, questions: 92 });
    assert.equal(items[0].here, true);
    assert.equal(items[0].text, "Весь этот разбор: 12 сфер, 92 вопроса");
    assert.equal(hereLine("natal"), "Вся эта карта: все планеты, дома и аспекты");
    assert.ok(hereLine("pair")?.includes("три взгляда"));
    assert.ok(hereLine("hd")?.includes("каналы и ворота"));
    assert.equal(hereLine("cabinet"), null, "в кабинете нет «здесь» — список общий");
  });

  it("остальные пять систем — без той, где стоит замок", () => {
    const matrix = lockItems("matrix", DEFAULT_PLANS).find((i) => i.id === "systems")!;
    assert.ok(matrix.text.startsWith("Ещё пять систем"));
    assert.ok(!matrix.text.includes("матрица"));
    assert.ok(matrix.text.includes("натальная карта") && matrix.text.includes("совместимость"));
    const day = lockItems("daycard", DEFAULT_PLANS).find((i) => i.id === "systems")!;
    assert.ok(!day.text.includes("таро"), "карта дня — это таро, его в «остальных» нет");
    const cabinet = lockItems("cabinet", DEFAULT_PLANS).find((i) => i.id === "systems")!;
    assert.ok(cabinet.text.startsWith("Все шесть систем"));
    assert.equal(SYSTEMS.length, 6);
  });

  it("строка про то место, где человек, второй раз не повторяется", () => {
    for (const system of ["daycard", "bot", "people"] as const) {
      const ids = lockItems(system, DEFAULT_PLANS).map((i) => i.id);
      assert.equal(new Set(ids).size, ids.length, system);
      assert.ok(ids.length >= 5 && ids.length <= 6, system);
    }
    const people = lockItems("people", DEFAULT_PLANS);
    assert.equal(people[0].id, "people");
    assert.equal(people[0].here, true);
  });

  it("цена и объёмы — из тарифов", () => {
    assert.equal(fromPrice(DEFAULT_PLANS), 590);
    assert.equal(fromPrice([]), null);
    assert.equal(fromPriceLine(DEFAULT_PLANS), "от 590 ₽ в месяц");
    assert.equal(fromPriceLine([]), "");
    assert.equal(peopleSpan(DEFAULT_PLANS), "1, 5 или без ограничений");
    assert.equal(peopleSpan([]), "сколько — по тарифу");
    assert.equal(creditsSpan(DEFAULT_PLANS), "30, 100 или 300");
    const cheaper = DEFAULT_PLANS.map((p) => ({ ...p, price_month: p.price_month - 100 }));
    assert.equal(fromPriceLine(cheaper), "от 490 ₽ в месяц", "поменяли таблицу — поменялась строка");
    const mentor = lockItems("matrix", DEFAULT_PLANS).find((i) => i.id === "mentor")!;
    assert.ok(mentor.text.includes("30, 100 или 300"));
    const people = lockItems("matrix", DEFAULT_PLANS).find((i) => i.id === "people")!;
    assert.ok(people.text.includes("1, 5 или без ограничений"));
  });

  it("строки тарифа: люди на сайте, люди в боте, кредиты", () => {
    const [basic, family, pro] = DEFAULT_PLANS;
    assert.deepEqual(
      planRows(basic).map((r) => r.value),
      ["1 — вы", String(BOT_LIMITS.basic), "30"],
    );
    assert.equal(planRows(family)[0].value, "5 — вы и близкие");
    assert.equal(planRows(family)[1].value, String(BOT_LIMITS.family));
    assert.equal(planRows(pro)[0].value, "без ограничений");
    assert.equal(planRows(pro)[1].value, String(BOT_LIMITS.pro));
    const unknown = planRows({ ...basic, id: "custom" });
    assert.deepEqual(unknown.map((r) => r.id), ["people", "credits"], "у тарифа без лимита бота строки про бот нет");
  });

  it("куда расти по людям", () => {
    assert.equal(biggerPlansLine(DEFAULT_PLANS, "basic"), "«Семейный» — до 5 человек; «Практик» — без ограничений");
    assert.equal(biggerPlansLine(DEFAULT_PLANS, "family"), "«Практик» — без ограничений");
    assert.equal(biggerPlansLine(DEFAULT_PLANS, "pro"), "");
    assert.ok(biggerPlansLine(DEFAULT_PLANS, null).startsWith("«Базовый»"));
  });

  it("ни в одной строке нет фальшивого дефицита", () => {
    for (const line of everyLine()) {
      for (const re of FORBIDDEN) assert.ok(!re.test(line), `${line} ← ${re}`);
    }
  });

  it("запасные тарифы совпадают с миграцией", () => {
    const sql = readFileSync("supabase/migrations/20260904000000_core_people_plans_credits_texts.sql", "utf8");
    for (const p of DEFAULT_PLANS) {
      const re = new RegExp(`\\('${p.id}',[^\\n]*?\\b${p.max_people === null ? "NULL" : p.max_people},\\s+${p.monthly_credits},\\s+${p.price_month},\\s+${p.price_year},`);
      assert.ok(re.test(sql), `${p.id}: люди, кредиты и цены должны совпадать с миграцией`);
    }
  });
});
