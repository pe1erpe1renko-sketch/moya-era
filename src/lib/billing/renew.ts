/**
 * АВТОПРОДЛЕНИЕ: КОГДА СПИСЫВАТЬ, КОГДА ПРЕДУПРЕЖДАТЬ, КОГДА СДАТЬСЯ.
 *
 * Здесь только арифметика дат и решения — без базы и без банка, чтобы
 * всё это можно было проверить тестами, а не живыми деньгами.
 *
 * ПОРЯДОК СОБЫТИЙ У ОДНОЙ ПОДПИСКИ:
 *
 *   за 3 дня до конца — предупреждаем: что спишется, сколько и когда,
 *                       и как отключить. ДО списания, а не после.
 *   за 1 день         — создаём платёж по сохранённому способу оплаты.
 *   не прошёл         — через день ещё раз, потом ещё через три.
 *   три неудачи       — честно сообщаем и переводим в бесплатный режим.
 *
 * Сразу не отключаем ни при какой неудаче: у карты кончился срок,
 * банк не пропустил разовое списание, на счету не хватило до зарплаты —
 * это не повод отбирать оплаченное.
 */

/** За сколько дней до конца периода создаём платёж. */
export const CHARGE_LEAD_DAYS = 1;

/** За сколько дней предупреждаем о списании. */
export const WARN_LEAD_DAYS = 3;

/**
 * Через сколько дней повторять после неудачи: после первой — через день,
 * после второй — через три.
 */
export const RETRY_DELAY_DAYS = [1, 3] as const;

/** Больше трёх попыток не делаем. */
export const MAX_ATTEMPTS = 3;

/**
 * СКОЛЬКО ДНЕЙ ПОСЛЕ КОНЦА ПЕРИОДА ПОДПИСКА ЕЩЁ В РАБОТЕ.
 *
 * Первая попытка за день до конца, вторая через день после неё (в самый
 * конец), третья ещё через три — последняя приходится на четвёртый день
 * после конца периода. Дальше подписку не трогаем.
 *
 * Это не украшение запроса, а защита. Без нижней границы задача забирала
 * бы все подписки со статусом «active», у которых период уже кончился, —
 * в том числе кончившийся полгода назад, — и списала бы с них деньги при
 * первом же запуске. Статус после конца периода сам собой не меняется:
 * доступ считается по дате, а не по нему.
 */
export const RENEW_WINDOW_DAYS =
  CHARGE_LEAD_DAYS + RETRY_DELAY_DAYS.reduce((a, b) => a + b, 0) + 1;

/** Подписка ещё в работе: не слишком рано и не слишком поздно. */
export function insideRenewWindow(periodEnd: Date, now: Date): boolean {
  const daysPast = (now.getTime() - periodEnd.getTime()) / 86_400_000;
  return daysPast <= RENEW_WINDOW_DAYS;
}

const DAY = 86_400_000;

export type RenewPeriod = "month" | "year";

export type RenewableSubscription = {
  id: string;
  userId: string;
  planId: string;
  period: RenewPeriod;
  /** конец оплаченного периода */
  periodEnd: Date;
  autoRenew: boolean;
  paymentMethodId: string | null;
  /** за какой конец периода уже предупреждали */
  warnedFor: Date | null;
  /**
   * День месяца, в который человек оплатил впервые.
   *
   * Нужен, чтобы прижатие к концу месяца не накапливалось: без него
   * оплативший 31 января после первого же февраля навсегда съезжает на
   * 28-е и теряет по три дня в год.
   */
  anchorDay: number;
};

/* ─── когда что делать ───────────────────────────────────────────── */

/** Пора создавать платёж: до конца периода остался день или меньше. */
export function dueForCharge(sub: RenewableSubscription, now: Date): boolean {
  if (!sub.autoRenew || !sub.paymentMethodId) return false;
  // Поздно — тоже нельзя: подписка, кончившаяся полгода назад, не
  // повод списать деньги сегодня.
  if (!insideRenewWindow(sub.periodEnd, now)) return false;
  return sub.periodEnd.getTime() - now.getTime() <= CHARGE_LEAD_DAYS * DAY;
}

/**
 * Пора предупреждать: до конца периода три дня или меньше, и про этот
 * конец периода мы ещё не говорили.
 *
 * Сравниваем именно с концом периода, а не с датой отправки: продлили —
 * конец сдвинулся, и следующее предупреждение уйдёт заново.
 */
export function dueForWarning(sub: RenewableSubscription, now: Date): boolean {
  if (!sub.autoRenew || !sub.paymentMethodId) return false;
  if (!insideRenewWindow(sub.periodEnd, now)) return false;
  if (sub.warnedFor && sub.warnedFor.getTime() === sub.periodEnd.getTime()) return false;
  return sub.periodEnd.getTime() - now.getTime() <= WARN_LEAD_DAYS * DAY;
}

