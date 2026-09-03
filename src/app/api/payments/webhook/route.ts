import { NextResponse } from "next/server";
import { fetchPayment, applyPayment } from "@/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Вебхук ЮKassa: POST { event: 'payment.succeeded', object: { id, ... } }
 * Телу не доверяем: перечитываем платёж по API и только тогда применяем.
 * Адрес вебхука в кабинете ЮKassa: https://<домен>/api/payments/webhook
 */
export async function POST(req: Request) {
  let body: { event?: string; object?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const id = body.object?.id;
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  if (body.event !== "payment.succeeded") return NextResponse.json({ ok: true, ignored: body.event });

  const payment = await fetchPayment(id);
  if (!payment) return NextResponse.json({ ok: false, error: "fetch" }, { status: 502 });

  const result = await applyPayment(payment);
  return NextResponse.json({ ok: result.applied, reason: result.reason ?? null });
}
