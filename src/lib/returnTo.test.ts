/**
 * КУДА ВЕРНУТЬ ПОСЛЕ ВХОДА.
 *
 * Проверяется то, из-за чего человек терял начатое: адрес возврата
 * переживает потерю параметра, устаревает через сутки, используется
 * один раз, а чужой адрес и страницы входа не проходят.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RETURN_KEY,
  RETURN_TTL_MS,
  authHref,
  currentPath,
  isReturnWorthy,
  isSafePath,
  peekReturn,
  rememberReturn,
  takeReturn,
  type ReturnStore,
} from "./returnTo";
import { resolveNext } from "./nextPath";

function memory(): ReturnStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("адрес возврата", () => {
  it("только свой относительный адрес", () => {
    assert.equal(isSafePath("/taro?vid=love"), true);
    assert.equal(isSafePath("//evil.example"), false);
    assert.equal(isSafePath("https://evil.example/"), false);
    assert.equal(isSafePath("/taro\nSet-Cookie: x"), false);
    assert.equal(isSafePath(""), false);
  });

  it("на главную и на страницы входа не возвращает", () => {
    assert.equal(isReturnWorthy("/"), false);
    assert.equal(isReturnWorthy("/login"), false);
    assert.equal(isReturnWorthy("/register?next=%2Ftaro"), false);
    assert.equal(isReturnWorthy("/taro"), true);
    assert.equal(isReturnWorthy("/matrica/26-07-1990#dalshe"), true);
    assert.equal(authHref("login", "/"), "/login");
    assert.equal(authHref("register", "/nastavnik"), "/register?next=%2Fnastavnik");
    assert.equal(authHref("login", "//evil.example"), "/login");
  });

  it("запоминается, читается один раз и устаревает через сутки", () => {
    const s = memory();
    rememberReturn("/taro?vid=three", s, 1000);
    assert.equal(peekReturn(s, 2000), "/taro?vid=three");
    assert.equal(takeReturn(s, 2000), "/taro?vid=three");
    assert.equal(takeReturn(s, 2000), null, "второй раз пусто");
    rememberReturn("/taro", s, 1000);
    assert.equal(peekReturn(s, 1000 + RETURN_TTL_MS + 1), null, "через сутки устарел");
    const fresh = memory();
    rememberReturn("//evil.example", fresh, 1000);
    assert.equal(fresh.data.has(RETURN_KEY), false, "чужой адрес не запоминается");
  });

  it("порядок: параметр адреса, потом запись, потом кабинет", () => {
    assert.equal(resolveNext("?next=%2Ftaro%3Fvid%3Dlove", "/nastavnik", "/cabinet"), "/taro?vid=love");
    assert.equal(resolveNext("", "/nastavnik", "/cabinet"), "/nastavnik");
    assert.equal(resolveNext("", null, "/cabinet"), "/cabinet");
    assert.equal(resolveNext("?next=//evil.example", null, "/cabinet"), "/cabinet");
    assert.equal(resolveNext("?next=https://evil.example", "/taro", "/cabinet"), "/taro");
  });

  it("текущий адрес — путь, запрос и якорь целиком", () => {
    assert.equal(currentPath({ pathname: "/natalnaya-karta/26-07-1990", search: "?t=0940&g=524901", hash: "#refine" }), "/natalnaya-karta/26-07-1990?t=0940&g=524901#refine");
    assert.equal(currentPath(null), "/");
  });
});