/** Когда пробовать снова после неудачной попытки. Null — больше не пробовать. */
export function nextAttemptAt(failedAttempt: number, now: Date): Date | null {
  const delay = RETRY_DELAY_DAYS[failedAttempt - 1];
  if (delay === undefined || failedAttempt >= MAX_ATTEMPTS) return null;
  return new Date(now.getTime() + delay * DAY);
}

/** Попытки исчерпаны — пора честно сообщить и перевести в бесплатный режим. */
export function givingUp(failedAttempt: number): boolean {
  return failedAttempt >= MAX_ATTEMPTS;
}

/* ─── границы периода ────────────────────────────────────────────── */

/**
 * Новый конец периода — от старого, а не от «сейчас».
 *
 * Списываем за день до конца, и отсчёт от дня платежа воровал бы у
 * человека сутки на каждом продлении: за год — почти две недели.
 *
 * `anchorDay` — день месяца первой оплаты. Без него прижатие к концу
 * короткого месяца становится вечным: 31 января → 28 февраля → 28 марта,
 * и день оплаты навсегда уезжает на три дня назад. С якорем февраль
 * прижимает, а март возвращает на 31-е.
 */
export function nextPeriodEnd(periodEnd: Date, period: RenewPeriod, anchorDay?: number): Date {
  return addMonths(periodEnd, period === "year" ? 12 : 1, anchorDay);
}

/**
 * Плюс месяцы, с прижатием к последнему дню месяца.
 *
 * Обычное `setMonth` из 31 января делает 3 марта: тридцать первого
 * февраля нет, и дата «перетекает» в следующий месяц. Здесь она
 * прижимается к 28 (или 29) февраля.
 *
 * @param day какой день месяца брать за основу; по умолчанию день самой
 *   даты. Передают сюда день первой оплаты, чтобы прижатие в феврале не
 *   осталось навсегда.
 */
export function addMonths(from: Date, months: number, day = from.getUTCDate()): Date {
  const out = new Date(from.getTime());
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, lastDay));
  return out;
}

/* ─── деньги ─────────────────────────────────────────────────────── */

/** Сколько списывать: цена периода, который продлеваем. */
export function renewAmount(plan: { price_month: number; price_year: number }, period: RenewPeriod): number {
  return period === "year" ? plan.price_year : plan.price_month;
}

/** Сколько кредитов начислить за новый период. */
export function renewCredits(plan: { monthly_credits: number }, period: RenewPeriod): number {
  return plan.monthly_credits * (period === "year" ? 12 : 1);
}

/* ─── идемпотентность ────────────────────────────────────────────── */

/**
 * Ключ идемпотентности для банка.
 *
 * Одна попытка — один ключ. Повторный запуск задачи в пределах той же
 * попытки отдаёт ЮKassa тот же ключ, и она возвращает уже созданный
 * платёж вместо второго списания. Новая попытка — новый ключ, иначе
 * повтор после неудачи вернул бы ту же неудачу.
 */
export function renewalKey(subscriptionId: string, periodEnd: Date, attempt: number): string {
  return `renew:${subscriptionId}:${periodEnd.toISOString()}:${attempt}`;
}

/* ─── что человек читает ─────────────────────────────────────────── */

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function dateLabel(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Предупреждение о списании.
 *
 * Называет сумму, день и способ отказаться. Без этого «предупредили» —
 * это уведомление задним числом, за которое банк снимает платёж, а закон
 * считает списание навязанным.
 */
export function warningText(input: { planTitle: string; amount: number; periodEnd: Date; siteUrl: string }): string {
  return [
    `Подписка «${input.planTitle}» продлится ${dateLabel(input.periodEnd)}.`,
    `Спишется ${input.amount} ₽ с карты, которой вы платили в прошлый раз.`,
    "",
    `Если продлевать не нужно — выключите автопродление в кабинете: ${input.siteUrl}/cabinet#plan`,
    "Всё, что уже оплачено и не израсходовано, останется доступным до конца оплаченного периода.",
  ].join("\n");
}

/** Сообщение после того, как все попытки не прошли. */
export function failureText(input: { planTitle: string; periodEnd: Date; siteUrl: string }): string {
  return [
    `Не получилось продлить подписку «${input.planTitle}»: банк не пропустил списание.`,
    `Мы пробовали три раза, с ${dateLabel(input.periodEnd)}. Деньги не списаны.`,
    "",
    "Доступ перешёл в бесплатный режим: карта дня и бесплатные части разборов остались, платные закрылись. Расклады, образы и кредиты на счету — ваши, они никуда не делись.",
    `Вернуться можно в любой день: ${input.siteUrl}/tarify`,
  ].join("\n");
}
