/**
 * Переменные окружения в одном месте.
 * Публичные (NEXT_PUBLIC_*) доступны в браузере, остальные — только на сервере.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Supabase настроен — значит работают настоящая авторизация, подписки, кредиты. */
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Демо-режим: Supabase не настроен. Сайт работает целиком на локальной
 * заглушке, все разборы открыты, чат отвечает заглушкой. Нужен, чтобы
 * посмотреть продукт до подключения базы. В проде так не запускать.
 */
export const DEMO_MODE = !HAS_SUPABASE;

/**
 * АДРЕС САЙТА. Отсюда берутся canonical, OG, карты сайта, ссылка на
 * карточке образа и приглашение друга.
 *
 * По умолчанию — рабочий адрес на Vercel, а не будущий домен: ссылка в
 * никуда обесценивает и образ, и приглашение, а домен ещё не куплен.
 * Программисты меняют одну переменную, и всё встаёт на место.
 *
 * Пустая строка считается незаданной. `??` её бы пропустил — пустое
 * значение не nullish, — и адрес молча стал бы пустым: подпись на
 * карточке исчезла бы, а canonical превратился в мусор.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").trim() || "https://moya-era.vercel.app";

/** Адрес без протокола и хвостовой косой черты — для подписей: «moya-era.vercel.app». */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");

export const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID ?? "";

/**
 * КОНТАКТЫ В ПОДВАЛЕ — почта и телеграм.
 *
 * Пока не заданы — не показываются. В подвале стояли `hello@moyaera.ru`
 * (домена не существует) и голая ссылка на t.me: письмо на такой адрес
 * не доходит, а ссылка ведёт на главную телеграма. Выдуманный контакт
 * хуже отсутствующего — человек пишет и ждёт ответа, которого не будет.
 */
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || "").trim();
export const TELEGRAM_URL = (process.env.NEXT_PUBLIC_TELEGRAM_URL || "").trim();
/** Чат поддержки в Max — так же, как телеграм: пусто, пока не задан. */
export const MAX_URL = (process.env.NEXT_PUBLIC_MAX_URL || "").trim();

/**
 * ТЕЛЕГРАМ-БОТ. Нет токена — бот выключен, и сайт работает как обычно:
 * вебхук отвечает «выключено», рассылка ничего не делает. Это рабочее
 * состояние до передачи программистам, а не запасной путь.
 *
 * BOT_NAME нужен только для ссылок вида t.me/<имя>?start=КОД: сам
 * телеграм имя из токена не отдаёт без запроса, а показывать ссылку надо
 * сразу.
 *
 * BOT_WEBHOOK_SECRET сверяется с заголовком, которым телеграм подписывает
 * каждый запрос. Без него адрес вебхука мог бы дёрнуть кто угодно.
 */
export const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
export const BOT_NAME = (process.env.TELEGRAM_BOT_NAME || "").trim();
export const BOT_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
export const HAS_BOT = Boolean(BOT_TOKEN);

/** Ключ, которым подписана задача по расписанию. Без него рассылку не запустить. */
export const CRON_SECRET = (process.env.CRON_SECRET || "").trim();

/**
 * АВТОПРОДЛЕНИЕ ПОДПИСКИ — выключено, пока не сказано обратное.
 *
 * Списывать с сохранённой карты без оферты, где условия автосписания
 * расписаны, нельзя ни по закону, ни по правилам банка. Поэтому задача
 * по расписанию без этой переменной не делает ничего: не создаёт
 * платежей, не предупреждает и не отключает подписок. Появится оферта —
 * ставится `BILLING_AUTO_RENEW=1`, и всё оживает без правок кода.
 *
 * Пустая строка, «0», «false», «off» и «no» считаются выключенным.
 * `Boolean(process.env.X)` здесь не годится: переменная со значением «0»
 * встречается чаще, чем хотелось бы, и включила бы списание с карт у
 * того, кто ставил её именно чтобы выключить.
 */
export function envFlag(raw: string | undefined): boolean {
  const v = (raw || "").trim().toLowerCase();
  return v !== "" && !["0", "false", "off", "no"].includes(v);
}

export const AUTO_RENEW_ENABLED = envFlag(process.env.BILLING_AUTO_RENEW);
