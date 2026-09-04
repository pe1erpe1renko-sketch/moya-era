import { NextResponse } from "next/server";
import { answerNatalSlots, natalAccess, resolveNatalChart } from "@/server/natalTexts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/natal
 * { date: '1990-07-26', time: '09:00' | null, placeId: 524901 | null,
 *   slots: ['natal_body_sign_sun', ...] }
 *
 * Отдаёт тексты вопросов натальной карты. Карта строится заново на сервере,
 * доступ проверяется здесь же: закрытый вопрос вернётся как { locked: true }
 * без текста.
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
  const slots = Array.isArray(body.slots) ? body.slots.map(String).slice(0, 40) : [];
  if (slots.length === 0) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const chart = resolveNatalChart({ date, time, placeId });
  if (!chart) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { unlocked, reason } = await natalAccess(date);
  const answers = await answerNatalSlots(chart, slots, { unlocked });

  return NextResponse.json(
    { unlocked, reason, answers },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
