import { CONTACT_EMAIL, MAX_URL, TELEGRAM_URL } from "@/lib/env";

/**
 * КОНТАКТЫ ПОДДЕРЖКИ.
 *
 * Настоящие адреса приходят из переменных окружения:
 *   NEXT_PUBLIC_TELEGRAM_URL, NEXT_PUBLIC_MAX_URL, NEXT_PUBLIC_CONTACT_EMAIL.
 *
 * Пока адрес не настроен, канал не показывается вовсе: выдуманный адрес
 * хуже отсутствующего — то же правило, что в подвале сайта. Программисты
 * задают адреса переменными в Vercel — см. docs/PEREDACHA-PROGRAMMISTAM.md.
 */

export type SupportChannel = {
  id: "telegram" | "max" | "email";
  title: string;
  /** адрес ссылки или почта */
  value: string;
  /** что показать под названием */
  shown: string;
};

/** Только настроенные каналы. Пусто — контактов пока нет. */
export function supportChannels(): SupportChannel[] {
  const out: SupportChannel[] = [];
  if (TELEGRAM_URL) out.push({ id: "telegram", title: "Написать в Telegram", value: TELEGRAM_URL, shown: TELEGRAM_URL.replace(/^https?:\/\//, "") });
  if (MAX_URL) out.push({ id: "max", title: "Написать в Max", value: MAX_URL, shown: MAX_URL.replace(/^https?:\/\//, "") });
  if (CONTACT_EMAIL) out.push({ id: "email", title: "Почта", value: CONTACT_EMAIL, shown: CONTACT_EMAIL });
  return out;
}
