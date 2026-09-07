/**
 * Вступление об аркане на главной: две целые фразы из готового текста,
 * без оборванного хвоста «…и», которым дразнит полный разбор.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arcanaIntro, matrixCounts } from "@/lib/matrix";

describe("вступление об аркане", () => {
  it("у всех двадцати двух арканов — две целые фразы", () => {
    for (let n = 1; n <= 22; n++) {
      const intro = arcanaIntro(n);
      assert.ok(intro.length > 40, `аркан ${n}: слишком коротко`);
      assert.match(intro, /[.!?]$/, `аркан ${n}: фраза оборвана`);
      assert.ok(!/\sи$/.test(intro), `аркан ${n}: хвост «и»`);
      assert.equal(intro.split(/(?<=[.!?])\s+/).length, 2, `аркан ${n}: не две фразы`);
    }
  });

  it("строка под кнопкой считает сферы и вопросы по карте позиций", () => {
    const { spheres, questions } = matrixCounts();
    assert.equal(spheres, 12);
    assert.ok(questions >= 90 && questions <= 100, `вопросов: ${questions}`);
  });
});
