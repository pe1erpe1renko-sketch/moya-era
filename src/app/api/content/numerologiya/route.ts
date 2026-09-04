import { NextResponse } from "next/server";
import { answerNumerologySlots, numerologyAccess, resolveNumerology } from "@/server/numerologyTexts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/numerologiya
 * { date: '1990-07-26', forYear: 2026, name: 'Пётр Петров',
 *   slots: ['num_brief_path', …] }
 *
 * Имя нужно только для числа судьбы и нигде не сохраняется: оно приходит
 * в запросе, участвует в расчёте и на этом всё.
 *
 * Отдаёт тексты нумерологического разбора. Расчёт делается заново на
 * сервере, доступ проверяется здесь же: закрытый вопрос вернётся как
 * { locked: true } без текста.
 */
export async function POST(req: Request) {
  let body: { date?: string; forYear?: number; name?: string; slots?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const date = String(body.date ?? "");
  const forYear = Number(body.forYear) || undefined;
  const name = typeof body.name === "string" ? body.name.slice(0, 120) : null;
  const slots = Array.isArray(body.slots) ? body.slots.map(String).slice(0, 40) : [];
  if (slots.length === 0) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const chart = resolveNumerology(date, forYear, name);
  if (!chart) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { unlocked, reason } = await numerologyAccess(date);
  const answers = await answerNumerologySlots(chart, slots, { unlocked });

  return NextResponse.json({ unlocked, reason, answers }, { headers: { "Cache-Control": "private, no-store" } });
}
