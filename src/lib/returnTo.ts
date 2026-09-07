/**
 * КУДА ВЕРНУТЬ ПОСЛЕ ВХОДА.
 *
 * Правило одно на весь сайт: если человек ушёл на вход или регистрацию
 * со страницы с незаконченным действием — вопрос картам, замок в
 * разборе, наставник, оплата, уточнённая карта — после входа он
 * возвращается ровно туда, откуда пришёл, а не в кабинет.
 *
 * Адрес возврата едет двумя дорогами сразу, потому что одной мало:
 *  - параметром `?next=` в адресе входа — прямой путь;
 *  - копией в localStorage — на случай, если параметр потерялся по
 *    дороге: человек перешёл со входа на регистрацию, ошибся паролем и
 *    открыл страницу заново, подтверждал почту из письма в новой вкладке,
 *    нажал «Войти» в шапке. Копия живёт сутки и снимается, как только
 *    её использовали.
 *
 * Возвращать можно только на свой относительный адрес: чужой домен и
 * «//» отсекаются, иначе ссылкой на вход можно было бы увести человека
 * с сайта. На главную и на сами страницы входа не возвращаем — там
 * незаконченных действий не бывает, после входа лучше кабинет.
 */

export const RETURN_KEY = "era_return_to";

/** Сутки: подтверждение почты может занять время, а через день адрес уже неактуален. */
export const RETURN_TTL_MS = 24 * 60 * 60 * 1000;

export type ReturnStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const AUTH_PAGES = ["/login", "/register"];

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

/** Стоит ли туда возвращать: не главная и не страницы входа. */
export function isReturnWorthy(path: unknown): path is string {
  if (!isSafePath(path)) return false;
  const bare = path.split(/[?#]/)[0];
  if (bare === "/" || bare === "") return false;
  return !AUTH_PAGES.some((a) => bare === a || bare.startsWith(`${a}/`));
}

/** Адрес входа или регистрации с возвратом на `returnTo`, если туда стоит возвращать. */
export function authHref(to: "login" | "register", returnTo?: string | null): string {
  const base = `/${to}`;
  return returnTo && isReturnWorthy(returnTo) ? `${base}?next=${encodeURIComponent(returnTo)}` : base;
}

/** Текущий адрес страницы целиком: путь, запрос и якорь. */
export function currentPath(loc: { pathname: string; search: string; hash: string } | null = typeof window === "undefined" ? null : window.location): string {
  if (!loc) return "/";
  return `${loc.pathname}${loc.search}${loc.hash}`;
}

/** Запомнить, куда вернуть. Негодный адрес молча не запоминается. */
export function rememberReturn(path: string, store: ReturnStore | null = browserStore(), now: number = Date.now()): void {
  if (!store || !isReturnWorthy(path)) return;
  try {
    store.setItem(RETURN_KEY, JSON.stringify({ path, at: now }));
  } catch {
    /* приватный режим: останется только ?next= в адресе */
  }
}

/** Куда вернуть, не снимая записи. null — некуда или запись устарела. */
export function peekReturn(store: ReturnStore | null = browserStore(), now: number = Date.now()): string | null {
  if (!store) return null;
  try {
    const raw = store.getItem(RETURN_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof v.at !== "number" || now - v.at > RETURN_TTL_MS) return null;
    return isReturnWorthy(v.path) ? v.path : null;
  } catch {
    return null;
  }
}

/** Куда вернуть — и снять запись: адрес возврата используется один раз. */
export function takeReturn(store: ReturnStore | null = browserStore(), now: number = Date.now()): string | null {
  const path = peekReturn(store, now);
  forgetReturn(store);
  return path;
}

export function forgetReturn(store: ReturnStore | null = browserStore()): void {
  try {
    store?.removeItem(RETURN_KEY);
  } catch {
    /* нечего снимать */
  }
}

/**
 * Уйти на вход или регистрацию так, чтобы вернуться сюда же: адрес
 * запоминается и в хранилище, и в `?next=`.
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
