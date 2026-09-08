/**
 * СВОИ ЛЮДИ НА СТРАНИЦАХ НАПРАВЛЕНИЙ.
 *
 * Проверяется то, от чего зависит, увидит ли вошедший свой результат
 * сразу: владелец в списке первый, подпись в переключателе понятная,
 * дата и время из профиля переводятся в форму без потерь, а старые адреса
 * кабинета перенаправляются на новые страницы — все шесть.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { birthFromPerson, dateParts, personLabel, personName, selfFirst } from "./people";
import { directions } from "./directions";
import type { Person } from "./backend";
import nextConfig from "../../next.config";

const base: Person = {
  id: "p1",
  user_id: "u1",
  name: "Аня",
  relation: "partner",
  birth_date: "1992-04-09",
  birth_time: "09:40:00",
  birth_place: "Москва",
  birth_place_id: 524901,
  birth_lat: 55.75,
  birth_lon: 37.62,
  birth_tz: "Europe/Moscow",
  sex: null,
  created_at: "2026-09-01T00:00:00Z",
};

describe("свои люди на страницах направлений", () => {
  it("владелец профиля первый, порядок остальных не меняется", () => {
    const list = selfFirst([
      { ...base, id: "a", relation: "child" },
      { ...base, id: "me", relation: "self", name: "Я" },
      { ...base, id: "b", relation: "friend" },
    ]);
    assert.deepEqual(
      list.map((p) => p.id),
      ["me", "a", "b"],
    );
  });

  it("подпись в переключателе: «Вы», имя с отношением, заглушка без имени", () => {
    assert.equal(personLabel({ name: "Я", relation: "self" }), "Вы");
    assert.equal(personLabel({ name: "Пётр", relation: "self" }), "Вы · Пётр");
    assert.equal(personLabel({ name: "Аня", relation: "partner" }), "Аня · Партнёр");
    assert.equal(personLabel({ name: "", relation: "child" }), "Ребёнок");
    assert.equal(personName({ name: "Мой профиль" }), null);
    assert.equal(personName({ name: " Аня " }), "Аня");
  });

  it("дата, время и место из профиля попадают в форму карты", () => {
    const b = birthFromPerson(base);
    assert.equal(b.date, "1992-04-09");
    assert.equal(b.time, "09:40");
    assert.equal(b.place?.id, 524901);
    assert.equal(b.place?.tz, "Europe/Moscow");
    assert.equal(b.placeText, "Москва");
    const bare = birthFromPerson({ ...base, birth_time: null, birth_place: null, birth_place_id: null, birth_lat: null, birth_lon: null, birth_tz: null });
    assert.equal(bare.time, null);
    assert.equal(bare.place, null);
    assert.equal(bare.placeText, "");
    assert.deepEqual(dateParts("1992-04-09"), { day: 9, month: 4, year: 1992 });
    assert.equal(dateParts("нет"), null);
  });

  it("старые адреса кабинета перенаправляются на новые страницы — все шесть", async () => {
    const list = await nextConfig.redirects!();
    for (const d of directions) {
      const hit = list.find((r) => r.source === `/cabinet/${d.id}`);
      assert.ok(hit, `нет редиректа для /cabinet/${d.id}`);
      assert.equal(hit.destination, d.path);
      assert.equal(hit.permanent, true);
    }
  });
});
