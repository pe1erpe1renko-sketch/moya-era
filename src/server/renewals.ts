import "server-only";

import { supabaseService } from "@/server/supabase";
import {
  MAX_ATTEMPTS,
  RENEW_WINDOW_DAYS,
  type RenewPeriod,
  type RenewableSubscription,
} from "@/lib/billing/renew";

/**
 * АВТОПРОДЛЕНИЕ: РАБОТА С БАЗОЙ.
 *
 * Решения принимает `lib/billing/renew` — там их можно проверить
 * тестами. Здесь только чтение и запись, и одно важное свойство:
 * КАЖДОЕ ИЗМЕНЕНИЕ ИДЕМПОТЕНТНО. Задача по расписанию запускается
 * несколько раз в сутки, Vercel умеет запустить её дважды, а речь идёт о
 * чужих деньгах: повтор не должен ни списать второй раз, ни продлить
 * подписку на два периода.
 */

export type DuePlan = { title: string; priceMonth: number; priceYear: number; monthlyCredits: number };
export type DueSubscription = RenewableSubscription & { plan: DuePlan };

type Row = Record<string, unknown>;

/**
 * Подписки, у которых скоро кончается оплаченный период.
 *
 * Берём с запасом (`daysAhead`), чтобы в один проход попали и те, кого
 * пора предупредить, и те, кого пора списывать, и те, у кого период уже
 * кончился и идёт вторая или третья попытка.
 */
