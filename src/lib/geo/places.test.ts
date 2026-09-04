/**
 * Поиск по справочнику мест на настоящих данных (src/lib/geo/data/places.json).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createPlacesIndex, normalizePlaceText, type PlacesData } from "./placesIndex";

const data = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "src/lib/geo/data/places.json"), "utf8"),
) as PlacesData;
const index = createPlacesIndex(data);

const first = (q: string) => index.search(q)[0];

describe("справочник мест", () => {
  it("размер и источник", () => {
    assert.ok(index.size > 15_000, `мест: ${index.size}`);
    assert.ok(data.source.includes("GeoNames"));
  });

  it("нормализация: регистр, ё, дефисы, апострофы", () => {
    assert.equal(normalizePlaceText("Йошкар-Ола"), "йошкар ола");
    assert.equal(normalizePlaceText("Ёлкино"), "елкино");
    assert.equal(normalizePlaceText("Кам’янське"), "камянське");
    assert.equal(normalizePlaceText("  Санкт-Петербург "), "санкт петербург");
  });

  it("город по началу названия, с регионом и страной", () => {
    const p = first("Новосиб");
    assert.equal(p.name, "Новосибирск");
    assert.equal(p.label, "Новосибирск, Новосибирская область, Россия");
    assert.equal(p.tz, "Asia/Novosibirsk");
    assert.ok(Math.abs(p.lat - 55.03) < 0.05 && Math.abs(p.lon - 82.93) < 0.05);
    assert.equal(index.byId(p.id)?.name, "Новосибирск");
  });

  it("столицы", () => {
    assert.equal(first("Москва").label, "Москва, Россия");
    assert.equal(first("Киев").label, "Киев, Украина");
    assert.equal(first("Минск").label, "Минск, Беларусь");
    assert.equal(first("Алматы").name, "Алматы");
    assert.equal(first("Ташкент").label, "Ташкент, Узбекистан");
    assert.equal(first("Кишинёв").name, "Кишинёв");
    assert.equal(first("Рига").label, "Рига, Латвия");
  });

  it("старые названия и разговорные", () => {
    assert.equal(first("Ленинград").name, "Санкт-Петербург");
    assert.equal(first("Питер").name, "Санкт-Петербург");
    assert.equal(first("Свердловск").name, "Екатеринбург");
    assert.equal(first("Горький").name, "Нижний Новгород");
    assert.equal(first("Куйбышев").name, "Самара");
    assert.equal(first("Алма-Ата").name, "Алматы");
    assert.equal(first("Фрунзе").name, "Бишкек");
  });

  it("крупный город первым среди одноимённых, второе слово тоже ищется", () => {
    assert.equal(first("Ростов").name, "Ростов-на-Дону");
    assert.equal(first("Нижний").name, "Нижний Новгород");
    assert.equal(first("Петербург").name, "Санкт-Петербург");
    assert.equal(first("Новгород").name, "Великий Новгород");
    const rostovs = index.search("Ростов").map((p) => p.name);
    assert.ok(rostovs.includes("Ростов"), rostovs.join(", "));
  });

  it("латиница, ё и разный регистр", () => {
    assert.equal(first("moscow").name, "Москва");
    assert.equal(first("novosibirsk").name, "Новосибирск");
    assert.equal(first("ЙОШКАР-ОЛА").name, "Йошкар-Ола");
    assert.equal(first("Орел").name, "Орёл");
    assert.equal(first("орёл").name, "Орёл");
  });

  it("Заполярье и Крым", () => {
    const m = first("Мурманск");
    assert.equal(m.tz, "Europe/Moscow");
    assert.ok(m.lat > 68.9);
    const s = first("Симферополь");
    assert.ok(s.label.includes("Крым"));
    assert.ok(!s.label.includes("Украина") && !s.label.includes("Россия"));
  });

  it("мир: крупные города по-русски", () => {
    assert.equal(first("Берлин").label, "Берлин, Германия");
    assert.equal(first("Нью-Йорк").name, "Нью-Йорк");
    assert.equal(first("Тель-Авив").country, "IL");
    assert.equal(first("Лондон").label, "Лондон, Великобритания");
  });

  it("районы городов не попадают в подсказки", () => {
    for (const q of ["Оболонь", "Салтовка", "Чиланзар", "Ясенево"]) {
      const hit = index.search(q).find((p) => p.name === q);
      assert.equal(hit, undefined, `${q} должен быть отфильтрован как район города`);
    }
  });

  it("слишком короткий запрос и пустой результат", () => {
    assert.deepEqual(index.search("а"), []);
    assert.deepEqual(index.search("qwertyuiop"), []);
  });
});
