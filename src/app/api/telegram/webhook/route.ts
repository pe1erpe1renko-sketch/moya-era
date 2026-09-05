import { NextResponse } from "next/server";
import {
  botLink,
  BUTTONS,
  claim,
  digestDate,
  isBotCode,
  isKnownZone,
  normalizeTopics,
  receivesDigest,
  REPLIES,
  toggleTopic,
  BOT_TOPICS,
  ZONES,
  zoneLabel,
  type BotTopic,
} from "@/lib/bot";
import { BOT_NAME, BOT_WEBHOOK_SECRET, HAS_BOT, SITE_URL } from "@/lib/env";
import { answerCallback, editMessage, sendMessage, type Button } from "@/server/telegram";
import {
  bindLink,
  digestArchive,
  linkByCode,
  linksOfChat,
  setActive,
  setTopics,
  setZone,
  type LinkRow,
} from "@/server/botStore";
import { isoToChartUrlDate } from "@/lib/chartUrl";
import { personBirth } from "@/server/botPeople";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ВЕБХУК ТЕЛЕГРАМА — /api/telegram/webhook
 *
 * Бот живёт на маршруте самого сайта: отдельного сервиса нет, база и
 * тексты общие, программистам уходит один репозиторий.
 *
 * НЕТ ТОКЕНА — БОТ ВЫКЛЮЧЕН. Отвечаем «ок» и ничего не делаем: телеграм
 * не должен считать адрес сломанным и слать повторы, а сайт при этом
 * работает как обычно.
 *
 * КАЖДЫЙ ЗАПРОС ПОДПИСАН. Телеграм передаёт секрет заголовком
 * X-Telegram-Bot-Api-Secret-Token — тем самым, что задан при установке
 * вебхука. Без проверки адрес мог бы дёрнуть кто угодно и, например,
 * отписать чужой чат.
 *
 * ОТВЕЧАЕМ ВСЕГДА 200. Телеграм повторяет запрос при любом другом коде,
 * а повтор здесь означает второе сообщение человеку. Ошибки пишем в
 * журнал, но наружу отдаём «принято».
 */

type Update = {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number } };
};

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: Request) {
  if (!HAS_BOT) return ok();
  if (BOT_WEBHOOK_SECRET && req.headers.get("x-telegram-bot-api-secret-token") !== BOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "нет подписи" }, { status: 401 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return ok();
  }

  try {
    if (update.message) await onMessage(update.message.chat.id, (update.message.text ?? "").trim());
    else if (update.callback_query) await onCallback(update.callback_query);
  } catch (e) {
    console.error("[bot]", (e as Error).message);
  }
  return ok();
}

/* ─── сообщения ─────────────────────────────────────────────────── */

async function onMessage(chatId: number, text: string) {
  const [command, argument] = text.split(/\s+/, 2);

  if (command === "/start") {
    if (argument && isBotCode(argument)) return onStart(chatId, argument);
    const mine = await linksOfChat(chatId);
    if (mine.length > 0) return sendMessage(chatId, REPLIES.alreadyYours, await mainButtons(chatId));
    return sendMessage(chatId, REPLIES.hello, [[{ text: BUTTONS.fullReading, url: `${SITE_URL}/matrica-sudby` }]]);
  }

  const mine = await linksOfChat(chatId);
  if (mine.length === 0) {
    return sendMessage(chatId, REPLIES.hello, [[{ text: BUTTONS.fullReading, url: `${SITE_URL}/matrica-sudby` }]]);
  }

  if (command === "/stop") return unsubscribe(chatId, mine);
  if (command === "/settings") return sendMessage(chatId, REPLIES.settings, topicButtons(mine[0]));
  if (command === "/zone") return sendMessage(chatId, REPLIES.zonePrompt, zoneButtons());
  if (command === "/archive") return sendArchive(chatId);

  return sendMessage(chatId, REPLIES.unknownCommand, await mainButtons(chatId));
}

async function onStart(chatId: number, code: string) {
  const link = await linkByCode(code);
  const verdict = claim(link, chatId);

  if (!verdict.ok) {
    const text =
      verdict.reason === "taken" ? REPLIES.taken : verdict.reason === "revoked" ? REPLIES.revoked : REPLIES.unknown;
    return sendMessage(chatId, text);
  }
  if (verdict.kind === "already_yours") {
    return sendMessage(chatId, REPLIES.alreadyYours, await mainButtons(chatId));
  }

  // Занять ссылку пытаемся условным запросом: если в ту же секунду
  // нажали двое, база пропустит одного, второй получит отказ.
  const bound = await bindLink(code, chatId);
  if (!bound) return sendMessage(chatId, REPLIES.taken);

  const name = link ? await personName(link) : null;
  return sendMessage(chatId, REPLIES.bound(name), await mainButtons(chatId));
}

