/**
 * Карточка образа: темы, перенос текста и разметка.
 *
 * Смысл проверок. Карточку человек выкладывает в сторис — исправить её
 * потом нельзя. Ломается она тише всего на длинном имени и длинном
 * названии аркана: текст либо наезжает на иллюстрацию, либо обрезается
 * на середине слова. Глазами это ловится по одной карточке за раз, а
 * здесь — по сотне за секунду.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arcana } from "../arcana";
import { arcanaName, calculateMatrix } from "../matrix";
import { dayCardArcanum, moscowDay } from "../tarot";
import { buildAllImageData, buildImageData, findImageTheme, IMAGE_THEMES } from "./themes";
import { CARD_HEIGHT, CARD_WIDTH, PAD, contentBottom, fit, layout, wrap } from "./layout";

const NOW = new Date("2026-09-05T10:00:00Z");
const BIRTH = "1998-07-13";

/** Грубая мера ширины: моноширинный шрифт, полкегля на букву. */
const measure = (text: string, size: number) => text.length * size * 0.5;

describe("семь тем", () => {
  it("их ровно семь, и все считаются", () => {
    assert.equal(IMAGE_THEMES.length, 7);
    const all = buildAllImageData(BIRTH, NOW);
    assert.equal(all.length, 7);
    for (const d of all) {
      assert.ok(d.arcanum >= 1 && d.arcanum <= 22, `${d.theme}: ${d.arcanum}`);
      assert.ok(d.title.length > 0, d.theme);
      assert.ok(d.line.length > 0, d.theme);
      assert.equal(d.title, arcanaName(d.arcanum));
    }
  });

  it("темы не сговорились: числа у них разные", () => {
    const values = new Set(buildAllImageData(BIRTH, NOW).map((d) => d.arcanum));
    assert.ok(values.size >= 4, `на одну дату получилось всего ${values.size} разных чисел`);
  });

  it("числа взяты из готового расчёта, а не посчитаны заново", () => {
    const m = calculateMatrix(BIRTH, NOW);
    const by = (id: string) => buildImageData(id as never, BIRTH, NOW)!.arcanum;
    assert.equal(by("core"), m.core.C);
    assert.equal(by("money"), m.core.SE);
    assert.equal(by("love"), m.core.SW);
    assert.equal(by("year"), m.today.yearArcana);
    assert.equal(by("purpose"), m.purpose.planetary.result);
    assert.equal(by("resource"), m.chakras.rows[3].physics);
    // Карта дня — та же, что на /taro/<дата>.
    assert.equal(by("day"), dayCardArcanum(BIRTH, moscowDay(NOW)));
  });

  it("тяжёлые арканы названы по-нашему и на карточке", () => {
    for (const [n, name] of [[13, "Перерождение"], [15, "Искушение"], [16, "Обновление"]] as const) {
      assert.equal(arcana.find((a) => a.n === n)!.name, name);
    }
    // На какой-то из дат тяжёлый аркан обязательно выпадет — проверяем,
    // что название на карточку попадает из общего справочника.
    const d = buildImageData("core", "1996-01-01", NOW)!;
    assert.equal(d.title, arcanaName(d.arcanum));
  });

  it("негодная дата не даёт карточки", () => {
    for (const bad of ["", "13-07-1998", "1998-13-01", "не дата"]) {
      assert.equal(buildImageData("core", bad, NOW), null, bad);
    }
    assert.equal(buildImageData("нет такой темы" as never, BIRTH, NOW), null);
  });

  it("у каждой темы своя подпись", () => {
    const labels = IMAGE_THEMES.map((t) => t.label);
    assert.equal(new Set(labels).size, labels.length);
    for (const t of IMAGE_THEMES) assert.equal(findImageTheme(t.id)!.label, t.label);
  });
});

describe("перенос текста", () => {
  it("режет по словам", () => {
    // «один два» — 40 точек, «один два три» — 60: в 50 влезает только первое.
    assert.deepEqual(wrap("один два три", 10, 50, measure), ["один два", "три"]);
    assert.deepEqual(wrap("один два три", 10, 60, measure), ["один два три"], "ровно по ширине — не переносим");
  });

  it("слово длиннее строки рвётся по буквам, а не вылезает", () => {
    const lines = wrap("Ааааааааааааааааааааааа", 10, 50, measure);
    assert.ok(lines.length > 1);
    for (const l of lines) assert.ok(measure(l, 10) <= 50, l);
  });

  it("ни одна строка не шире отведённого — на любом тексте", () => {
    const words = ["Александра", "Константиновна", "Пётр", "Колесо", "Фортуны", "Перерождение", "Иванов-Петровский"];
    for (let i = 0; i < 200; i++) {
      const n = (i % 6) + 1;
      const text = Array.from({ length: n }, (_, k) => words[(i + k) % words.length]).join(" ");
      for (const w of [200, 320, 480, 900]) {
        for (const l of wrap(text, 40, w, measure)) {
          assert.ok(measure(l, 40) <= w, `«${l}» шире ${w}`);
        }
      }
    }
  });
});

