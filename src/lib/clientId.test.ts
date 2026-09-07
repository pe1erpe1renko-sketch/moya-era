/**
 * ID клиента: алфавит без похожих знаков, формат, совпадение с базой.
 *
 * Смысл проверки. Код диктуют по телефону и переписывают с экрана: одна
 * похожая пара знаков — и поддержка ищет не того человека. А генерирует
 * код база, своей функцией: разойдётся её алфавит с этим — и ID из базы
 * не пройдёт проверку формата на сайте.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CLIENT_ID_ALPHABET, CLIENT_ID_LENGTH, formatClientId, isClientId, newClientId } from "./clientId";

describe("ID клиента", () => {
  it("в алфавите нет похожих знаков", () => {
    for (const ch of ["0", "O", "1", "I", "l", "L"]) {
      assert.ok(!CLIENT_ID_ALPHABET.includes(ch), `в алфавите есть «${ch}»`);
    }
    assert.equal(new Set(CLIENT_ID_ALPHABET).size, CLIENT_ID_ALPHABET.length, "повторы в алфавите");
    assert.equal(CLIENT_ID_ALPHABET, CLIENT_ID_ALPHABET.toUpperCase(), "только заглавные");
  });

  it("вид МЭ-XXXX-XXXX, восемь знаков", () => {
    const id = newClientId();
    assert.match(id, /^МЭ-[^-]{4}-[^-]{4}$/);
    assert.ok(isClientId(id), id);
    assert.equal(CLIENT_ID_LENGTH, 8);
    assert.equal(formatClientId("7K3F92QD"), "МЭ-7K3F-92QD");
  });

  it("случайность берётся только у переданного источника", () => {
    const seq = (values: number[]) => {
      let i = 0;
      return () => values[i++ % values.length];
    };
    assert.equal(newClientId(seq([0])), "МЭ-2222-2222");
    assert.equal(newClientId(seq([0.999])), "МЭ-ZZZZ-ZZZZ");
    assert.equal(newClientId(seq([0.5])), newClientId(seq([0.5])));
  });

  it("проверка формата отбрасывает чужое", () => {
    for (const bad of ["МЭ-7K3F-92Q0", "МЭ-7K3F-92QO", "ME-7K3F-92QD", "МЭ-7k3f-92qd", "МЭ-7K3F92QD", "", "МЭ-7K3F-92QD-1"]) {
      assert.equal(isClientId(bad), false, bad);
    }
  });

  it("алфавит в миграции — тот же самый", () => {
    const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260908000000_client_id.sql"), "utf8");
    const m = /alphabet text := '([^']+)'/.exec(sql);
    assert.ok(m, "в миграции нет алфавита");
    assert.equal(m[1], CLIENT_ID_ALPHABET);
    assert.ok(sql.includes("'МЭ-'"), "в миграции нет префикса МЭ");
  });
});
