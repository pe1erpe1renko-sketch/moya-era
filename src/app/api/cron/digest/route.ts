import { NextResponse } from "next/server";
import { batchSize, digestButtons, isDue, localParts, receivesDigest, SEND_GAP_MS, showsInvite } from "@/lib/bot";
import { CRON_SECRET, HAS_BOT, SITE_URL } from "@/lib/env";
import { allDigestKeysForDay, buildDigest, cachedTexts } from "@/server/botDigest";
import { linksToSend, markBlocked, markDay, recordDigest } from "@/server/botStore";
import { peopleByIds } from "@/server/botPeople";
import { sendMessage } from "@/server/telegram";
import { moscowDay } from "@/lib/tarot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * УТРЕННЯЯ РАССЫЛКА — /api/cron/digest
 *
 * Запускается часто и коротко. Кому слать, решает догоняющее правило:
 * сводка полагается, если по местным часам человека уже восемь утра, а
 * сегодняшняя ещё не уходила. Поэтому пропущенный запуск не теряет
 * никого — следующий его наверстает, — и пояса со сдвигом на полчаса не
 * выпадают.
 *
 * ТЕКСТЫ ЧИТАЮТСЯ ОДИН РАЗ НА ВЕСЬ ЗАПУСК. Их готовит отдельная задача
 * заранее; здесь только чтение из кэша. Ключей на сутки — пятьдесят три,
 * и тянуть их на каждого подписчика было бы расточительством.
 *
 * ТЕМП ОТПРАВКИ ниже телеграмовского предела: попасть в блокировку за
 * превышение значит не доставить сводку никому.
 *
 * ЗАБЛОКИРОВАЛ БОТА — помечаем и больше не берём в очередь. Иначе
 * мёртвые чаты копились бы и однажды съели всё время запуска.
 */

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  if (!HAS_BOT) return NextResponse.json({ ok: true, skipped: "бот выключен" });

  const now = new Date();
  // Времени берём с запасом на чтение базы и на последнюю запись.
  const budget = batchSize(200_000);
  const candidates = await linksToSend(budget);

  const due = candidates.filter((l) => receivesDigest(l) && isDue({ tz: l.tz, lastSentDay: l.lastSentDay }, now));
  if (due.length === 0) return NextResponse.json({ ok: true, due: 0 });

  const people = await peopleByIds(due.map((l) => l.personId));
  const texts = await cachedTexts(allDigestKeysForDay(moscowDay(now)));

  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const link of due) {
    const person = people.get(link.personId);
    if (!person) continue;

    const digest = await buildDigest(
      { birthDate: person.birthDate, name: person.name, topics: link.topics },
      now,
      texts,
    );
    // Все направления выключены — сообщения нет. Но день отмечаем, иначе
    // такой человек будет попадать в очередь каждый запуск.
    if (!digest) {
      // День отмечаем, но в архив ничего не кладём: пустых сводок там
      // быть не должно. Без отметки такой человек попадал бы в очередь
      // каждый запуск и занимал место живых.
      await markDay(link.id, localParts(now, link.tz).date);
      continue;
    }

    const result = await sendMessage(
      link.chatId as number,
      digest.body,
      digestButtons(SITE_URL, person.birthDate, showsInvite(link.sentCount)),
    );

    if (result.ok) {
      await recordDigest(link, digest.day, digest.body);
      sent += 1;
    } else if (result.blocked) {
      await markBlocked(link.id);
      blocked += 1;
    } else {
      failed += 1;
      // Слишком часто — дальше в этом запуске не идём: следующий
      // наверстает, а долбиться в закрытую дверь смысла нет.
      if (result.retryAfter) break;
    }

    await pause(SEND_GAP_MS);
  }

  return NextResponse.json({ ok: true, due: due.length, sent, blocked, failed });
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guard(req: Request): NextResponse | null {
  if (!CRON_SECRET) return null;
  if (req.headers.get("authorization") === `Bearer ${CRON_SECRET}`) return null;
  return NextResponse.json({ error: "нет подписи" }, { status: 401 });
}
