export type PlanId = "trial" | "sub";

export type CheckoutPeriod = {
  id: string;
  label: string;
  price: number;
  discount?: number;
  renewalNote: string;
  months: number;
};

export type CheckoutPlan = {
  id: PlanId;
  title: string;
  account: string;
  periods: CheckoutPeriod[];
  hint: string;
};

export const CHECKOUT_PLANS: Record<PlanId, CheckoutPlan> = {
  trial: {
    id: "trial",
    title: "Пробный доступ",
    account: "Полный доступ ко всем шести системам",
    hint: "Через три дня подписка продлится по тарифу «Подписка» — 690 ₽ в месяц, если не отменить.",
    periods: [
      {
        id: "3d",
        label: "3 дня",
        price: 249,
        months: 0,
        renewalNote: "Дальше 690 ₽ в месяц, отменить можно в любой день",
      },
    ],
  },
  sub: {
    id: "sub",
    title: "Подписка",
    account: "Все шесть систем, профили близких, карта дня",
    hint: "Чем длиннее период — тем ниже цена месяца. Списание раз в выбранный период.",
    periods: [
      { id: "1m", label: "1 месяц", price: 690, months: 1, renewalNote: "Списание раз в месяц" },
      { id: "3m", label: "3 месяца", price: 1966, discount: 5, months: 3, renewalNote: "Списание раз в три месяца" },
      { id: "6m", label: "6 месяцев", price: 3726, discount: 10, months: 6, renewalNote: "Списание раз в полгода" },
      { id: "12m", label: "1 год", price: 4900, discount: 41, months: 12, renewalNote: "Списание раз в год" },
    ],
  },
};

export function formatRub(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function nextChargeDate(months: number) {
  const d = new Date();
  if (months === 0) d.setDate(d.getDate() + 3);
  else d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
