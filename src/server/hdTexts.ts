import "server-only";

import {
  CENTERS,
  buildHumanDesignChart,
  findChannel,
  findHdSlot,
  hdBriefSlots,
  hdSections,
  type HdSlot,
  type HumanDesignChart,
} from "@/lib/humandesign";
import { getTexts, type SlotContext, type TextResult } from "@/server/content";
import { loadAccess, accessUnlocks } from "@/server/entitlements";
import { placeById } from "@/server/places";

/**
 * Тексты дизайна человека. Устроено как у натальной карты: карта строится
 * заново на сервере, из данных клиента берутся только дата, время и
 * идентификатор места, доступ решается здесь.
 *
 * Бесплатно (решение заказчика): тип и стратегия. Авторитет, профиль,
 * центры, каналы, ворота и крест — по подписке.
 */

export type HdRequest = { date: string; time: string | null; placeId: number | null };
export type HdLockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type HdAnswer =
  | { slotId: string; locked: true }
  | { slotId: string; locked: false; key: string; text: string; source: TextResult["source"] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function resolveHdChart(req: HdRequest): HumanDesignChart | null {
  if (!DATE_RE.test(req.date)) return null;
  if (req.time !== null && !TIME_RE.test(req.time)) return null;
  const [y, m, d] = req.date.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  if (y < 1900 || y > new Date().getUTCFullYear()) return null;

  const place = req.placeId ? placeById(req.placeId) : null;
  return buildHumanDesignChart({
    date: req.date,
    time: req.time,
    tz: place?.tz ?? null,
    latitude: place?.lat ?? null,
    longitude: place?.lon ?? null,
    placeName: place?.label ?? null,
  });
}

export async function hdAccess(date: string): Promise<{ unlocked: boolean; reason: HdLockReason | null; demo: boolean }> {
  const access = await loadAccess();
  const unlocked = accessUnlocks(access, [date]);
  let reason: HdLockReason | null = null;
  if (!unlocked) {
    if (!access.userId) reason = "not_logged_in";
    else if (!access.plan) reason = "no_subscription";
    else reason = "person_not_added";
  }
  return { unlocked, reason, demo: access.demo };
}

function contextFor(slot: HdSlot, chart: HumanDesignChart): SlotContext | null {
  const base = { key: slot.key, slotLabel: slot.label };

  if (slot.kind === "brief_center" && slot.center) {
    return {
      ...base,
      kind: "hd_brief_center",
      center: slot.center,
      defined: chart.definedCenters.includes(slot.center),
    };
  }

  if (slot.kind === "type") return { ...base, kind: "hd_type", type: chart.type.id };
  if (slot.kind === "strategy") return { ...base, kind: "hd_strategy", type: chart.type.id };
  if (slot.kind === "authority") return { ...base, kind: "hd_authority", authority: chart.authority.id };
  if (slot.kind === "profile") return { ...base, kind: "hd_profile", profile: chart.profile };

  if (slot.kind === "center" && slot.center) {
    return {
      ...base,
      kind: "hd_center",
      center: slot.center,
      defined: chart.definedCenters.includes(slot.center),
    };
  }

  if (slot.kind === "channel" && slot.channel) {
    const channel = findChannel(slot.channel.a, slot.channel.b);
    if (!channel) return null;
    return { ...base, kind: "hd_channel", a: channel.a, b: channel.b, name: channel.name };
  }

  if (slot.kind === "gate" && slot.gate) {
    if (!chart.gates.includes(slot.gate)) return null;
    return { ...base, kind: "hd_gate", gate: slot.gate };
  }

  if (slot.kind === "cross") {
    return { ...base, kind: "hd_cross", angle: chart.cross.angle, gates: [...chart.cross.gates] };
  }

  return null;
}

export async function answerHdSlots(
  chart: HumanDesignChart,
  slotIds: string[],
  { unlocked, allowGenerate = true }: { unlocked: boolean; allowGenerate?: boolean },
): Promise<HdAnswer[]> {
  const items = slotIds
    .map((slotId) => {
      const slot = findHdSlot(slotId, chart);
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

  return items.flatMap((x): HdAnswer[] => {
    if (x.locked) return [{ slotId: x.slotId, locked: true }];
    if (!x.ctx) return [];
    const t = byKey.get(x.ctx.key);
    return [{ slotId: x.slotId, locked: false, key: x.ctx.key, text: t?.text ?? "", source: t?.source ?? "placeholder" }];
  });
}

/** Идентификаторы коротких абзацев — для страницы по дате. */
export function briefHdSlotIds(chart: HumanDesignChart): string[] {
  return hdBriefSlots(chart).map((s) => s.id);
}

/** Короткая сводка карты для витрины и кабинета. */
export function hdSummary(chart: HumanDesignChart) {
  return {
    type: chart.type.name,
    strategy: chart.type.strategy,
    authority: chart.authority.name,
    profile: chart.profile,
    definedCenters: chart.definedCenters.map((c) => CENTERS[c].name),
    channels: chart.channels.length,
    sections: hdSections(chart).length,
  };
}
