import type { Person, Plan, Subscription } from "@/lib/backend";

/**
 * Правила доступа — чистые функции, одинаковые на клиенте и сервере.
 *
 * Единица учёта — профиль человека. Подписка открывает все системы и все
 * типы разбора по датам своих людей. «Практик» (max_people = null)
 * открывает любую дату.
 */

export type AccessState = {
  plan: Plan | null;
  subscription: Subscription | null;
  people: Person[];
};

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === "canceled" || sub.status === "expired") return false;
  return new Date(sub.current_period_end).getTime() > Date.now();
}

/** Даты, по которым открыт полный разбор. null — любые. */
export function unlockedDates(state: AccessState): Set<string> | null {
  if (!isSubscriptionActive(state.subscription) || !state.plan) return new Set();
  if (state.plan.max_people === null) return null;
  return new Set(state.people.map((p) => p.birth_date));
}

export function datesUnlocked(state: AccessState, dates: string[]): boolean {
  const set = unlockedDates(state);
  if (set === null) return true;
  return dates.every((d) => set.has(d));
}

/** Сколько ещё людей можно добавить. null — без ограничений. */
export function peopleLeft(state: AccessState): number | null {
  if (!state.plan) return 0;
  if (state.plan.max_people === null) return null;
  return Math.max(0, state.plan.max_people - state.people.length);
}