describe("подбор кегля", () => {
  const opts = { maxWidth: 400, maxLines: 2, size: 64, minSize: 30 };

  it("короткое имя берётся крупным", () => {
    const r = fit("Пётр", opts, measure);
    assert.equal(r.size, 64);
    assert.equal(r.lines.length, 1);
    assert.equal(r.clipped, false);
  });

  it("длинное имя мельчает, но не обрезается", () => {
    const r = fit("Александра Константиновна Преображенская", opts, measure);
    assert.ok(r.size < 64, `кегль остался ${r.size}`);
    assert.ok(r.lines.length <= 2);
    assert.equal(r.clipped, false, "имя не должно обрезаться, пока помогает кегль");
    assert.equal(r.lines.join(" "), "Александра Константиновна Преображенская");
  });

  it("совсем немыслимое обрезается многоточием, а не вылезает", () => {
    const r = fit("Ы".repeat(400), opts, measure);
    assert.equal(r.clipped, true);
    assert.equal(r.lines.length, 2);
    assert.ok(r.lines[1].endsWith("…"));
    for (const l of r.lines) assert.ok(measure(l, r.size) <= opts.maxWidth, l);
  });

  it("пустая строка не даёт строк", () => {
    assert.deepEqual(fit("   ", opts, measure).lines, []);
  });
});

describe("разметка карточки", () => {
  const sizes = { name: 64, nameCount: 1, title: 88, line: 40, lineCount: 2 };
  const full = { label: "Мой аркан", name: "Пётр", title: "13 · Перерождение", line: "Умение отпускать", date: "13 июля 1998" };

  it("всё помещается и ничего не наезжает на подпись", () => {
    const l = layout(full, sizes);
    assert.ok(contentBottom(l) <= l.footer.y, `текст доходит до ${contentBottom(l)}, подпись на ${l.footer.y}`);
    assert.ok(l.picture.y > l.theme.y);
    assert.ok(l.footer.y + l.footer.height <= CARD_HEIGHT - PAD + 1);
  });

  it("блоки идут сверху вниз и не накладываются", () => {
    const l = layout(full, sizes);
    const blocks = [l.theme, l.name!, l.picture, l.title!, l.line!, l.date!, l.footer];
    for (let i = 1; i < blocks.length; i++) {
      assert.ok(blocks[i].y >= blocks[i - 1].y + blocks[i - 1].height, `блок ${i} наехал на предыдущий`);
    }
  });

  it("иллюстрация не выходит за поля", () => {
    const l = layout(full, sizes);
    assert.ok(l.picture.x >= PAD - 1, `картинка начинается на ${l.picture.x}`);
    assert.ok(l.picture.x + l.picture.width <= CARD_WIDTH - PAD + 1);
  });

  it("снятые галочки не оставляют пустых мест", () => {
    const bare = { label: "Мой аркан", name: null, title: null, line: null, date: null };
    const l = layout(bare, { name: 0, nameCount: 0, title: 0, line: 0, lineCount: 0 });
    assert.equal(l.name, null);
    assert.equal(l.title, null);
    assert.equal(l.line, null);
    assert.equal(l.date, null);
    assert.ok(contentBottom(l) <= l.footer.y);
    // Освободившееся место достаётся иллюстрации, а не дырке.
    assert.ok(l.picture.height > layout(full, sizes).picture.height);
  });

  it("самый тяжёлый случай: длинное имя, длинное название, три строки смысла", () => {
    const heavy = {
      label: "Предназначение",
      name: "Александра Константиновна",
      title: "10 · Колесо Фортуны",
      line: "Умение видеть циклы и попадать в момент, даже когда всё вокруг меняется",
      date: "13 июля 1998",
    };
    const l = layout(heavy, { name: 48, nameCount: 2, title: 64, line: 34, lineCount: 3 });
    assert.ok(contentBottom(l) <= l.footer.y, `перебор на ${contentBottom(l) - l.footer.y} точек`);
    assert.ok(l.picture.height >= 560, "иллюстрация ужалась до неразличимой");
  });

  it("любое сочетание галочек помещается на карточку", () => {
    for (let mask = 0; mask < 16; mask++) {
      for (const nameCount of [1, 2]) {
        for (const lineCount of [1, 2, 3]) {
          const f = {
            label: "Предназначение",
            name: mask & 1 ? "Александра Константиновна" : null,
            title: mask & 2 ? "10 · Колесо Фортуны" : null,
            line: mask & 4 ? "Умение видеть циклы и попадать в момент" : null,
            date: mask & 8 ? "13 июля 1998" : null,
          };
          const l = layout(f, { name: 64, nameCount, title: 88, line: 40, lineCount });
          assert.ok(
            contentBottom(l) <= l.footer.y,
            `галочки ${mask}, имя в ${nameCount} стр., смысл в ${lineCount} стр.: перебор ${contentBottom(l) - l.footer.y}`,
          );
        }
      }
    }
  });
});
