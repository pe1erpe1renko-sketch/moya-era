import { NextResponse } from "next/server";
import { answerPairSlots, pairAccess, resolvePair, type PairPerson } from "@/server/pairTexts";
import { viewById } from "@/lib/pair";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/content/pair
 * { first: { date, time, placeId }, second: {…}, view: 'synastry',
 *   slots: ['syn_brief', …] }
 *
 * Отдаёт тексты разбора пары. Расчёт делается заново на сервере, доступ
 * проверяется здесь же: закрытый вопрос вернётся как { locked: true } без
 * текста. Ответ содержит и остаток мест в тарифе — по нему интерфейс
 * решает, предлагать ли сохранить второго человека.
 */

function person(raw: unknown): PairPerson {
  const p = (raw ?? {}) as { date?: unknown; time?: unknown; placeId?: unknown };
  return {
    date: String(p.date ?? ""),
    time: p.time === null || p.time === undefined ? null : String(p.time),
    placeId: p.placeId ? Number(p.placeId) : null,
  };
}

export async function POST(req: Request) {
  let body: { first?: unknown; second?: unknown; view?: string; slots?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const first = person(body.first);
  const second = person(body.second);
  const view = viewById(body.view).id;
  const slots = Array.isArray(body.slots) ? body.slots.map(String).slice(0, 40) : [];
  if (slots.length === 0) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const resolved = resolvePair({ first, second, view });
  if (!resolved) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const access = await pairAccess([first.date, second.date]);
  const answers = await answerPairSlots(resolved, slots, { unlocked: access.unlocked });

  return NextResponse.json(
    {
      unlocked: access.unlocked,
      reason: access.reason,
      peopleLeft: access.peopleLeft,
      loggedIn: access.loggedIn,
      answers,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