export async function subscriptionsNearEnd(now: Date, daysAhead: number, limit = 200): Promise<DueSubscription[]> {
  const sb = supabaseService();
  if (!sb) return [];

  const until = new Date(now.getTime() + daysAhead * 86_400_000).toISOString();
  // Нижняя граница обязательна. Статус после конца периода сам собой не
  // меняется — доступ считается по дате, — и без неё в выборку попали бы
  // все давно кончившиеся подписки разом, а за выборкой идут деньги.
  const since = new Date(now.getTime() - RENEW_WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await sb
    .from("subscriptions")
    .select("id, user_id, plan_id, period, started_at, current_period_end, auto_renew, payment_method_id, renew_warned_for, plans(title, price_month, price_year, monthly_credits)")
    .in("status", ["active", "past_due"])
    .eq("auto_renew", true)
    .lte("current_period_end", until)
    .gte("current_period_end", since)
    .order("current_period_end", { ascending: true })
    .limit(limit);

  return ((data as Row[] | null) ?? []).flatMap((r) => {
    const plan = (Array.isArray(r.plans) ? r.plans[0] : r.plans) as Row | null;
    if (!plan) return [];
    return [
      {
        id: String(r.id),
        userId: String(r.user_id),
        planId: String(r.plan_id),
        period: (String(r.period) === "year" ? "year" : "month") as RenewPeriod,
        periodEnd: new Date(String(r.current_period_end)),
        autoRenew: r.auto_renew !== false,
        paymentMethodId: (r.payment_method_id as string | null) ?? null,
        warnedFor: r.renew_warned_for ? new Date(String(r.renew_warned_for)) : null,
        // День первой оплаты: по нему считается новый конец периода,
        // чтобы февральское прижатие не осталось навсегда.
        anchorDay: new Date(String(r.started_at ?? r.current_period_end)).getUTCDate(),
        plan: {
          title: String(plan.title),
          priceMonth: Number(plan.price_month),
          priceYear: Number(plan.price_year),
          monthlyCredits: Number(plan.monthly_credits),
        },
      },
    ];
  });
}

/**
 * Занимает попытку продления. Возвращает её номер или 0, если продлевать
 * не надо: уже продлено, ещё рано для повтора или попытки исчерпаны.
 *
 * Занимает ДО похода в банк, одной транзакцией с проверкой: это и есть
 * защита от двойного списания при повторном запуске.
 */
export async function claimAttempt(sub: DueSubscription): Promise<number> {
  const sb = supabaseService();
  if (!sb) return 0;
  const { data, error } = await sb.rpc("claim_renewal", {
    _sub: sub.id,
    _user: sub.userId,
    _period_end: sub.periodEnd.toISOString(),
    _max_attempts: MAX_ATTEMPTS,
  });
  if (error) return 0;
  return Number(data) || 0;
}

/** Платёж, начатый в этой попытке, если он уже создан. */
export async function startedPaymentId(subId: string, periodEnd: Date): Promise<string | null> {
  const sb = supabaseService();
  if (!sb) return null;
  const { data } = await sb
    .from("subscription_renewals")
    .select("payment_id, status")
    .eq("subscription_id", subId)
    .eq("period_end", periodEnd.toISOString())
    .maybeSingle();
  const row = data as { payment_id: string | null; status: string } | null;
  return row && row.status === "pending" ? row.payment_id : null;
}

async function updateRenewal(subId: string, periodEnd: Date, patch: Row): Promise<void> {
  const sb = supabaseService();
  await sb
    ?.from("subscription_renewals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("subscription_id", subId)
    .eq("period_end", periodEnd.toISOString());
}

/** Платёж создан, ответа ещё нет. Запоминаем номер, чтобы потом спросить статус. */
export async function markPending(subId: string, periodEnd: Date, paymentId: string | null): Promise<void> {
  await updateRenewal(subId, periodEnd, { status: "pending", payment_id: paymentId });
}

export async function markSucceeded(subId: string, periodEnd: Date, paymentId: string): Promise<void> {
  await updateRenewal(subId, periodEnd, { status: "succeeded", payment_id: paymentId, error: null });
}

export async function markFailed(
  subId: string,
  periodEnd: Date,
  error: string,
  nextAttemptAt: Date | null,
): Promise<void> {
  await updateRenewal(subId, periodEnd, {
    status: nextAttemptAt ? "failed" : "given_up",
    error: error.slice(0, 300),
    next_attempt_at: nextAttemptAt ? nextAttemptAt.toISOString() : null,
  });
}

/**
 * Продлевает подписку и начисляет кредиты нового периода.
 *
 * ОБА ДЕЙСТВИЯ ИДЕМПОТЕНТНЫ, и это здесь главное:
 *
 * — продление идёт условным UPDATE-ом «сдвинуть, если конец всё ещё
 *   старый». Повтор не находит строки с прежним концом и не двигает
 *   ничего: подписка не уедет на два периода вперёд.
 * — кредиты пишутся с ссылкой на платёж, и перед записью проверяется,
 *   нет ли уже строки с той же ссылкой.
 */
export async function extendSubscription(input: {
  subId: string;
  userId: string;
  fromEnd: Date;
  toEnd: Date;
  paymentId: string;
  credits: number;
}): Promise<boolean> {
  const sb = supabaseService();
  if (!sb) return false;

  const { data } = await sb
    .from("subscriptions")
    .update({ current_period_end: input.toEnd.toISOString(), status: "active" })
    .eq("id", input.subId)
    .eq("current_period_end", input.fromEnd.toISOString())
    .select("id");
  const moved = ((data as Row[] | null) ?? []).length > 0;

  const ref = `payment:${input.paymentId}`;
  const { data: seen } = await sb.from("credits_ledger").select("id").eq("ref", ref).limit(1);
  if (!seen || seen.length === 0) {
    await sb.from("credits_ledger").insert({
      user_id: input.userId,
      delta: input.credits,
      reason: "plan_grant",
      ref,
    });
  }
  return moved;
}

/**
 * Попытки исчерпаны: в бесплатный режим.
 *
 * Доступ и так кончается в конце оплаченного периода — `active_subscription`
 * смотрит на дату, а не на статус. Здесь мы только называем состояние
 * своим именем и снимаем автопродление, чтобы не пытаться снова.
 * Ничего оплаченного при этом не отбирается: кредиты остаются в журнале,
 * сделанные расклады — на своих адресах.
 */
export async function toFreeMode(subId: string): Promise<void> {
  const sb = supabaseService();
  await sb?.from("subscriptions").update({ status: "expired", auto_renew: false }).eq("id", subId);
}

/** Отмечаем, что о списании предупредили, — чтобы не повторяться каждый запуск. */
export async function markWarned(subId: string, periodEnd: Date): Promise<void> {
  const sb = supabaseService();
  await sb?.from("subscriptions").update({ renew_warned_for: periodEnd.toISOString() }).eq("id", subId);
}

/** Почта для чека. Живёт в auth.users, читается сервисным ключом. */
export async function userEmail(userId: string): Promise<string | null> {
  const sb = supabaseService();
  if (!sb) return null;
  const { data } = await sb.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/** Куда написать человеку: привязанные чаты бота. Их может не быть вовсе. */
export async function chatsOfUser(userId: string): Promise<number[]> {
  const sb = supabaseService();
  if (!sb) return [];
  const { data } = await sb
    .from("bot_links")
    .select("chat_id")
    .eq("user_id", userId)
    .eq("blocked", false)
    .is("revoked_at", null)
    .not("chat_id", "is", null);
  const ids = ((data as Array<{ chat_id: number | null }> | null) ?? [])
    .map((r) => r.chat_id)
    .filter((id): id is number => typeof id === "number");
  return [...new Set(ids)];
}

/* ─── кнопка в кабинете ──────────────────────────────────────────── */

export type AutoRenewState = {
  /** механика включена переменной окружения */
  available: boolean;
  /** есть действующая подписка */
  active: boolean;
  autoRenew: boolean;
  /** можно ли вообще списать: способ оплаты сохранён */
  hasMethod: boolean;
  periodEnd: string | null;
  planTitle: string | null;
  amount: number | null;
  /** последняя неудачная попытка, если была */
  lastError: string | null;
};

export async function autoRenewState(userId: string): Promise<Omit<AutoRenewState, "available">> {
  const empty = { active: false, autoRenew: false, hasMethod: false, periodEnd: null, planTitle: null, amount: null, lastError: null };
  const sb = supabaseService();
  if (!sb) return empty;

  const { data } = await sb
    .from("subscriptions")
    .select("id, period, current_period_end, auto_renew, payment_method_id, plans(title, price_month, price_year)")
    .eq("user_id", userId)
    .in("status", ["trial", "active", "past_due"])
    .gt("current_period_end", new Date().toISOString())
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as Row | null;
  if (!row) return empty;
  const plan = (Array.isArray(row.plans) ? row.plans[0] : row.plans) as Row | null;
  const year = String(row.period) === "year";

  const { data: fail } = await sb
    .from("subscription_renewals")
    .select("error, status")
    .eq("subscription_id", String(row.id))
    .in("status", ["failed", "given_up"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    active: true,
    autoRenew: row.auto_renew !== false,
    hasMethod: Boolean(row.payment_method_id),
    periodEnd: String(row.current_period_end),
    planTitle: plan ? String(plan.title) : null,
    amount: plan ? Number(year ? plan.price_year : plan.price_month) : null,
    lastError: (fail as { error: string | null } | null)?.error ?? null,
  };
}

/**
 * Включает и выключает автопродление.
 *
 * Выключение НИЧЕГО НЕ ОТБИРАЕТ: подписка не отменяется, доступ живёт до
 * конца оплаченного периода, кредиты остаются. Меняется ровно одно —
 * следующего списания не будет.
 */
export async function setAutoRenew(userId: string, on: boolean): Promise<boolean> {
  const sb = supabaseService();
  if (!sb) return false;
  const { error } = await sb
    .from("subscriptions")
    .update({ auto_renew: on })
    .eq("user_id", userId)
    .in("status", ["trial", "active", "past_due"])
    .gt("current_period_end", new Date().toISOString());
  return !error;
}
