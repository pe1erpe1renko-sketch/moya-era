import { NextResponse } from "next/server";
import { urlDateToIso } from "@/lib/matrix";
import { resolveReading, readingAccess, answerSlots } from "@/server/readingTexts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/text
 * { type: 'matrica', dates: ['13-07-1998'], slots: ['money_channel_main', ...] }
 *
 * Отдаёт тексты для вопросов разбора. Доступ проверяется здесь же:
 * закрытый вопрос вернётся как { locked: true } без текста.
 */
export async function POST(req: Request) {
  let body: { type?: string; dates?: string[]; slots?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const type = String(body.type ?? "");
  const dates = Array.isArray(body.dates) ? body.dates.map((d) => urlDateToIso(String(d))) : [];
  const slots = Array.isArray(body.slots) ? body.slots.map(String).slice(0, 40) : [];

  if (!type || dates.length === 0 || dates.some((d) => d === null) || slots.length === 0) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const isoDates = dates as string[];

  const resolved = resolveReading(type, isoDates);
  if (!resolved) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { unlocked, reason } = await readingAccess(isoDates);
  const answers = await answerSlots(resolved, slots, { unlocked });
  return NextResponse.json({ unlocked, reason, answers }, { headers: { "Cache-Control": "private, no-store" } });
}
