/**
 * Адрес сайта: подпись на карточке образа и ссылка приглашения.
 *
 * Смысл проверки. Подпись внизу карточки — единственное, по чему
 * человек, увидевший образ в сторис, может к нам прийти. Пустая или
 * битая подпись обесценивает всю затею, а заметить это по коду нельзя:
 * карточка отрисуется и без подписи.
 *
 * Модуль читает переменные окружения при загрузке, поэтому проверяем не
 * его саму, а правило, по которому он собирает адрес.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SITE_HOST, SITE_URL } from "./env";

/** То же правило, что в `env.ts`: пустая строка считается незаданной. */
const siteUrl = (raw: string | undefined) => (raw || "").trim() || "https://moya-era.vercel.app";
const siteHost = (raw: string | undefined) => siteUrl(raw).replace(/^https?:\/\//, "").replace(/\/+$/, "");

describe("адрес сайта", () => {
  it("подпись не пропадает, когда настройка пуста", () => {
    for (const empty of [undefined, "", "   "]) {
      assert.ok(siteHost(empty).length > 0, `пустая настройка «${empty}» дала пустую подпись`);
      assert.equal(siteHost(empty), "moya-era.vercel.app");
      assert.ok(siteUrl(empty).startsWith("https://"));
    }
  });

  it("настройка перебивает значение по умолчанию", () => {
    assert.equal(siteHost("https://moyaera.ru"), "moyaera.ru");
    assert.equal(siteUrl("https://moyaera.ru"), "https://moyaera.ru");
  });

  it("протокол и хвостовая косая черта в подпись не попадают", () => {
    for (const raw of ["https://moyaera.ru/", "http://moyaera.ru", "https://moyaera.ru///"]) {
      assert.equal(siteHost(raw), "moyaera.ru", raw);
    }
  });

  it("пробелы по краям не ломают адрес", () => {
    assert.equal(siteHost("  https://moyaera.ru  "), "moyaera.ru");
  });

  it("в сборке подпись непустая и без протокола", () => {
    assert.ok(SITE_HOST.length > 0);
    assert.ok(!SITE_HOST.includes("://"), SITE_HOST);
    assert.ok(SITE_URL.startsWith("http"), SITE_URL);
    assert.ok(SITE_URL.endsWith(SITE_HOST), `${SITE_URL} и ${SITE_HOST} разошлись`);
  });
});
