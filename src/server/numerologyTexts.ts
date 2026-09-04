import "server-only";

import {
  briefSlots,
  buildNumerology,
  findNumerologySlot,
  numerologySections,
  type NumerologyChart,
  type NumerologySlot,
} from "@/lib/numerology";
import { getTexts, type SlotContext, type TextResult } from "@/server/content";
import { loadAccess, accessUnlocks } from "@/server/entitlements";

/**
 * Тексты нумерологического разбора.
 *
 * Устроено как у остальных систем: расчёт делается заново на сервере, из
 * данных клиента берётся только дата, доступ решается здесь. Замок нельзя
 * обойти, дёрнув API напрямую.
 *
 * Бесплатно (решение заказчика от 04.09.2026): схема чисел и короткая
 * справка по каждому из четырёх чисел. Полные разборы и квадрат
 * Пифагора — по подписке.
 */

export type NumerologyLockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type NumerologyAnswer =
  | { slotId: string; locked: true }
  | { slotId: string; locked: false; key: string; text: string; source: TextResult["source"] };

/** Строит расчёт по дате. null, если дата негодная. */
export function resolveNumerology(date: string, forYear?: number): NumerologyChart | null {
  const chart = buildNumerology(date, forYear);
  if (!chart) return null;
  if (chart.year < 1900 || chart.year > new Date().getUTCFullYear()) return null;
  return chart;
}

export async function numerologyAccess(date: string): Promise<{
  unlocked: boolean;
  reason: NumerologyLockReason | null;
  demo: boolean;
}> {
  const access = await loadAccess();
  const unlocked = accessUnlocks(access, [date]);
  let reason: NumerologyLockReason | null = null;
  if (!unlocked) {
    if (!access.userId) reason = "not_logged_in";
    else if (!access.plan) reason = "no_subscription";
    else reason = "person_not_added";
  }
  return { unlocked, reason, demo: access.demo };
}

function contextFor(slot: NumerologySlot, chart: NumerologyChart): SlotContext | null {
  const base = { key: slot.key, slotLabel: slot.label };

  if (slot.kind === "cell" && slot.cell) {
    return { ...base, kind: "num_cell", digit: slot.cell.digit, count: slot.cell.count };
  }

  // Идентификатор вида num_brief_path или num_path — из него берём число.
  const id = slot.id.replace(/^num_(brief_)?/, "") as "path" | "birthday" | "attitude" | "year";
  const value =
    id === "path" ? chart.path : id === "birthday" ? chart.birthday : id === "attitude" ? chart.attitude : chart.personalYear;

  if (slot.kind === "brief") return { ...base, kind: "num_brief", number: id, value };
  if (slot.kind === "number") return { ...base, kind: "num_number", number: id, value };
  return null;
}

export async function answerNumerologySlots(
  chart: NumerologyChart,
  slotIds: string[],
  { unlocked, allowGenerate = true }: { unlocked: boolean; allowGenerate?: boolean },
): Promise<NumerologyAnswer[]> {
  const items = slotIds
    .map((slotId) => {
      const slot = findNumerologySlot(chart, slotId);
      if (!slot) return null;
      const locked = !slot.free && !unlocked;
      return { slotId, locked, ctx: locked ? null : contextFor(slot, chart) };
    })
    .filter((x): x is { slotId: string; locked: boolean; ctx: SlotContext | null } => x !== null);

  const open = items.filter((x) => !x.locked && x.ctx);
  const texts = await getTexts(
    open.map((x) => x.ctx as SlotContext),
    { allowGenerate },
  );
  const byKey = new Map(texts.map((t) => [t.key, t]));

  return items.flatMap((x): NumerologyAnswer[] => {
    if (x.locked) return [{ slotId: x.slotId, locked: true }];
    if (!x.ctx) return [];
    const t = byKey.get(x.ctx.key);
    return [{ slotId: x.slotId, locked: false, key: x.ctx.key, text: t?.text ?? "", source: t?.source ?? "placeholder" }];
  });
}

/** Идентификаторы бесплатных справок. */
export function freeNumerologySlotIds(chart: NumerologyChart): string[] {
  return briefSlots(chart).map((s) => s.id);
}

/** Все вопросы разбора — для подсчёта в интерфейсе. */
export function numerologySlotIds(chart: NumerologyChart): string[] {
  return numerologySections(chart).flatMap((s) => s.slots.map((x) => x.id));
}
