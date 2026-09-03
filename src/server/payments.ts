import "server-only";

import { randomUUID } from "node:crypto";
import { SITE_URL } from "@/lib/env";
import { supabaseService } from "@/server/supabase";

/**
 * ПЛАТЕЖИ.
 *
 * Провайдер — ЮKassa. Включается переменными YOOKASSA_SHOP_ID и
 * YOOKASSA_SECRET_KEY; без них любая попытка оплаты честно отвечает
 * «оплата подключается» — кнопки не притворяются рабочими.
 *
 * Схема: создаём платёж → редирект на страницу ЮKassa → вебхук
 * payment.succeeded → сервер сверяет платёж по API (не верит телу вебхука)
 * → включает подписку или начисляет кредиты.
 *
 * Для автопродления сохраняем payment_method_id (save_payment_method).
 * Само списание раз в период — отдельная задача (cron), см. README.
 */

export type CheckoutKind = "plan" | "pack";

export type PaymentRequest = {
  userId: string;
  email: string | null;
  kind: CheckoutKind;
  amount: number; // ₽
  description: string;
  metadata: Record<string, string>;
};

export type PaymentResult = { ok: true; redirectUrl: string; paymentId: string } | { ok: false; error: string };

export const PAYMENTS_ENABLED = Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);

const API = "https://api.yookassa.ru/v3";

function authHeader() {
  const token = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString("base64");
  return `Basic ${token}`;
}

export async function createPayment(input: PaymentRequest): Promise<PaymentResult> {
  if (!PAYMENTS_ENABLED) return { ok: false, error: "payments_not_configured" };

  const body = {
    amount: { value: input.amount.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: `${SITE_URL}/checkout/result` },
    description: input.description.slice(0, 128),
    save_payment_method: input.kind === "plan",
    metadata: { ...input.metadata, user_id: input.userId, kind: input.kind },
    receipt: input.email
      ? {
          customer: { email: input.email },
          items: [
            {
              description: input.description.slice(0, 128),
              quantity: "1.00",
              amount: { value: input.amount.toFixed(2), currency: "RUB" },
              vat_code: 1,
              payment_subject: "service",
              payment_mode: "full_payment",
            },
          ],
        }
      : undefined,
  };

  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(), "Idempotence-Key": randomUUID() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `yookassa_${res.status}: ${text.slice(0, 200)}` };
  }
  const data = (await res.json()) as { id: string; confirmation?: { confirmation_url?: string } };
  const url = data.confirmation?.confirmation_url;
  if (!url) return { ok: false, error: "no_confirmation_url" };
  return { ok: true, redirectUrl: url, paymentId: data.id };
}

type YooPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: { value: string; currency: string };
  metadata?: Record<string, string>;
  payment_method?: { id?: string; saved?: boolean; type?: string };
};

/** Сверяем платёж по API — телу вебхука не доверяем. */
export async function fetchPayment(id: string): Promise<YooPayment | null> {
  if (!PAYMENTS_ENABLED) return null;
  const res = await fetch(`${API}/payments/${encodeURIComponent(id)}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) return null;
  return (await res.json()) as YooPayment;
}

/**
 * Применяет успешный платёж: включает подписку или начисляет кредиты.
 * Идемпотентно: повторный вебхук по тому же платежу ничего не дублирует.
 */
export async function applyPayment(p: YooPayment): Promise<{ applied: boolean; reason?: string }> {
  const sb = supabaseService();
  if (!sb) return { applied: false, reason: "no_db" };
  if (p.status !== "succeeded" || !p.paid) return { applied: false, reason: "not_paid" };

  const meta = p.metadata ?? {};
  const userId = meta.user_id;
  if (!userId) return { applied: false, reason: "no_user" };

  // Идемпотентность: платёж уже применён?
  const { data: seen } = await sb.from("credits_ledger").select("id").eq("ref", `payment:${p.id}`).limit(1);
  if (seen && seen.length) return { applied: true, reason: "already" };
  const { data: seenSub } = await sb.from("subscriptions").select("id").eq("provider_ref", `payment:${p.id}`).limit(1);
  if (seenSub && seenSub.length) return { applied: true, reason: "already" };

  if (meta.kind === "pack") {
    const { data: pack } = await sb.from("credit_packs").select("*").eq("id", meta.pack_id).maybeSingle();
    if (!pack) return { applied: false, reason: "no_pack" };
    await sb.from("credits_ledger").insert({ user_id: userId, delta: pack.credits, reason: "pack_purchase", ref: `payment:${p.id}` });
    return { applied: true };
  }

  if (meta.kind === "plan") {
    const { data: plan } = await sb.from("plans").select("*").eq("id", meta.plan_id).maybeSingle();
    if (!plan) return { applied: false, reason: "no_plan" };
    const period = meta.period === "year" ? "year" : "month";
    const end = new Date();
    end.setMonth(end.getMonth() + (period === "year" ? 12 : 1));

    // Старую активную подписку закрываем — новая заменяет
    await sb.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("user_id", userId).in("status", ["trial", "active", "past_due"]);

    await sb.from("subscriptions").insert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      period,
      current_period_end: end.toISOString(),
      provider: "yookassa",
      provider_ref: `payment:${p.id}`,
    });
    // Кредиты тарифа за первый период
    await sb.from("credits_ledger").insert({ user_id: userId, delta: plan.monthly_credits * (period === "year" ? 12 : 1), reason: "plan_grant", ref: `payment:${p.id}` });
    return { applied: true };
  }

  return { applied: false, reason: "unknown_kind" };
}
