import { NextResponse } from "next/server";
import { answerHdSlots, hdAccess, resolveHdChart } from "@/server/hdTexts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/humandesign
 * { date, time, placeId, slots: ['hd_type', 'hd_channel_20_34', ...] }
 *
 * Отдаёт тексты вопросов бодиграфа. Карта строится заново на сервере,
 * доступ проверяется здесь: закрытый вопрос вернётся как { locked: true }.
 */
export async function POST(req: Request) {
  let body: { date?: string; time?: string | null; placeId?: number | null; slots?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const date = String(body.date ?? "");
  const time = body.time === null || body.time === undefined ? null : String(body.time);
  const placeId = body.placeId ? Number(body.placeId) : null;
  const slots = Array.isArray(body.slots) ? body.slots.map(String).slice(0, 60) : [];
  if (slots.length === 0) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const chart = resolveHdChart({ date, time, placeId });
  if (!chart) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { unlocked, reason } = await hdAccess(date);
  const answers = await answerHdSlots(chart, slots, { unlocked });

  return NextResponse.json({ unlocked, reason, answers }, { headers: { "Cache-Control": "private, no-store" } });
}
