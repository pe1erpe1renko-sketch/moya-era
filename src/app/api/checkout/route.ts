import { NextResponse } from "next/server";
import { loadAccess } from "@/server/entitlements";
import { supabaseService } from "@/server/supabase";
import { createPayment, PAYMENTS_ENABLED } from "@/server/payments";
import { DEFAULT_CREDIT_PACKS, DEFAULT_PLANS } from "@/lib/plansDefault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout
 * { kind: 'plan', planId, period: 'month'|'year' }  |  { kind: 'pack', packId }
 * → { redirectUrl } либо { error: 'payments_not_configured' }
 *
 * Сумма берётся из базы, а не из запроса — клиенту цену не доверяем.
 */
export async function POST(req: Request) {
  let body: { kind?: string; planId?: string; period?: string; packId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const access = await loadAccess();
  if (!access.userId || access.demo) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!PAYMENTS_ENABLED) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "server" }, { status: 500 });

  if (body.kind === "plan") {
    const period = body.period === "year" ? "year" : "month";
    const { data } = await sb.from("plans").select("*").eq("id", body.planId).eq("active", true).maybeSingle();
    const plan = data ?? DEFAULT_PLANS.find((p) => p.id === body.planId);
    if (!plan) return NextResponse.json({ error: "no_plan" }, { status: 404 });
    const amount = period === "year" ? plan.price_year : plan.price_month;
    const result = await createPayment({
      userId: access.userId,
      email: access.email,
      kind: "plan",
      amount,
      description: `Моя Эра · тариф «${plan.title}» · ${period === "year" ? "год" : "месяц"}`,
      metadata: { plan_id: plan.id, period },
    });
    return result.ok ? NextResponse.json({ redirectUrl: result.redirectUrl }) : NextResponse.json({ error: result.error }, { status: 502 });
  }

  if (body.kind === "pack") {
    const { data } = await sb.from("credit_packs").select("*").eq("id", body.packId).eq("active", true).maybeSingle();
    const pack = data ?? DEFAULT_CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) return NextResponse.json({ error: "no_pack" }, { status: 404 });
    const result = await createPayment({
      userId: access.userId,
      email: access.email,
      kind: "pack",
      amount: pack.price,
      description: `Моя Эра · ${pack.credits} кредитов (наставник и расклады)`,
      metadata: { pack_id: pack.id },
    });
    return result.ok ? NextResponse.json({ redirectUrl: result.redirectUrl }) : NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ error: "bad kind" }, { status: 400 });
}
