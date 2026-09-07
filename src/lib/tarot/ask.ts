/**
 * ВОПРОС КАРТАМ В АДРЕСЕ — /taro?vid=three&q=…
 *
 * Первый экран таро — вопрос и четыре расклада. Вопрос и выбранный вид
 * живут в адресе, чтобы человек ничего не терял по дороге:
 *  - гость написал вопрос, нажал «Разложить», ушёл входить и вернулся
 *    (`?next=/taro?vid=…`, вопрос — из sessionStorage) — поле заполнено,
 *    расклад выбран;
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

/** Длина вопроса — та же, что принимает сервер расклада. */
export const ASK_MAX = 500;

/** Запасная копия вопроса на время входа: адрес может потеряться по дороге. */
export const ASK_STORAGE_KEY = "era_taro_ask";

/**
 * Приветственные кредиты новому аккаунту. Начисляет база триггером
 * (`grant_welcome_credits` в первой миграции); тест сверяет это число с
 * миграцией, чтобы обещание на странице не разошлось с начислением.
 */
export const WELCOME_CREDITS = 5;

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
 * страница кладёт его в sessionStorage (`ASK_STORAGE_KEY`) и забирает
 * оттуда после возвращения.
 */
export function askReturnPath(vid: string | null | undefined, to: "login" | "register"): string {
  return `/${to}?next=${encodeURIComponent(askPath({ vid }))}`;
}

/**
 * Что сказать гостю, нажавшему «Разложить карты». Не замок, а предложение:
 * приветственных кредитов хватает на любой расклад, кроме большого.
 */
export function bridgeText(price: number): string {
  if (price <= WELCOME_CREDITS) return "Войдите — новым пять кредитов в подарок, первого расклада хватит.";
  return `Войдите — новым пять кредитов в подарок. Большой расклад стоит ${price}, зато на одну или три карты хватит с запасом.`;
}
