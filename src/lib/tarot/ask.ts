/**
 * ВОПРОС КАРТАМ В АДРЕСЕ — /taro?vid=three&q=…
 *
 * Первый экран таро — вопрос и четыре расклада. Вопрос и выбранный вид
 * живут в адресе, чтобы человек ничего не терял по дороге:
 *  - гость написал вопрос, нажал «Разложить», ушёл входить и вернулся
 *    (`?next=/taro?vid=…`, вопрос — из черновика в localStorage) — поле
 *    заполнено, расклад выбран, кнопка в фокусе;
 *  - витрина на странице пары ведёт на `/taro?vid=love` — расклад об
 *    отношениях выбран сразу;
 *  - наставник предлагает «на этот вопрос можно сделать расклад» — и
 *    вопрос уже вписан в поле.
 *
 * Вопрос в адресе — личный текст. Страница забирает его из адреса сразу
 * при открытии и стирает из адресной строки, canonical у страницы —
 * чистый /taro, а в статистику адрес уходит без него (`q` в
 * `PRIVATE_PARAMS`, см. `lib/chartUrl`).
 */

import { SPREADS, type SpreadId } from "./spreads";
import { authHref, type ReturnStore } from "@/lib/returnTo";
import { WELCOME_CREDITS } from "@/lib/plansDefault";

/** Длина вопроса — та же, что принимает сервер расклада. */
export const ASK_MAX = 500;

/**
 * Черновик вопроса и выбранного вида — в localStorage, на сутки.
 * Переживает вход, регистрацию с подтверждением почты в другой вкладке
 * и просто уход со страницы: вернулся — вопрос на месте.
 */
export const ASK_STORAGE_KEY = "era_taro_ask";
export const ASK_TTL_MS = 24 * 60 * 60 * 1000;

/** Приветственные кредиты — одна константа на сайт, см. `plansDefault`. */
export { WELCOME_CREDITS };

export type Ask = { vid: SpreadId | null; q: string };

/** Вопрос без лишних пробелов и не длиннее, чем примет сервер. */
export function cleanQuestion(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ASK_MAX);
}

/** Разбирает строку запроса: неизвестный вид — как отсутствующий. */
export function parseAsk(search: string): Ask {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return { vid: spreadIdOf(params.get("vid")), q: cleanQuestion(params.get("q")) };
}

/** Вид расклада, если строка им является. */
export function spreadIdOf(raw: string | null | undefined): SpreadId | null {
  return SPREADS.some((s) => s.id === raw) ? (raw as SpreadId) : null;
}

/** Адрес первого экрана с выбранным видом и вопросом. Пусто — просто /taro. */
export function askPath(ask: { vid?: string | null; q?: string | null }): string {
  const params = new URLSearchParams();
  const vid = spreadIdOf(ask.vid);
  if (vid) params.set("vid", vid);
  const q = cleanQuestion(ask.q);
  if (q) params.set("q", q);
  const tail = params.toString();
  return tail ? `/taro?${tail}` : "/taro";
}

/**
 * Куда вести гостя: вход или регистрация с возвратом на тот же экран.
 *
 * В адрес возврата кладётся только вид расклада. Сам вопрос — личный
 * текст, и через адреса входа и заголовки Referer ему ходить незачем:
 * страница держит его в черновике (`rememberAsk`) и забирает оттуда
 * после возвращения.
 */
export function askReturnPath(vid: string | null | undefined, to: "login" | "register"): string {
  return authHref(to, askPath({ vid }));
}

/** Черновик: вопрос, вид и признак «ушёл на вход — по возвращении подсветить кнопку». */
export type AskDraft = { vid: SpreadId | null; q: string; returning: boolean };

function browserStore(): ReturnStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Сохранить черновик. Пустой черновик без вида — снять запись. */
export function rememberAsk(
  draft: { vid?: string | null; q?: string | null; returning?: boolean },
  store: ReturnStore | null = browserStore(),
  now: number = Date.now(),
): void {
  if (!store) return;
  const q = cleanQuestion(draft.q);
  const vid = spreadIdOf(draft.vid);
  try {
    if (!q && !vid) {
      store.removeItem(ASK_STORAGE_KEY);
      return;
    }
    store.setItem(ASK_STORAGE_KEY, JSON.stringify({ vid, q, returning: Boolean(draft.returning), at: now }));
  } catch {
    /* приватный режим — вопрос вернётся хотя бы из адреса */
  }
}

/** Забрать черновик и снять запись. null — черновика нет или он старше суток. */
export function takeAsk(store: ReturnStore | null = browserStore(), now: number = Date.now()): AskDraft | null {
  if (!store) return null;
  try {
    const raw = store.getItem(ASK_STORAGE_KEY);
    store.removeItem(ASK_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { vid?: unknown; q?: unknown; returning?: unknown; at?: unknown };
    if (typeof v.at !== "number" || now - v.at > ASK_TTL_MS) return null;
    const q = cleanQuestion(typeof v.q === "string" ? v.q : "");
    const vid = spreadIdOf(typeof v.vid === "string" ? v.vid : null);
    if (!q && !vid) return null;
    return { vid, q, returning: v.returning === true };
  } catch {
    return null;
  }
}

/**
 * Что сказать гостю, нажавшему «Разложить карты». Не замок, а предложение:
 * приветственных кредитов хватает на любой расклад, кроме большого.
 */
export function bridgeText(price: number): string {
  if (price <= WELCOME_CREDITS) return "Войдите — новым пять кредитов в подарок, первого расклада хватит.";
  return `Войдите — новым пять кредитов в подарок. Большой расклад стоит ${price}, зато на одну или три карты хватит с запасом.`;
}
