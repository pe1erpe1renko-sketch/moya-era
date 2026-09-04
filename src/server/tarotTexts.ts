import "server-only";

import {
  briefSlot,
  buildDayCard,
  findTarotSlot,
  taroContextFor,
  tarotSections,
  type DayCard,
  type TaroSlotContext,
} from "@/lib/tarot";
import { getTexts, type SlotContext, type TextResult } from "@/server/content";
import { loadAccess, accessUnlocks } from "@/server/entitlements";

/**
 * Тексты карты дня.
 *
 * Устроено как у остальных систем: карта считается заново на сервере, из
 * данных клиента берётся только дата рождения, доступ решается здесь.
 * Замок нельзя обойти, дёрнув API напрямую.
 *
 * СЕГОДНЯШНИЙ ДЕНЬ КЛИЕНТ НЕ ЗАДАЁТ. Иначе кто угодно попросил бы карту
 * на любое число и получил бы всю историю карт разом — ту самую, которая
 * обещана по подписке.
 *
 * Бесплатно: сама карта, её название и короткая справка. Разбор «эта
 * карта на фоне вашей карты рождения» — по подписке.
 */

export type TarotLockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type TarotAnswer =
  | { slotId: string; locked: true }
  | { slotId: string; locked: false; key: string; text: string; source: TextResult["source"] };

/** Карта дня по дате рождения на сегодня. null, если дата негодная. */
export function resolveDayCard(date: string): DayCard | null {
  const card = buildDayCard(date);
  if (!card) return null;
  const year = Number(date.slice(0, 4));
  if (year < 1900 || year > new Date().getUTCFullYear()) return null;
  return card;
}

export async function tarotAccess(date: string): Promise<{
  unlocked: boolean;
  reason: TarotLockReason | null;
  demo: boolean;
}> {
  const access = await loadAccess();
  const unlocked = accessUnlocks(access, [date]);
  let reason: TarotLockReason | null = null;
  if (!unlocked) {
    if (!access.userId) reason = "not_logged_in";
    else if (!access.plan) reason = "no_subscription";
    else reason = "person_not_added";
  }
  return { unlocked, reason, demo: access.demo };
}

export async function answerTarotSlots(
  card: DayCard,
  slotIds: string[],
  { unlocked, allowGenerate = true }: { unlocked: boolean; allowGenerate?: boolean },
): Promise<TarotAnswer[]> {
  const items = slotIds
    .map((slotId) => {
      const slot = findTarotSlot(card, slotId);
      if (!slot) return null;
      const locked = !slot.free && !unlocked;
      return { slotId, locked, ctx: locked ? null : taroContextFor(slot, card) };
    })
    .filter((x): x is { slotId: string; locked: boolean; ctx: TaroSlotContext | null } => x !== null);

  const open = items.filter((x) => !x.locked && x.ctx);
  const texts = await getTexts(
    open.map((x) => x.ctx as SlotContext),
    { allowGenerate },
  );
  const byKey = new Map(texts.map((t) => [t.key, t]));

  return items.flatMap((x): TarotAnswer[] => {
    if (x.locked) return [{ slotId: x.slotId, locked: true }];
    if (!x.ctx) return [];
    const t = byKey.get(x.ctx.key);
    return [{ slotId: x.slotId, locked: false, key: x.ctx.key, text: t?.text ?? "", source: t?.source ?? "placeholder" }];
  });
}

/** Идентификаторы бесплатных позиций. */
export function freeTarotSlotIds(card: DayCard): string[] {
  return [briefSlot(card).id];
}

/** Все вопросы разбора — для подсчёта в интерфейсе. */
export function tarotSlotIds(card: DayCard): string[] {
  return tarotSections(card).flatMap((s) => s.slots.map((x) => x.id));
}
