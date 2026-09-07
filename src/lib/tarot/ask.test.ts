/**
 * ВОПРОС КАРТАМ В АДРЕСЕ.
 *
 * Проверяется то, от чего зависит, потеряет ли человек вопрос по дороге
 * через вход: адрес собирается и разбирается одинаково, чужой вид
 * расклада не проходит, обещание про приветственные кредиты совпадает с
 * тем, что начисляет база.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ASK_MAX, ASK_TTL_MS, WELCOME_CREDITS, askPath, askReturnPath, bridgeText, cleanQuestion, parseAsk, rememberAsk, takeAsk } from "./ask";
import { SPREADS } from "./spreads";

describe("вопрос картам в адресе", () => {
  it("адрес собирается и разбирается одинаково", () => {
    const path = askPath({ vid: "love", q: "  Почему мы   ходим по кругу? " });
    assert.equal(path, "/taro?vid=love&q=%D0%9F%D0%BE%D1%87%D0%B5%D0%BC%D1%83+%D0%BC%D1%8B+%D1%85%D0%BE%D0%B4%D0%B8%D0%BC+%D0%BF%D0%BE+%D0%BA%D1%80%D1%83%D0%B3%D1%83%3F");
    const back = parseAsk(path.slice("/taro".length));
    assert.deepEqual(back, { vid: "love", q: "Почему мы ходим по кругу?" });
  });

  it("пустой вопрос и неизвестный вид не попадают в адрес", () => {
    assert.equal(askPath({}), "/taro");
    assert.equal(askPath({ q: "   " }), "/taro");
    assert.equal(askPath({ vid: "tower" as never, q: "" }), "/taro");
    assert.deepEqual(parseAsk("?vid=tower&q=x"), { vid: null, q: "x" });
    assert.deepEqual(parseAsk(""), { vid: null, q: "" });
  });

  it("вопрос обрезается до длины, которую примет сервер", () => {
    const long = "а".repeat(ASK_MAX + 100);
    assert.equal(cleanQuestion(long).length, ASK_MAX);
    assert.equal(parseAsk(`?q=${long}`).q.length, ASK_MAX);
  });

  it("после входа человек возвращается на тот же экран с тем же видом; вопрос через адрес входа не ходит", () => {
    const back = askReturnPath("three", "login");
    assert.equal(back, "/login?next=%2Ftaro%3Fvid%3Dthree");
    const next = new URLSearchParams(back.slice("/login".length)).get("next") ?? "";
    assert.ok(next.startsWith("/") && !next.startsWith("//"), "только относительный адрес");
    assert.deepEqual(parseAsk(next.slice("/taro".length)), { vid: "three", q: "" });
    assert.equal(askReturnPath("tower", "register"), "/register?next=%2Ftaro");
  });

  it("приветственных кредитов хватает на любой расклад, кроме большого, — и текст это знает", () => {
    const sql = readFileSync("supabase/migrations/20260904000000_core_people_plans_credits_texts.sql", "utf8");
    assert.ok(sql.includes(`VALUES (NEW.id, ${WELCOME_CREDITS}, 'welcome'`), "число в тексте должно совпадать с миграцией");
    for (const s of SPREADS) {
      const text = bridgeText(s.credits);
      assert.ok(text.includes("пять кредитов"));
      if (s.credits <= WELCOME_CREDITS) assert.ok(text.includes("хватит"), s.id);
      else assert.ok(text.includes(String(s.credits)), s.id);
    }
  });

  it("черновик переживает вход и читается один раз", () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
    rememberAsk({ vid: "love", q: "  Почему мы   ходим по кругу? ", returning: true }, store, 1000);
    assert.deepEqual(takeAsk(store, 5000), { vid: "love", q: "Почему мы ходим по кругу?", returning: true });
    assert.equal(takeAsk(store, 5000), null, "второй раз пусто");
    rememberAsk({ vid: "three", q: "Вопрос" }, store, 1000);
    assert.equal(takeAsk(store, 1000 + ASK_TTL_MS + 1), null, "старше суток — не восстанавливаем");
    rememberAsk({ vid: "tower", q: "   " }, store, 1000);
    assert.equal(data.size, 0, "пустой черновик снимает запись");
  });
});
