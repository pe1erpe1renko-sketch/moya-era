import "server-only";

import {
  ASPECTS,
  briefSlots,
  buildNatalChart,
  chartBody,
  findNatalSlot,
  natalSections,
  natalTextKey,
  pointName,
  type ChartInput,
  type NatalChart,
  type NatalSlot,
} from "@/lib/natal";
import { signAt } from "@/lib/ephemeris";
import { getTexts, type SlotContext, type TextResult } from "@/server/content";
import { loadAccess, accessUnlocks } from "@/server/entitlements";
import { placeById } from "@/server/places";

/**
 * Тексты натальной карты. Здесь сходятся карта, доступ и ключи текстов —
 * единственное место, где решается, что человек может прочитать. Замок
 * нельзя обойти, дёрнув API напрямую: карта строится заново на сервере,
 * из данных клиента берутся только дата, время и идентификатор места.
 *
 * Бесплатно (решение заказчика): Солнце по дате, Луна и асцендент — если
 * известны время и место. Остальное по подписке, как в матрице.
 */

export type NatalRequest = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM или null */
  time: string | null;
  /** id места в GeoNames; координаты и пояс сервер берёт из справочника */
  placeId: number | null;
};

export type NatalLockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type NatalAnswer =
  | { slotId: string; locked: true }
  | { slotId: string; locked: false; key: string; text: string; source: TextResult["source"] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Разбирает запрос клиента и строит карту. null, если данные негодные. */
export function resolveNatalChart(req: NatalRequest): NatalChart | null {
  if (!DATE_RE.test(req.date)) return null;
  if (req.time !== null && !TIME_RE.test(req.time)) return null;
  const [y, m, d] = req.date.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  if (y < 1900 || y > new Date().getUTCFullYear()) return null;

  const place = req.placeId ? placeById(req.placeId) : null;
  const input: ChartInput = {
    date: req.date,
    time: req.time,
    tz: place?.tz ?? null,
    latitude: place?.lat ?? null,
    longitude: place?.lon ?? null,
    placeName: place?.label ?? null,
  };
  return buildNatalChart(input);
}

/** Открыт ли полный разбор по этой дате и почему нет. */
export async function natalAccess(date: string): Promise<{ unlocked: boolean; reason: NatalLockReason | null; demo: boolean }> {
  const access = await loadAccess();
  const unlocked = accessUnlocks(access, [date]);
  let reason: NatalLockReason | null = null;
  if (!unlocked) {
    if (!access.userId) reason = "not_logged_in";
    else if (!access.plan) reason = "no_subscription";
    else reason = "person_not_added";
  }
  return { unlocked, reason, demo: access.demo };
}

/** Контекст генерации для вопроса. null — позиция не определена. */
function contextFor(slot: NatalSlot, chart: NatalChart): SlotContext | null {
  const key = natalTextKey(slot, chart);
  if (!key) return null;

  if (slot.kind === "brief" && slot.body) {
    const body = chartBody(chart, slot.body);
    if (!body) return null;
    return { key, kind: "natal_brief", slotLabel: slot.label, bodyName: body.name, sign: body.sign.key };
  }

  if (slot.kind === "body_sign" && slot.body) {
    const body = chartBody(chart, slot.body);
    if (!body) return null;
    return {
      key,
      kind: "natal_body_sign",
      slotLabel: slot.label,
      bodyName: body.name,
      sign: body.sign.key,
      retrograde: body.retrograde,
    };
  }

  if (slot.kind === "body_house" && slot.body) {
    const body = chartBody(chart, slot.body);
    if (!body?.house) return null;
    return { key, kind: "natal_body_house", slotLabel: slot.label, bodyName: body.name, house: body.house };
  }

  if (slot.kind === "asc_sign" || slot.kind === "mc_sign") {
    const angle = slot.kind === "asc_sign" ? chart.asc : chart.mc;
    if (!angle) return null;
    return {
      key,
      kind: "natal_angle_sign",
      slotLabel: slot.label,
      angle: slot.kind === "asc_sign" ? "asc" : "mc",
      sign: signAt(angle.longitude).key,
    };
  }

  if (slot.kind === "aspect" && slot.aspect) {
    const found = chart.aspects.find(
      (a) => a.a === slot.aspect!.a && a.b === slot.aspect!.b && a.aspect.key === slot.aspect!.key,
    );
    if (!found) return null;
    return {
      key,
      kind: "natal_aspect",
      slotLabel: `${ASPECTS[found.aspect.key].name}: ${pointName(found.a)} и ${pointName(found.b)}`,
      a: found.a,
      b: found.b,
      aspect: found.aspect.key,
    };
  }

  return null;
}

/** Тексты для набора вопросов карты: замки — как есть, остальное из слоя контента. */
export async function answerNatalSlots(
  chart: NatalChart,
  slotIds: string[],
  { unlocked, allowGenerate = true }: { unlocked: boolean; allowGenerate?: boolean },
): Promise<NatalAnswer[]> {
  const items = slotIds
    .map((slotId) => {
      const slot = findNatalSlot(slotId, chart);
      if (!slot) return null;
      const locked = !slot.free && !unlocked;
      const ctx = locked ? null : contextFor(slot, chart);
      return { slotId, locked, ctx };
    })
    .filter((x): x is { slotId: string; locked: boolean; ctx: SlotContext | null } => x !== null);

  const open = items.filter((x) => !x.locked && x.ctx);
  const texts = await getTexts(
    open.map((x) => x.ctx as SlotContext),
    { allowGenerate },
  );
  const byKey = new Map(texts.map((t) => [t.key, t]));

  return items.flatMap((x): NatalAnswer[] => {
    if (x.locked) return [{ slotId: x.slotId, locked: true }];
    if (!x.ctx) return []; // позиция не определена — вопроса просто нет
    const t = byKey.get(x.ctx.key);
    return [{ slotId: x.slotId, locked: false, key: x.ctx.key, text: t?.text ?? "", source: t?.source ?? "placeholder" }];
  });
}

/** Идентификаторы коротких абзацев — для страницы по дате. */
export function briefNatalSlotIds(chart: NatalChart): string[] {
  return briefSlots(chart)
    .filter((s) => natalTextKey(s, chart) !== null)
    .map((s) => s.id);
}

/** Идентификаторы бесплатных вопросов этой карты. */
export function freeNatalSlotIds(chart: NatalChart): string[] {
  return natalSections(chart)
    .flatMap((s) => s.slots)
    .filter((s) => s.free && natalTextKey(s, chart) !== null)
    .map((s) => s.id);
}
