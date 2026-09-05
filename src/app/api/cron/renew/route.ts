import { NextResponse } from "next/server";
import { AUTO_RENEW_ENABLED, CRON_SECRET, HAS_BOT, SITE_URL } from "@/lib/env";
import {
  dueForCharge,
  dueForWarning,
  failureText,
  givingUp,
  nextAttemptAt,
  nextPeriodEnd,
  renewalKey,
  renewAmount,
  renewCredits,
  warningText,
  WARN_LEAD_DAYS,
} from "@/lib/billing/renew";
import { chargeSaved, fetchPayment, PAYMENTS_ENABLED } from "@/server/payments";
import {
  chatsOfUser,
  claimAttempt,
  extendSubscription,
  markFailed,
  markPending,
  markSucceeded,
  markWarned,
  startedPaymentId,
  subscriptionsNearEnd,
  toFreeMode,
  userEmail,
  type DueSubscription,
} from "@/server/renewals";
import { sendMessage } from "@/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * АВТОПРОДЛЕНИЕ ПОДПИСКИ — /api/cron/renew
 *
 * ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНО. Без переменной `BILLING_AUTO_RENEW` задача не
 * делает ничего: не предупреждает, не списывает, не отключает. Списывать
 * с сохранённой карты до появления оферты с условиями автосписания
 * нельзя — это требование и закона, и банка, а не осторожность.
 *
 * ЧТО ДЕЛАЕТ, КОГДА ВКЛЮЧЕНО:
 *   за три дня до конца периода — предупреждает (сумма, день, как
 *     отключить). До списания, а не после;
 *   за день до конца — создаёт платёж по сохранённому способу оплаты;
 *   не прошло — повтор через день, потом ещё через три;
 *   три неудачи — честно сообщает и переводит в бесплатный режим.
 *
 * ДВАЖДЫ НЕ СПИШЕТ. Попытка занимается в базе одной транзакцией ДО
 * похода в банк, и у каждой попытки свой ключ идемпотентности: повторный
 * запуск получает от ЮKassa тот же платёж, а не второе списание.
 *
 * ЗАПУСКАЕТСЯ ЧАЩЕ РАЗА В СУТКИ нарочно. Висящий платёж (банк не
 * ответил, потребовалось подтверждение) нужно переспросить, а ключ
 * идемпотентности ЮKassa помнит сутки: раз в день — ровно на границе.
 */

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  if (!AUTO_RENEW_ENABLED) {
    return NextResponse.json({ ok: true, skipped: "автопродление выключено (BILLING_AUTO_RENEW)" });
  }
  if (!PAYMENTS_ENABLED) {
    return NextResponse.json({ ok: true, skipped: "оплата не настроена" });
  }

  const now = new Date();
  // Берём с запасом: и тех, кого предупреждать, и тех, у кого период уже
  // кончился и идёт вторая или третья попытка.
  const subs = await subscriptionsNearEnd(now, WARN_LEAD_DAYS);

  let warned = 0;
  let charged = 0;
  let pending = 0;
  let failed = 0;
  let gaveUp = 0;

  for (const sub of subs) {
    if (dueForWarning(sub, now)) {
      await warn(sub);
      await markWarned(sub.id, sub.periodEnd);
      warned += 1;
    }

    if (!dueForCharge(sub, now)) continue;

    const attempt = await claimAttempt(sub);
    if (attempt === 0) continue; // уже продлено, ещё рано или попытки исчерпаны

    const result = await charge(sub, attempt);

    if (result.status === "pending") {
      await markPending(sub.id, sub.periodEnd, result.paymentId);
      pending += 1;
      continue;
    }

    if (result.status === "succeeded") {
      await extendSubscription({
        subId: sub.id,
        userId: sub.userId,
        fromEnd: sub.periodEnd,
        toEnd: nextPeriodEnd(sub.periodEnd, sub.period, sub.anchorDay),
        paymentId: result.paymentId,
        credits: renewCredits({ monthly_credits: sub.plan.monthlyCredits }, sub.period),
      });
      await markSucceeded(sub.id, sub.periodEnd, result.paymentId);
      charged += 1;
      continue;
    }

    const next = nextAttemptAt(attempt, now);
    await markFailed(sub.id, sub.periodEnd, result.error, next);
    if (givingUp(attempt)) {
      await toFreeMode(sub.id);
      await tell(sub, failureText({ planTitle: sub.plan.title, periodEnd: sub.periodEnd, siteUrl: SITE_URL }));
      gaveUp += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, looked: subs.length, warned, charged, pending, failed, gaveUp });
}

/**
 * Списание попытки.
 *
 * Если платёж этой попытки уже создан, спрашиваем его состояние, а не
 * создаём заново: ключ идемпотентности ЮKassa живёт сутки, и повторный
 * POST после этого срока был бы вторым списанием.
 */
async function charge(sub: DueSubscription, attempt: number) {
  const started = await startedPaymentId(sub.id, sub.periodEnd);
  if (started) {
    const p = await fetchPayment(started);
    if (!p) return { status: "pending", paymentId: started } as const;
    if (p.status === "succeeded" && p.paid) return { status: "succeeded", paymentId: p.id } as const;
    if (p.status === "pending" || p.status === "waiting_for_capture") {
      return { status: "pending", paymentId: p.id } as const;
    }
    return { status: "failed", paymentId: p.id, error: `status_${p.status}` } as const;
  }

  const amount = renewAmount({ price_month: sub.plan.priceMonth, price_year: sub.plan.priceYear }, sub.period);
  return chargeSaved({
    paymentMethodId: sub.paymentMethodId as string,
    amount,
    description: `Продление подписки «${sub.plan.title}»`,
    email: await userEmail(sub.userId),
    metadata: { user_id: sub.userId, kind: "plan", plan_id: sub.planId, period: sub.period, renewal: "1" },
    idempotenceKey: renewalKey(sub.id, sub.periodEnd, attempt),
  });
}

async function warn(sub: DueSubscription) {
  const amount = renewAmount({ price_month: sub.plan.priceMonth, price_year: sub.plan.priceYear }, sub.period);
  await tell(sub, warningText({ planTitle: sub.plan.title, amount, periodEnd: sub.periodEnd, siteUrl: SITE_URL }));
}

/**
 * Сообщение человеку.
 *
 * Живой канал у нас один — телеграм, и он есть не у всех. Тем, у кого
 * его нет, предупреждение видно в кабинете: там оно стоит постоянно, с
 * датой, суммой и кнопкой отключения, а не появляется на день.
 * Почтовой рассылки в проекте пока нет вовсе — это в приёмку.
 */
async function tell(sub: DueSubscription, text: string) {
  if (!HAS_BOT) return;
  for (const chatId of await chatsOfUser(sub.userId)) {
    await sendMessage(chatId, text);
  }
}

function guard(req: Request): NextResponse | null {
  if (!CRON_SECRET) return null;
  if (req.headers.get("authorization") === `Bearer ${CRON_SECRET}`) return null;
  return NextResponse.json({ error: "нет подписи" }, { status: 401 });
}