async function unsubscribe(chatId: number, links: LinkRow[]) {
  await Promise.all(links.map((l) => setActive(l.id, false)));
  return sendMessage(chatId, REPLIES.unsubscribed, [[{ text: BUTTONS.subscribe, data: "sub:on" }]]);
}

async function sendArchive(chatId: number) {
  const rows = await digestArchive(chatId, 7);
  if (rows.length === 0) return sendMessage(chatId, REPLIES.noDigestYet);
  const body = rows.map((r) => `${digestDate(r.day)}\n${r.body}`).join("\n\n———\n\n");
  return sendMessage(chatId, body);
}

/* ─── кнопки ────────────────────────────────────────────────────── */

async function onCallback(q: NonNullable<Update["callback_query"]>) {
  const chatId = q.message?.chat.id;
  const data = q.data ?? "";
  if (!chatId) return answerCallback(q.id);

  const links = await linksOfChat(chatId);
  if (links.length === 0) return answerCallback(q.id);
  const link = links[0];

  if (data.startsWith("topic:")) {
    const topic = data.slice(6);
    if (!BOT_TOPICS.some((t) => t.id === topic)) return answerCallback(q.id);
    const next = toggleTopic(link.topics, topic as BotTopic);
    await Promise.all(links.map((l) => setTopics(l.id, next)));
    await answerCallback(q.id);
    const updated = { ...link, topics: next };
    const text = next.length === 0 ? REPLIES.allTopicsOff : REPLIES.settings;
    return editMessage(chatId, q.message!.message_id, text, topicButtons(updated));
  }

  if (data.startsWith("zone:")) {
    const tz = data.slice(5);
    if (!isKnownZone(tz)) return answerCallback(q.id);
    await Promise.all(links.map((l) => setZone(l.id, tz)));
    await answerCallback(q.id);
    return editMessage(chatId, q.message!.message_id, REPLIES.zoneSet(zoneLabel(tz)));
  }

  if (data === "sub:off") {
    await answerCallback(q.id);
    return unsubscribe(chatId, links);
  }
  if (data === "sub:on") {
    await Promise.all(links.map((l) => setActive(l.id, true)));
    await answerCallback(q.id);
    return sendMessage(chatId, REPLIES.resubscribed, await mainButtons(chatId));
  }
  if (data === "settings") {
    await answerCallback(q.id);
    return sendMessage(chatId, REPLIES.settings, topicButtons(link));
  }
  if (data === "zone") {
    await answerCallback(q.id);
    return sendMessage(chatId, REPLIES.zonePrompt, zoneButtons());
  }
  if (data === "archive") {
    await answerCallback(q.id);
    return sendArchive(chatId);
  }
  return answerCallback(q.id);
}

function topicButtons(link: LinkRow): Button[][] {
  const on = normalizeTopics(link.topics);
  return [
    ...BOT_TOPICS.map((t) => [{ text: `${on.includes(t.id) ? "✓" : "○"} ${t.label} · ${t.hint}`, data: `topic:${t.id}` }]),
  ];
}

function zoneButtons(): Button[][] {
  const rows: Button[][] = [];
  for (let i = 0; i < ZONES.length; i += 2) {
    rows.push(ZONES.slice(i, i + 2).map((z) => ({ text: z.label, data: `zone:${z.tz}` })));
  }
  return rows;
}

async function mainButtons(chatId: number): Promise<Button[][]> {
  const links = await linksOfChat(chatId);
  const live = links.some(receivesDigest);
  return [
    [{ text: BUTTONS.settings, data: "settings" }, { text: BUTTONS.zone, data: "zone" }],
    [{ text: BUTTONS.archive, data: "archive" }],
    [{ text: live ? BUTTONS.unsubscribe : BUTTONS.subscribe, data: live ? "sub:off" : "sub:on" }],
  ];
}

/* ─── имя человека ──────────────────────────────────────────────── */

async function personName(link: { personId: string }): Promise<string | null> {
  const person = await personBirth(link.personId);
  return person?.name ?? null;
}

/** Кнопки под сводкой. Собираются здесь же, чтобы адреса были едиными. */
export function digestButtons(birthDate: string, invite: boolean): Button[][] {
  const url = isoToChartUrlDate(birthDate);
  const rows: Button[][] = [
    [{ text: BUTTONS.reading, url: `${SITE_URL}/matrica/${url}` }],
    [{ text: BUTTONS.mentor, url: `${SITE_URL}/nastavnik` }],
    // Картинку в сообщение не вкладываем: ежедневная картинка каждому —
    // это лишний трафик при той же пользе. Только по нажатию.
    [{ text: BUTTONS.image, url: `${SITE_URL}/taro/${url}` }],
  ];
  if (invite) rows.push([{ text: BUTTONS.fullReading, url: `${SITE_URL}/matrica-sudby` }]);
  return rows;
}

/** Имя бота для ссылок привязки. Пусто — ссылку показать нельзя. */
export function linkFor(code: string): string | null {
  return BOT_NAME ? botLink(BOT_NAME, code) : null;
}
