import { isSafePath, takeReturn } from "./returnTo";

/**
 * Куда вести после входа или регистрации.
 *
 * Порядок: параметр `?next=` в адресе страницы входа, потом адрес,
 * запомненный в хранилище (`lib/returnTo` — на случай, если параметр
 * потерялся по дороге), потом кабинет. Только относительные адреса.
 *
 * Запись в хранилище снимается в любом случае: либо она использована,
 * либо её перебил параметр — оставлять её на потом нельзя, иначе через
 * час она уведёт человека в незаконченное дело, о котором он забыл.
 */
export function resolveNext(search: string, stored: string | null, fallback: string): string {
  try {
    const next = new URLSearchParams(search).get("next");
    if (next && isSafePath(next)) return next;
  } catch {
    /* негодная строка запроса — идём дальше */
  }
  if (stored && isSafePath(stored)) return stored;
  return fallback;
}

/** Метка «только что вернулся со входа» — на несколько секунд, в этой вкладке. */
export const RETURNED_KEY = "era_returned_at";
const RETURNED_TTL_MS = 15_000;

export function nextPath(fallback = "/cabinet"): string {
  if (typeof window === "undefined") return fallback;
  try {
    window.sessionStorage.setItem(RETURNED_KEY, String(Date.now()));
  } catch {
    /* без метки страница просто не подсветит кнопку */
  }
  try {
    return resolveNext(window.location.search, takeReturn(), fallback);
  } catch {
    return fallback;
  }
}

/**
 * Пришёл ли человек только что со входа или регистрации. Читается один
 * раз: страница, на которую вернули, может подсветить незаконченное
 * действие — например, кнопку «Разложить карты».
 */
export function justReturned(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(RETURNED_KEY);
    window.sessionStorage.removeItem(RETURNED_KEY);
    const at = Number(raw);
    return Number.isFinite(at) && now - at < RETURNED_TTL_MS;
  } catch {
    return false;
  }
}
