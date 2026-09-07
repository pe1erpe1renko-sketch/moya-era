import { NextResponse } from "next/server";
import { loadAccess } from "@/server/entitlements";
import { supabaseService } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/cancel — отменить подписку.
 *
 * ОТМЕНА НИЧЕГО НЕ ОТБИРАЕТ. Статус остаётся «active», и доступ живёт до
 * конца оплаченного периода — так считает и `active_subscription`, и
 * кабинет. Меняются два поля: отметка `canceled_at` и `auto_renew = false`,
 * чтобы задача продления эту подписку больше не трогала. Кредиты на
 * счету, сделанные расклады и разборы остаются.
 *
 * Отменить может только сам человек, свою и действующую: сервисным
 * ключом, но с условием по `user_id` из сессии.
 */
export async function POST() {
  const access = await loadAccess();
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (access.demo) return NextResponse.json({ error: "demo" }, { status: 503 });

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "server not configured" }, { status: 500 });

  const { error } = await sb
    .from("subscriptions")
    .update({ canceled_at: new Date().toISOString(), auto_renew: false })
    .eq("user_id", access.userId)
    .in("status", ["trial", "active", "past_due"])
    .is("canceled_at", null)
    .gt("current_period_end", new Date().toISOString());
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
