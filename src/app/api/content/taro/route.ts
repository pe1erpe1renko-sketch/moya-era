import { NextResponse } from "next/server";
import { answerTarotSlots, resolveDayCard, tarotAccess } from "@/server/tarotTexts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/taro
 * { date: '1990-07-26', slots: ['taro_on', …] }
 *
 * Сегодняшний день сюда не передаётся: его определяет сервер по
 * московским часам. Иначе историю карт можно было бы вычерпать запросами
 * на будущие даты, а она обещана по подписке.
 *
 * Отдаёт тексты разбора карты дня. Карта считается заново на сервере,
 * доступ проверяется здесь же: закрытый вопрос вернётся как
 * { locked: true } без текста.
 */
export async function POST(req: Request) {
  let body: { date?: string; slots?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const date = String(body.date ?? "");
  const slots = Array.isArray(body.slots) ? body.slots.map(String).slice(0, 20) : [];
  if (slots.length === 0) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const card = resolveDayCard(date);
  if (!card) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { unlocked, reason } = await tarotAccess(date);
  const answers = await answerTarotSlots(card, slots, { unlocked });

  return NextResponse.json({ unlocked, reason, answers }, { headers: { "Cache-Control": "private, no-store" } });
}
