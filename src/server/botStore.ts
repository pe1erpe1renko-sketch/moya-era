import "server-only";

import { normalizeTopics, type BotLink, type BotTopic } from "@/lib/bot";
import { supabaseService } from "@/server/supabase";

/**
 * ХРАНИЛИЩЕ ПРИВЯЗОК И АРХИВА СВОДОК.
 *
 * Всё сервисным ключом: у чата в телеграме сессии Supabase нет и быть не
 * может — человек мог вообще не заходить на сайт. Проверки доступа
 * делаются в коде выше, по правилам из `lib/bot`.
 *
 * Без Supabase бот выключен, и сюда никто не заходит: демо-заглушки
 * здесь нет намеренно. Привязка без базы бессмысленна — ей негде
 * пережить перезапуск, а обещать человеку ежедневную рассылку и потерять
 * её к утру хуже, чем честно не включаться.
 */

export type LinkRow = BotLink & {
  id: string;
  userId: string;
  personId: string;
  tz: string;
  topics: BotTopic[];
  lastSentDay: string | null;
  sentCount: number;
};

type Raw = Record<string, unknown>;

function toRow(r: Raw): LinkRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    personId: String(r.person_id),
    code: String(r.code),
    chatId: r.chat_id === null || r.chat_id === undefined ? null : Number(r.chat_id),
    revoked: Boolean(r.revoked_at),
    active: r.active !== false,
    blocked: Boolean(r.blocked),
    tz: String(r.tz ?? "Europe/Moscow"),
    topics: normalizeTopics(r.topics as string[] | null),
    lastSentDay: (r.last_sent_day as string | null) ?? null,
    sentCount: Number(r.sent_count ?? 0),
  };
}

/** Все привязки владельца — для списка в боте и в кабинете. */
export async function linksOfOwner(userId: string): Promise<LinkRow[]> {
  const sb = supabaseService();
  if (!sb) return [];
  const { data } = await sb.from("bot_links").select("*").eq("user_id", userId).order("created_at");
  return ((data as Raw[] | null) ?? []).map(toRow);
}

/** Привязка по коду из ссылки. */
export async function linkByCode(code: string): Promise<LinkRow | null> {
  const sb = supabaseService();
  if (!sb) return null;
  const { data } = await sb.from("bot_links").select("*").eq("code", code).maybeSingle();
  return data ? toRow(data as Raw) : null;
}

/** Все привязки этого чата: один чат может вести несколько человек. */
export async function linksOfChat(chatId: number): Promise<LinkRow[]> {
  const sb = supabaseService();
  if (!sb) return [];
  const { data } = await sb.from("bot_links").select("*").eq("chat_id", chatId).order("created_at");
  return ((data as Raw[] | null) ?? []).map(toRow);
}

/** Создаёт заготовку привязки. Чат подставится, когда нажмут «Старт». */
export async function createLink(userId: string, personId: string, code: string): Promise<boolean> {
  const sb = supabaseService();
  if (!sb) return false;
  const { error } = await sb.from("bot_links").insert({ user_id: userId, person_id: personId, code });
  return !error;
}

/**
 * Занимает ссылку за чатом.
 *
 * Условие `chat_id is null` стоит в самом запросе: если два человека
 * нажмут «Старт» одновременно, база пропустит одного, а второй увидит,
 * что строк не изменилось, — и получит отказ. Проверять сначала чтением,
 * а потом писать было бы гонкой.
 */
export async function bindLink(code: string, chatId: number): Promise<boolean> {
  const sb = supabaseService();
  if (!sb) return false;
  const { data } = await sb
    .from("bot_links")
    .update({ chat_id: chatId, bound_at: new Date().toISOString(), active: true, blocked: false })
    .eq("code", code)
    .is("chat_id", null)
    .is("revoked_at", null)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

/** Отзыв владельцем: код гаснет навсегда, чат отписывается. */
export async function revokeLink(id: string, userId: string): Promise<boolean> {
  const sb = supabaseService();
  if (!sb) return false;
  const { error } = await sb
    .from("bot_links")
    .update({ revoked_at: new Date().toISOString(), active: false })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function setActive(id: string, active: boolean): Promise<void> {
  const sb = supabaseService();
  await sb?.from("bot_links").update({ active }).eq("id", id);
}

export async function setTopics(id: string, topics: BotTopic[]): Promise<void> {
  const sb = supabaseService();
  await sb?.from("bot_links").update({ topics }).eq("id", id);
}

export async function setZone(id: string, tz: string): Promise<void> {
  const sb = supabaseService();
  await sb?.from("bot_links").update({ tz }).eq("id", id);
}

/** Пометка «бот заблокирован»: слать больше нечего, очередь не забиваем. */
export async function markBlocked(id: string): Promise<void> {
  const sb = supabaseService();
  await sb?.from("bot_links").update({ blocked: true }).eq("id", id);
}

/** Кому пора слать: живые привязки, которым сегодня ещё не уходило. */
export async function linksToSend(limit: number): Promise<LinkRow[]> {
  const sb = supabaseService();
  if (!sb) return [];
  const { data } = await sb
    .from("bot_links")
    .select("*")
    .not("chat_id", "is", null)
    .is("revoked_at", null)
    .eq("active", true)
    .eq("blocked", false)
    .order("last_sent_day", { ascending: true, nullsFirst: true })
    .limit(limit);
  return ((data as Raw[] | null) ?? []).map(toRow);
}

/** Отмечает отправленную сводку и кладёт её в архив. */
export async function recordDigest(link: LinkRow, day: string, body: string): Promise<void> {
  const sb = supabaseService();
  if (!sb) return;
  await sb
    .from("bot_links")
    .update({ last_sent_day: day, sent_count: link.sentCount + 1 })
    .eq("id", link.id);
  // Архив остаётся у человека навсегда: повтор за тот же день просто
  // игнорируется, чтобы перезапуск задачи не плодил копий.
  await sb
    .from("bot_digests")
    .upsert(
      { user_id: link.userId, person_id: link.personId, chat_id: link.chatId, day, body },
      { onConflict: "chat_id,person_id,day", ignoreDuplicates: true },
    );
}

/** Архив сводок этого чата — от новых к старым. */
export async function digestArchive(chatId: number, limit = 10): Promise<Array<{ day: string; body: string }>> {
  const sb = supabaseService();
  if (!sb) return [];
  const { data } = await sb
    .from("bot_digests")
    .select("day, body")
    .eq("chat_id", chatId)
    .order("day", { ascending: false })
    .limit(limit);
  return ((data as Array<{ day: string; body: string }> | null) ?? []).map((r) => ({ day: String(r.day), body: String(r.body) }));
}
