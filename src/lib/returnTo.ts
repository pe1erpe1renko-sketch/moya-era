/**
 * КУДА ВЕРНУТЬ ПОСЛЕ ВХОДА — И ПОСЛЕ ОПЛАТЫ.
 *
 * Правило одно на весь сайт: если человек ушёл на вход, регистрацию или
 * оплату со страницы с незаконченным действием — вопрос картам, замок в
 * разборе, наставник, уточнённая карта — после этого он возвращается
 * ровно туда, откуда пришёл, а не в кабинет.
 *
 * Адрес возврата после входа едет двумя дорогами сразу, потому что одной
 * мало:
 *  - параметром `?next=` в адресе входа — прямой путь;
 *  - копией в localStorage — на случай, если параметр потерялся по
 *    дороге: человек перешёл со входа на регистрацию, ошибся паролем и
 *    открыл страницу заново, подтверждал почту из письма в новой вкладке,
 *    нажал «Войти» в шапке. Копия живёт сутки и снимается, как только
 *    её использовали.
 *
 * В `?next=` личные параметры адреса (имя, вопрос — `PRIVATE_PARAMS`) не
 * попадают: адрес страницы входа уходит в статистику и в Referer. Полный
 * адрес с именем хранится только в копии, и после входа берётся она —
 * см. `nextPath.resolveNext`.
 *
 * Адрес возврата после оплаты — отдельная запись: по дороге к оплате
 * человек может ещё и зарегистрироваться, и запись «после входа» при
 * этом перебивается адресом оформления. Ставит её замок при нажатии
 * «Открыть всё», читает страница после оплаты.
 *
 * Возвращать можно только на свой относительный адрес: чужой домен и
 * «//» отсекаются, иначе ссылкой на вход можно было бы увести человека
 * с сайта. На главную и на сами страницы входа не возвращаем — там
 * незаконченных действий не бывает, после входа лучше кабинет.
 */

import { publicUrl } from "@/lib/chartUrl";

export const RETURN_KEY = "era_return_to";
export const AFTER_PAY_KEY = "era_after_pay";

/** Сутки: подтверждение почты может занять время, а через день адрес уже неактуален. */
export const RETURN_TTL_MS = 24 * 60 * 60 * 1000;

export type ReturnStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const AUTH_PAGES = ["/login", "/register", "/checkout"];

function browserStore(): ReturnStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Только свой относительный адрес: с одной косой черты, без пробелов и переносов. */
export function isSafePath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !/[\s\\]/.test(path) && path.length <= 2000;
}

/** Стоит ли туда возвращать: не главная, не страницы входа и не оформление. */
export function isReturnWorthy(path: unknown): path is string {
  if (!isSafePath(path)) return false;
  const bare = path.split(/[?#]/)[0];
  if (bare === "/" || bare === "") return false;
  return !AUTH_PAGES.some((a) => bare === a || bare.startsWith(`${a}/`));
}

/**
 * Адрес входа или регистрации с возвратом на `returnTo`, если туда стоит
 * возвращать. Личные параметры адреса в `?next=` не кладутся.
 */
export function authHref(to: "login" | "register", returnTo?: string | null): string {
  const base = `/${to}`;
  const clean = returnTo ? publicUrl(returnTo) : returnTo;
  return clean && isReturnWorthy(clean) ? `${base}?next=${encodeURIComponent(clean)}` : base;
}

/** Текущий адрес страницы целиком: путь, запрос и якорь. */
export function currentPath(loc: { pathname: string; search: string; hash: string } | null = typeof window === "undefined" ? null : window.location): string {
  if (!loc) return "/";
  return `${loc.pathname}${loc.search}${loc.hash}`;
}

function write(key: string, path: string, store: ReturnStore | null, now: number): void {
  if (!store || !isReturnWorthy(path)) return;
  try {
    store.setItem(key, JSON.stringify({ path, at: now }));
  } catch {
    /* приватный режим: останется только ?next= в адресе */
  }
}

function read(key: string, store: ReturnStore | null, now: number): string | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof v.at !== "number" || now - v.at > RETURN_TTL_MS) return null;
    return isReturnWorthy(v.path) ? v.path : null;
  } catch {
    return null;
  }
}

function drop(key: string, store: ReturnStore | null): void {
  try {
    store?.removeItem(key);
  } catch {
    /* нечего снимать */
  }
}

/** Запомнить, куда вернуть после входа. Негодный адрес молча не запоминается. */
export function rememberReturn(path: string, store: ReturnStore | null = browserStore(), now: number = Date.now()): void {
  write(RETURN_KEY, path, store, now);
}

/** Куда вернуть после входа, не снимая записи. null — некуда или запись устарела. */
export function peekReturn(store: ReturnStore | null = browserStore(), now: number = Date.now()): string | null {
  return read(RETURN_KEY, store, now);
}

/** Куда вернуть после входа — и снять запись: адрес возврата используется один раз. */
export function takeReturn(store: ReturnStore | null = browserStore(), now: number = Date.now()): string | null {
  const path = read(RETURN_KEY, store, now);
  drop(RETURN_KEY, store);
  return path;
}

export function forgetReturn(store: ReturnStore | null = browserStore()): void {
  drop(RETURN_KEY, store);
}

/** Запомнить, куда вернуть после оплаты: страница, где стоял замок. */
export function rememberAfterPay(path: string = currentPath(), store: ReturnStore | null = browserStore(), now: number = Date.now()): void {
  write(AFTER_PAY_KEY, path, store, now);
}

/** Куда вернуть после оплаты, не снимая записи. */
export function peekAfterPay(store: ReturnStore | null = browserStore(), now: number = Date.now()): string | null {
  return read(AFTER_PAY_KEY, store, now);
}

/** Куда вернуть после оплаты — и снять запись. */
export function takeAfterPay(store: ReturnStore | null = browserStore(), now: number = Date.now()): string | null {
  const path = read(AFTER_PAY_KEY, store, now);
  drop(AFTER_PAY_KEY, store);
  return path;
}

/**
 * Уйти на вход или регистрацию так, чтобы вернуться сюда же: полный адрес
 * запоминается в хранилище, очищенный от личных параметров — в `?next=`.
 */
export function leaveForAuth(
  router: { push: (href: string) => void; replace: (href: string) => void },
  to: "login" | "register",
  returnTo: string = currentPath(),
  mode: "push" | "replace" = "push",
): void {
  rememberReturn(returnTo);
  router[mode](authHref(to, returnTo));
}
