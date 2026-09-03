import type { CreditPack, Plan } from "@/lib/backend";

/**
 * Тарифы по умолчанию. В бою читаются из таблицы `plans` в Supabase —
 * там их можно менять без деплоя. Здесь — те же стартовые значения,
 * что в миграции, для демо-режима и как запасной вариант.
 *
 * ЦИФРЫ — ДЛЯ ОБСУЖДЕНИЯ. Структура: единица — профиль человека,
 * кредиты — только на сообщения наставнику.
 */
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "basic",
    title: "Базовый",
    subtitle: "Все шесть систем — для себя",
    max_people: 1,
    monthly_credits: 30,
    price_month: 590,
    price_year: 4900,
    features: [
      "Все шесть систем и все типы разбора по своей дате",
      "Аркан дня, личный год, календарь",
      "30 сообщений наставнику в месяц",
    ],
    sort: 1,
  },
  {
    id: "family",
    title: "Семейный",
    subtitle: "До пяти человек и совместимости между ними",
    max_people: 5,
    monthly_credits: 100,
    price_month: 990,
    price_year: 8900,
    features: [
      "До пяти человек: партнёр, дети, родители",
      "Совместимость, детская, мама и ребёнок",
      "100 сообщений наставнику в месяц",
    ],
    sort: 2,
  },
  {
    id: "pro",
    title: "Практик",
    subtitle: "Без ограничений — для консультантов",
    max_people: null,
    monthly_credits: 300,
    price_month: 4900,
    price_year: 39000,
    features: [
      "Любое число людей и разборов",
      "PDF-разборы под вашим именем",
      "300 сообщений наставнику в месяц",
      "Приоритетная поддержка",
    ],
    sort: 3,
  },
];

export const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  { id: "pack_50", credits: 50, price: 290, sort: 1 },
  { id: "pack_150", credits: 150, price: 690, sort: 2 },
  { id: "pack_500", credits: 500, price: 1900, sort: 3 },
];

/** Приветственные кредиты новому аккаунту — «первые сообщения бесплатно». */
export const WELCOME_CREDITS = 5;

export function formatRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

/** Сколько стоит месяц при оплате за год. */
export function monthlyEquivalent(plan: Plan): number {
  return Math.round(plan.price_year / 12);
}

/** Скидка за год в процентах относительно 12 месячных платежей. */
export function yearDiscountPercent(plan: Plan): number {
  const full = plan.price_month * 12;
  return Math.max(0, Math.round((1 - plan.price_year / full) * 100));
}
