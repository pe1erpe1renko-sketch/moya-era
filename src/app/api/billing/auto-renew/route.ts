import { NextResponse } from "next/server";
import { AUTO_RENEW_ENABLED } from "@/lib/env";
import { loadAccess } from "@/server/entitlements";
import { autoRenewState, setAutoRenew } from "@/server/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * АВТОПРОДЛЕНИЕ: СОСТОЯНИЕ И ВЫКЛЮЧАТЕЛЬ.
 *
 * GET  — что показать в кабинете: продлится ли подписка, когда, почём.
 * POST — включить или выключить. { enabled: boolean }
 *
 * ВЫКЛЮЧАТЕЛЬ ОБЯЗАН БЫТЬ ВИДНЫМ И РАБОТАТЬ С ПЕРВОГО НАЖАТИЯ. Это
 * требование и закона, и банка, и в этом же весь смысл: подписка, из
 * которой нельзя выйти в одно нажатие, — это не подписка.
 *
 * Выключение ничего не отбирает. Подписка не отменяется, доступ живёт до
 * конца оплаченного периода, кредиты остаются на счету. Меняется ровно
 * одно: следующего списания не будет.
 */

export async function GET() {
  const access = await loadAccess();
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // В демо базы нет: показывать нечего, и врать «продлится» нельзя.
  if (access.demo) {
    return NextResponse.json({ available: AUTO_RENEW_ENABLED, active: false, autoRenew: false, hasMethod: false, periodEnd: null, planTitle: null, amount: null, lastError: null, demo: true });
  }

  const state = await autoRenewState(access.userId);
  return NextResponse.json({ available: AUTO_RENEW_ENABLED, ...state }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  const access = await loadAccess();
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (access.demo) return NextResponse.json({ error: "demo" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "bad_body" }, { status: 400 });

  const ok = await setAutoRenew(access.userId, body.enabled);
  if (!ok) return NextResponse.json({ error: "failed" }, { status: 500 });

  const state = await autoRenewState(access.userId);
  return NextResponse.json({ available: AUTO_RENEW_ENABLED, ...state });
}
