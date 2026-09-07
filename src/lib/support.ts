import { CONTACT_EMAIL, MAX_URL, TELEGRAM_URL } from "@/lib/env";

/**
 * КОНТАКТЫ ПОДДЕРЖКИ.
 *
 * Настоящие адреса приходят из переменных окружения:
 *   NEXT_PUBLIC_TELEGRAM_URL, NEXT_PUBLIC_MAX_URL, NEXT_PUBLIC_CONTACT_EMAIL.
 *
 * ЗАГЛУШКИ НИЖЕ — ВРЕМЕННЫЕ. Они стоят, чтобы страница поддержки не была
 * пустой до настройки, и помечены на самой странице словами «адрес
 * уточняется». Программисты заменяют их не в коде, а переменными в
 * Vercel — см. docs/PEREDACHA-PROGRAMMISTAM.md. В подвале сайта заглушки
 * не показываются: там контакты появляются только настоящие.
 */
const PLACEHOLDER = {
  telegram: "https://t.me/moya_era_support",
  max: "https://max.ru/moya_era_support",
  email: "support@moya-era.example",
} as const;

export type SupportChannel = {
  id: "telegram" | "max" | "email";
  title: string;
  /** адрес ссылки или почта */
  value: string;
  /** что показать под названием */
  shown: string;
  /** адрес из настроек, а не заглушка */
  real: boolean;
};

export function supportChannels(): SupportChannel[] {
  return [
    {
      id: "telegram",
      title: "Написать в Telegram",
      value: TELEGRAM_URL || PLACEHOLDER.telegram,
      shown: (TELEGRAM_URL || PLACEHOLDER.telegram).replace(/^https?:\/\//, ""),
      real: Boolean(TELEGRAM_URL),
    },
    {
      id: "max",
      title: "Написать в Max",
      value: MAX_URL || PLACEHOLDER.max,
      shown: (MAX_URL || PLACEHOLDER.max).replace(/^https?:\/\//, ""),
      real: Boolean(MAX_URL),
    },
    {
      id: "email",
      title: "Почта",
      value: CONTACT_EMAIL || PLACEHOLDER.email,
      shown: CONTACT_EMAIL || PLACEHOLDER.email,
      real: Boolean(CONTACT_EMAIL),
    },
  ];
}
