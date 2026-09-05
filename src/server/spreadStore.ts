import "server-only";

import { randomInt } from "node:crypto";
import { SPREADS, type DrawnCard, type SpreadId } from "@/lib/tarot";
import { randomCode } from "@/lib/shortCode";
import { isSpreadCode, SPREAD_CODE_LENGTH } from "@/lib/tarot/spreadUrl";
import { supabaseService } from "@/server/supabase";

/**
 * ХРАНИЛИЩЕ РАСКЛАДОВ И ЦЕНЫ.
 *
 * Цены читаются из базы, рядом с тарифами: их меняют UPDATE-ом. В коде
 * остаются запасные — чтобы расклады работали до первого наполнения
 * таблицы и чтобы отсутствие строки не превращалось в бесплатный
 * расклад.
 */

/**
 * Новый код расклада.
 *
 * Источник — `crypto.randomInt`, а не `Math.random`: по коду открывается
 * личный вопрос человека, и предсказуемая последовательность означала бы
 * чужие расклады, найденные перебором.
 */
export function newSpreadCode(random?: () => number): string {
  return randomCode(SPREAD_CODE_LENGTH, random ?? (() => randomInt(0, 1_000_000) / 1_000_000));
}

export type StoredSpread = {
  code: string;
  kind: SpreadId;
  title: string;
  question: string;
  cards: DrawnCard[];
  body: string;
  credits: number;
  createdAt: string;
  userId: string | null;
};

/** Что известно про вид расклада: почём и продаётся ли вообще. */
export type SpreadOffer = { credits: number; active: boolean };

/**
 * Цены и доступность всех видов — одним запросом.
 *
 * Основа — список из кода, а база только уточняет: нет строки, нет базы
 * или стоит ноль — остаётся запасная цена. Пропавшая строка не должна
 * превращать расклад в бесплатный, а лишняя строка в базе — заводить вид
 * расклада, которого нет в коде: позиций у него взяться неоткуда.
 */
export async function spreadOffers(): Promise<Record<SpreadId, SpreadOffer>> {
  const out = {} as Record<SpreadId, SpreadOffer>;
  for (const s of SPREADS) out[s.id] = { credits: s.credits, active: true };

  const sb = supabaseService();
  if (!sb) return out;

  const { data } = await sb.from("spread_types").select("id, credits, active");
  for (const r of (data as Array<{ id: string; credits: number; active: boolean }> | null) ?? []) {
    const id = String(r.id) as SpreadId;
    if (!out[id]) continue;
    const credits = Number(r.credits);
    out[id] = { credits: credits > 0 ? credits : out[id].credits, active: r.active !== false };
  }
  return out;
}

/** То же про один вид — перед списанием. */
export async function spreadOffer(kind: SpreadId): Promise<SpreadOffer> {
  return (await spreadOffers())[kind];
}

function toSpread(r: Record<string, unknown>): StoredSpread {
  return {
    code: String(r.code),
    kind: String(r.kind) as SpreadId,
    title: String(r.title),
    question: String(r.question),
    cards: (r.cards as DrawnCard[]) ?? [],
    body: String(r.body ?? ""),
    credits: Number(r.credits ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    userId: (r.user_id as string | null) ?? null,
  };
}

/** Создаёт расклад до генерации: код нужен ссылкой в возврате кредитов. */
export async function createSpread(input: Omit<StoredSpread, "createdAt">): Promise<boolean> {
  const sb = supabaseService();
  if (!sb) return false;
  const { error } = await sb.from("spreads").insert({
    code: input.code,
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    question: input.question,
    cards: input.cards,
    body: input.body,
    credits: input.credits,
  });
  return !error;
}

/** Дописывает готовый текст. */
export async function saveSpreadBody(code: string, body: string): Promise<void> {
  const sb = supabaseService();
  await sb?.from("spreads").update({ body }).eq("code", code);
}

/** Убирает расклад, за который не удалось написать текст. */
export async function dropSpread(code: string): Promise<void> {
  const sb = supabaseService();
  await sb?.from("spreads").delete().eq("code", code);
}

export async function loadSpread(code: string): Promise<StoredSpread | null> {
  if (!isSpreadCode(code)) return null;
  const sb = supabaseService();
  if (!sb) return null;
  const { data } = await sb.from("spreads").select("*").eq("code", code).maybeSingle();
  return data ? toSpread(data as Record<string, unknown>) : null;
}

/**
 * Строка истории: без карт и без текста.
 *
 * Списку в кабинете нужны только вопрос и дата, а текстов там до
 * полусотни — тянуть их целиком ради заголовков значит гонять по сети
 * десятки тысяч знаков, которые никто не прочтёт.
 */
export type SpreadSummary = {
  code: string;
  kind: SpreadId;
  title: string;
  question: string;
  credits: number;
  createdAt: string;
};

/** История раскладов человека — от новых к старым. */
export async function spreadsOfUser(userId: string, limit = 50): Promise<SpreadSummary[]> {
  const sb = supabaseService();
  if (!sb) return [];
  const { data } = await sb
    .from("spreads")
    .select("code, kind, title, question, credits, created_at")
    .eq("user_id", userId)
    .neq("body", "")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as Array<Record<string, unknown>> | null) ?? []).map((r) => ({
    code: String(r.code),
    kind: String(r.kind) as SpreadId,
    title: String(r.title),
    question: String(r.question),
    credits: Number(r.credits ?? 0),
    createdAt: String(r.created_at ?? ""),
  }));
}
