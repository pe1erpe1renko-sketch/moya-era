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

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moyaera.ru";
export const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID ?? "";
