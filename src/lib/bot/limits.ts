/**
 * СКОЛЬКО ЛЮДЕЙ МОЖНО ПОДКЛЮЧИТЬ К РАССЫЛКЕ.
 *
 * Ограничение только на подключённых к боту. Профилей на сайте у
 * Практика по-прежнему сколько угодно: бот не должен урезать то, за что
 * человек уже платит.
 */

/** Идентификаторы тарифов те же, что в таблице `plans`. */
export const BOT_LIMITS: Record<string, number> = { basic: 1, family: 5, pro: 15 };

/** Без подписки бот не подключается вовсе. */
export const NO_PLAN_LIMIT = 0;

export function botLimit(planId: string | null | undefined): number {
  if (!planId) return NO_PLAN_LIMIT;
  return BOT_LIMITS[planId] ?? NO_PLAN_LIMIT;
}

export type LimitCheck = { ok: true; left: number } | { ok: false; limit: number; reason: "no_plan" | "full" };

/**
 * Можно ли подключить ещё одного.
 * @param used сколько привязок уже занимает места
 */
export function canLink(planId: string | null | undefined, used: number): LimitCheck {
  const limit = botLimit(planId);
  if (limit === 0) return { ok: false, limit, reason: "no_plan" };
  if (used >= limit) return { ok: false, limit, reason: "full" };
  return { ok: true, left: limit - used };
}
