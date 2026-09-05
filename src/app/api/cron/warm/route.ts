import { NextResponse } from "next/server";
import { moscowDay } from "@/lib/tarot";
import { allDigestKeysForDay, cachedTexts } from "@/server/botDigest";
import { warmDigestTexts } from "@/server/botWarm";
import { CRON_SECRET, HAS_BOT } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * ПОДГОТОВКА ТЕКСТОВ НА ДЕНЬ — /api/cron/warm
 *
 * Запускается ЗАРАНЕЕ, до начала рассылки. Тексты на день генерируются
 * один раз, а не в момент отправки каждому: иначе первые полторы тысячи
 * человек по очереди ждали бы нейросеть, а сводка приходила бы к обеду.
 *
 * Ключей на сутки ровно 53: двадцать два аркана дня (аркан дня выводится
 * из аркана периода, поэтому больше и не бывает), двадцать два аркана
 * таро и девять чисел дня. Тарошные и числовые пишутся один раз навсегда
 * и после первого дня уже лежат в базе — каждый день догенерируются
 * только двадцать два аркана дня. Это и есть обещанный потолок расхода:
 * он не зависит от числа подписчиков.
 */

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  if (!HAS_BOT) return NextResponse.json({ ok: true, skipped: "бот выключен" });

  const day = moscowDay();
  const keys = allDigestKeysForDay(day);
  const before = Object.keys(await cachedTexts(keys)).length;
  const written = await warmDigestTexts(keys);

  return NextResponse.json({ ok: true, day, keys: keys.length, had: before, written });
}

/** Задачу по расписанию Vercel подписывает заголовком; чужим сюда нельзя. */
function guard(req: Request): NextResponse | null {
  if (!CRON_SECRET) return null;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${CRON_SECRET}`) return null;
  return NextResponse.json({ error: "нет подписи" }, { status: 401 });
}
