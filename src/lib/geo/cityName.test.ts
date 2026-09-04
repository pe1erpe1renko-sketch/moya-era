/**
 * Родительный падеж названия города.
 *
 * Смысл проверок двойной: правило должно давать верную форму там, где оно
 * срабатывает, и молчать там, где форма не выводится. Второе важнее:
 * подпись «(по времени города Ростов-на-Дону)» звучит казённо, а «(по
 * времени Ростов-на-Дону)» — безграмотно.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cityGenitive } from "./cityName";

describe("склоняем то, в чём уверены", () => {
  it("названия на согласную", () => {
    const pairs: Array<[string, string]> = [
      ["Новосибирск", "Новосибирска"],
      ["Екатеринбург", "Екатеринбурга"],
      ["Мурманск", "Мурманска"],
      ["Норильск", "Норильска"],
      ["Красноярск", "Красноярска"],
      ["Воронеж", "Воронежа"],
      ["Волгоград", "Волгограда"],
      ["Киев", "Киева"],
      ["Минск", "Минска"],
      ["Ташкент", "Ташкента"],
      ["Париж", "Парижа"],
    ];
    for (const [name, expected] of pairs) assert.equal(cityGenitive(name), expected, name);
  });

  it("названия на «а» и «я»", () => {
    assert.equal(cityGenitive("Москва"), "Москвы");
    assert.equal(cityGenitive("Уфа"), "Уфы");
    assert.equal(cityGenitive("Самара"), "Самары");
    assert.equal(cityGenitive("Астана"), "Астаны");
    // После г, к, х, ж, ч, ш, щ пишется «и», а не «ы».
    assert.equal(cityGenitive("Калуга"), "Калуги");
    assert.equal(cityGenitive("Луга"), "Луги");
    assert.equal(cityGenitive("Рига"), "Риги");
    assert.equal(cityGenitive("Гагра"), "Гагры");
  });

  it("названия на мягкий знак: «-ль» мужского рода, остальные женского", () => {
    assert.equal(cityGenitive("Ставрополь"), "Ставрополя");
    assert.equal(cityGenitive("Ярославль"), "Ярославля");
    assert.equal(cityGenitive("Севастополь"), "Севастополя");
    assert.equal(cityGenitive("Пермь"), "Перми");
    assert.equal(cityGenitive("Казань"), "Казани");
    assert.equal(cityGenitive("Астрахань"), "Астрахани");
    assert.equal(cityGenitive("Керчь"), "Керчи");
  });

  it("через дефис склоняется последнее слово", () => {
    assert.equal(cityGenitive("Санкт-Петербург"), "Санкт-Петербурга");
    assert.equal(cityGenitive("Ханты-Мансийск"), "Ханты-Мансийска");
    assert.equal(cityGenitive("Йошкар-Ола"), "Йошкар-Олы");
    assert.equal(cityGenitive("Алма-Ата"), "Алма-Аты");
    assert.equal(cityGenitive("Нью-Йорк"), "Нью-Йорка");
  });
});

describe("молчим там, где форма не выводится", () => {
  it("составные названия требуют согласования", () => {
    assert.equal(cityGenitive("Нижний Новгород"), null);
    assert.equal(cityGenitive("Набережные Челны"), null);
    assert.equal(cityGenitive("Старый Оскол"), null);
  });

  it("предлог внутри названия: склоняется первое слово, а не последнее", () => {
    assert.equal(cityGenitive("Ростов-на-Дону"), null);
    assert.equal(cityGenitive("Комсомольск-на-Амуре"), null);
  });

  it("беглая гласная", () => {
    // Череповца, Ельца, Торжка, Орла — правилом это не берётся.
    assert.equal(cityGenitive("Череповец"), null);
    assert.equal(cityGenitive("Елец"), null);
    assert.equal(cityGenitive("Торжок"), null);
    assert.equal(cityGenitive("Орёл"), null);
  });

  it("род не выводится из окончания", () => {
    // Тверь женского рода, Анадырь мужского, а окончание одно.
    assert.equal(cityGenitive("Тверь"), null);
    assert.equal(cityGenitive("Анадырь"), null);
  });

  it("несклоняемые названия", () => {
    for (const name of ["Сочи", "Тбилиси", "Баку", "Улан-Удэ", "Душанбе", "Иваново", "Кемерово", "Грозный", "Волжский"]) {
      assert.equal(cityGenitive(name), null, name);
    }
  });

  it("не кириллица и мусор", () => {
    assert.equal(cityGenitive("Berlin"), null);
    assert.equal(cityGenitive(""), null);
    assert.equal(cityGenitive("  "), null);
    assert.equal(cityGenitive("Уй"), null);
  });
});
