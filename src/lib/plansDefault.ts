import type { CreditPack, Plan } from "@/lib/backend";

/**
 * Тарифы по умолчанию. В бою читаются из таблицы `plans` в Supabase —
 * там их можно менять без деплоя. Здесь — те же стартовые значения,
 * что в миграции, для демо-режима и как запасной вариант.
 *
 * ЦИФРЫ — ДЛЯ ОБСУЖДЕНИЯ. Структура: единица — профиль человека,
 * кредиты — на сообщения наставнику и расклады таро.
 *
 * `features` на сайте больше не показываются (список у тарифов общий,
 * отличия считаются из колонок), но лежат в открытой таблице — поэтому
 * здесь только то, что есть на самом деле.
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
      "Все шесть систем и каждый вопрос в каждом разборе",
      "Карта дня, личный год, сводка в Telegram",
      "30 кредитов в месяц — наставник и расклады таро",
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
      "100 кредитов в месяц — наставник и расклады таро",
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
      "300 кредитов в месяц — наставник и расклады таро",
    ],
    sort: 3,
  },
];

export const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  { id: "pack_50", credits: 50, price: 290, sort: 1 },
  { id: "pack_150", credits: 150, price: 690, sort: 2 },
  { id: "pack_500", credits: 500, price: 1900, sort: 3 },
];

/**
 * Приветственные кредиты новому аккаунту: хватает на первый расклад или
 * первые сообщения наставнику. Начисляет база триггером
 * `grant_welcome_credits`; тест `tarot/ask.test.ts` сверяет число с
 * миграцией.
 */
export const WELCOME_CREDITS = 5;

/** «1 кредит», «3 кредита», «5 кредитов». */
export function creditWord(n: number): string {
  const last = n % 10;
  const tens = n % 100;
  if (tens >= 11 && tens <= 14) return "кредитов";
  if (last === 1) return "кредит";
  if (last >= 2 && last <= 4) return "кредита";
  return "кредитов";
}

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
