/**
 * ТАБЛИЦА БУКВ И ЧИСЛО СУДЬБЫ
 *
 * Латиница сверена с теми же двумя открытыми калькуляторами, что и числа
 * по датам: их таблицы совпали побуквенно, все двадцать шесть значений.
 * Кириллическая таблица — то же правило (позиция в алфавите, свёрнутая до
 * 1–9) по русскому алфавиту; открытого калькулятора для неё не нашлось,
 * поэтому вся таблица записана здесь числами и заперта тестом: молча
 * съехать она не сможет.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NAME_REFERENCE } from "./fixtures/names";
import {
  CYRILLIC_LETTERS,
  LATIN_LETTERS,
  addressName,
  afterGreeting,
  destinyNumber,
  greeting,
  isCountableName,
  letterValue,
  nameLetters,
  reduceNumber,
} from "./index";

/** Классическая пифагорейская таблица латиницы — как её печатают в книгах. */
const LATIN_PRINTED: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

/** Русская таблица по алфавиту из 33 букв. */
const CYRILLIC_PRINTED: Record<string, number> = {
  а: 1, б: 2, в: 3, г: 4, д: 5, е: 6, ё: 7, ж: 8, з: 9,
  и: 1, й: 2, к: 3, л: 4, м: 5, н: 6, о: 7, п: 8, р: 9,
  с: 1, т: 2, у: 3, ф: 4, х: 5, ц: 6, ч: 7, ш: 8, щ: 9,
  ъ: 1, ы: 2, ь: 3, э: 4, ю: 5, я: 6,
};

describe("таблица букв", () => {
  it("латиница совпадает с печатной до последней буквы", () => {
    assert.deepEqual(LATIN_LETTERS, LATIN_PRINTED);
  });

  it("кириллица совпадает с печатной до последней буквы", () => {
    assert.deepEqual(CYRILLIC_LETTERS, CYRILLIC_PRINTED);
    assert.equal(Object.keys(CYRILLIC_LETTERS).length, 33, "алфавит из 33 букв");
  });

  it("значение буквы не зависит от регистра и алфавита", () => {
    assert.equal(letterValue("А"), 1);
    assert.equal(letterValue("а"), 1);
    assert.equal(letterValue("Z"), 8);
    assert.equal(letterValue("-"), null);
    assert.equal(letterValue("7"), null);
    assert.equal(letterValue(" "), null);
  });

  it("Ё приводится к Е: «Фёдор» и «Федор» — одно имя", () => {
    assert.deepEqual(nameLetters("Фёдор"), nameLetters("Федор"));
    assert.deepEqual(destinyNumber("Фёдор Иванов"), destinyNumber("Федор Иванов"));
    // В печатной таблице у Ё своё значение, и оно тут есть — просто до
    // подсчёта буква до неё не доходит.
    assert.equal(CYRILLIC_LETTERS["ё"], 7);
  });

  it("пробелы, дефисы и точки в счёт не идут", () => {
    assert.equal(destinyNumber("Анна-Мария Петрова")!.value, destinyNumber("АннаМарияПетрова")!.value);
    assert.equal(destinyNumber("И. И. Иванов")!.value, destinyNumber("ИИИванов")!.value);
  });
});

describe("число судьбы", () => {
  it("совпадает с обоими эталонами, кроме известных расхождений", () => {
    let diffs = 0;
    for (const r of NAME_REFERENCE) {
      const ours = destinyNumber(r.name)!.value;
      // Цифровой корень не зависит от методики — он обязан сойтись всегда.
      assert.equal(
        reduceNumber(ours, { masters: false }),
        reduceNumber(r.ref1, { masters: false }),
        `${r.name}: против эталона 1`,
      );
      assert.equal(
        reduceNumber(ours, { masters: false }),
        reduceNumber(r.ref2, { masters: false }),
        `${r.name}: против эталона 2`,
      );
      if (ours !== r.ref1 || ours !== r.ref2) {
        diffs += 1;
        const theirs = [r.ref1, r.ref2];
        const known = theirs.some((t) => [11, 22, 33].includes(t) || (t > 9 && ![11, 22, 33].includes(t)));
        assert.ok(known || [11, 22].includes(ours), `${r.name}: необъяснённое расхождение`);
      }
    }
    assert.ok(diffs < NAME_REFERENCE.length / 2);
  });

  it("складываем всё имя разом и сворачиваем один раз", () => {
    const d = destinyNumber("Ivan Ivanov")!;
    assert.equal(d.letters.length, 10, "десять букв без пробела");
    assert.equal(d.sum, 48);
    assert.equal(d.value, 3, "4+8 = 12 → 3");
  });

  it("мастер-числа сохраняются, как и в числах по дате", () => {
    const d = destinyNumber("Alexander Pushkin")!;
    assert.equal(d.value, 11);
  });

  it("считать нечего — честный null", () => {
    assert.equal(destinyNumber(""), null);
    assert.equal(destinyNumber("   "), null);
    assert.equal(destinyNumber("А"), null, "одной буквы мало");
    assert.equal(destinyNumber("1990"), null);
    assert.equal(isCountableName("Пётр"), true);
    assert.equal(isCountableName("П"), false);
  });

  it("русское имя считается тем же правилом", () => {
    // П=8 Ё→Е=6 Т=2 Р=9 = 25 → 7
    const d = destinyNumber("Пётр")!;
    assert.equal(d.sum, 25);
    assert.equal(d.value, 7);
  });
});

describe("обращение по имени", () => {
  it("берётся первое слово с заглавной буквы", () => {
    assert.equal(addressName("пётр иванович петров"), "Пётр");
    assert.equal(addressName("МАРИЯ"), "Мария");
    assert.equal(addressName("Анна-Мария Иванова"), "Анна");
    assert.equal(addressName("John Smith"), "John");
  });

  it("без имени обращения нет и дырки в тексте нет", () => {
    assert.equal(addressName(null), "");
    assert.equal(addressName(""), "");
    assert.equal(addressName("  "), "");
    assert.equal(greeting(null), "");
    assert.equal(afterGreeting(null, "Ваше число судьбы — 7"), "Ваше число судьбы — 7");
  });

  it("с именем фраза продолжается со строчной", () => {
    assert.equal(greeting("Пётр Петров"), "Пётр, ");
    assert.equal(afterGreeting("Пётр", "Ваше число судьбы — 7"), "Пётр, ваше число судьбы — 7");
  });
});
