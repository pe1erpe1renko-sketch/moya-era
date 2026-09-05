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
