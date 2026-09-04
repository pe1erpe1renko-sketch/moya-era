import "server-only";

import { buildNatalChart, type NatalChart } from "@/lib/natal";
import { buildHumanDesignChart, type HumanDesignChart } from "@/lib/humandesign";
import {
  buildComposite,
  buildSynastry,
  compositeSections,
  findPairSlot,
  matrixBriefSlot,
  synastrySections,
  viewById,
  type Composite,
  type PairSection,
  type PairSlot,
  type PairViewId,
  type Synastry,
} from "@/lib/pair";
import { computeReading, calcTypeBySlug, buildReadingSections, type Reading } from "@/lib/matrix";
import { getTexts, type SlotContext, type TextResult } from "@/server/content";
import { loadAccess, accessUnlocks } from "@/server/entitlements";
import { peopleLeft } from "@/lib/access";
import { placeById } from "@/server/places";

/**
 * Тексты разбора пары: матрица, синастрия и композит.
 *
 * Как и у одиночных систем, расчёт делается заново на сервере — из данных
 * клиента берутся только даты, время и идентификаторы мест. Замок нельзя
 * обойти, дёрнув API напрямую.
 *
 * Бесплатно (решение заказчика от 04.09.2026): схема пары и один абзац о
 * главном по каждому из трёх взглядов. Ссылкой на совместимость делятся со
 * вторым человеком, и он должен увидеть живой результат, а не замок.
 */

export type PairPerson = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM или null */
  time: string | null;
  /** id места в GeoNames или null */
  placeId: number | null;
};

export type PairRequest = { first: PairPerson; second: PairPerson; view: PairViewId };

export type PairLockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type PairAnswer =
  | { slotId: string; locked: true }
  | { slotId: string; locked: false; key: string; text: string; source: TextResult["source"] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validPerson(p: PairPerson): boolean {
  if (!DATE_RE.test(p.date)) return false;
  if (p.time !== null && !TIME_RE.test(p.time)) return false;
  const [y, m, d] = p.date.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return false;
  return y >= 1900 && y <= new Date().getUTCFullYear();
}

function birthInput(p: PairPerson) {
  const place = p.placeId ? placeById(p.placeId) : null;
  return {
    date: p.date,
    time: p.time,
    tz: place?.tz ?? null,
    latitude: place?.lat ?? null,
    longitude: place?.lon ?? null,
    placeName: place?.label ?? null,
  };
}

export type ResolvedPair = {
  view: PairViewId;
  first: PairPerson;
  second: PairPerson;
  sections: PairSection[];
  /** расчёт выбранного взгляда — для схемы и подписей */
  synastry: Synastry | null;
  composite: Composite | null;
  matrix: Reading | null;
};

/** Строит выбранный взгляд. null, если данные негодные. */
export function resolvePair(req: PairRequest): ResolvedPair | null {
  if (!validPerson(req.first) || !validPerson(req.second)) return null;
  const view = viewById(req.view).id;

  if (view === "synastry") {
    const synastry = buildSynastry(
      buildNatalChart(birthInput(req.first)) as NatalChart,
      buildNatalChart(birthInput(req.second)) as NatalChart,
    );
    return { view, first: req.first, second: req.second, sections: synastrySections(synastry), synastry, composite: null, matrix: null };
  }

  if (view === "composite") {
    const composite = buildComposite(
      buildHumanDesignChart(birthInput(req.first)) as HumanDesignChart,
      buildHumanDesignChart(birthInput(req.second)) as HumanDesignChart,
    );
    return { view, first: req.first, second: req.second, sections: compositeSections(composite), synastry: null, composite, matrix: null };
  }

  const type = calcTypeBySlug("sovmestimost");
  if (!type) return null;
  let matrix: Reading;
  try {
    matrix = computeReading(type, [req.first.date, req.second.date]);
  } catch {
    return null;
  }
  return {
    view,
    first: req.first,
    second: req.second,
    // У матрицы свои разделы и свой контентный слой; здесь только
    // бесплатный абзац о главном — остальное идёт через /api/content/text.
    sections: [
      {
        id: "pair_brief",
        title: "Что вас связывает",
        lead: "Аркан пары — задача, которая возникает именно в этом сочетании.",
        slots: [matrixBriefSlot(matrix.matrix.core.C)],
      },
    ],
    synastry: null,
    composite: null,
    matrix,
  };
}

/** Открыт ли полный разбор пары и почему нет. */
export async function pairAccess(dates: string[]): Promise<{
  unlocked: boolean;
  reason: PairLockReason | null;
  demo: boolean;
  /** сколько людей ещё можно добавить в тариф; null — без ограничений */
  peopleLeft: number | null;
  loggedIn: boolean;
}> {
  const access = await loadAccess();
  const unlocked = accessUnlocks(access, dates);
  let reason: PairLockReason | null = null;
  if (!unlocked) {
    if (!access.userId) reason = "not_logged_in";
    else if (!access.plan) reason = "no_subscription";
    else reason = "person_not_added";
  }
  return { unlocked, reason, demo: access.demo, peopleLeft: peopleLeft(access), loggedIn: Boolean(access.userId) };
}

function contextFor(slot: PairSlot, resolved: ResolvedPair): SlotContext | null {
  const base = { key: slot.key, slotLabel: slot.label };

  if (slot.id === "syn_brief" && resolved.synastry) {
    const lead = resolved.synastry.leading;
    return { ...base, kind: "syn_brief", a: lead?.a ?? null, b: lead?.b ?? null, aspect: lead?.aspect.key ?? null };
  }

  if (slot.kind === "syn_aspect" && resolved.synastry) {
    const found = resolved.synastry.aspects.find(
      (x) => `syn_aspect_${x.a}_${x.b}_${x.aspect.key}` === slot.id,
    );
    if (!found) return null;
    return { ...base, kind: "syn_aspect", a: found.a, b: found.b, aspect: found.aspect.key };
  }

  if (slot.kind === "syn_house" && slot.overlay) {
    // Ключ один на оба направления: текст о планете одного в доме другого.
    return { ...base, kind: "syn_house", body: slot.overlay.bodyName, house: slot.overlay.house };
  }

  if (slot.kind === "brief" && resolved.composite) {
    return { ...base, kind: "hdc_brief", first: resolved.composite.first.type.id, second: resolved.composite.second.type.id };
  }

  if (slot.kind === "hdc_type" && resolved.composite) {
    return { ...base, kind: "hdc_type", first: resolved.composite.first.type.id, second: resolved.composite.second.type.id };
  }

  if (slot.kind === "hdc_definition" && resolved.composite) {
    return { ...base, kind: "hdc_definition", definition: resolved.composite.definition };
  }

  if (slot.kind === "hdc_channel" && resolved.composite) {
    const found = resolved.composite.channels.find((c) => `hdc_channel_${c.channel.a}_${c.channel.b}` === slot.id);
    if (!found) return null;
    return { ...base, kind: "hdc_channel", a: found.channel.a, b: found.channel.b, connection: found.kind };
  }

  if (slot.kind === "brief" && resolved.matrix) {
    return { ...base, kind: "pair_brief_matrix", arcana: resolved.matrix.matrix.core.C };
  }

  return null;
}

export async function answerPairSlots(
  resolved: ResolvedPair,
  slotIds: string[],
  { unlocked, allowGenerate = true }: { unlocked: boolean; allowGenerate?: boolean },
): Promise<PairAnswer[]> {
  const items = slotIds
    .map((slotId) => {
      const slot = findPairSlot(resolved.sections, slotId);
      if (!slot) return null;
      const locked = !slot.free && !unlocked;
      return { slotId, locked, ctx: locked ? null : contextFor(slot, resolved) };
    })
    .filter((x): x is { slotId: string; locked: boolean; ctx: SlotContext | null } => x !== null);

  const open = items.filter((x) => !x.locked && x.ctx);
  const texts = await getTexts(
    open.map((x) => x.ctx as SlotContext),
    { allowGenerate },
  );
  const byKey = new Map(texts.map((t) => [t.key, t]));

  return items.flatMap((x): PairAnswer[] => {
    if (x.locked) return [{ slotId: x.slotId, locked: true }];
    if (!x.ctx) return [];
    const t = byKey.get(x.ctx.key);
    return [{ slotId: x.slotId, locked: false, key: x.ctx.key, text: t?.text ?? "", source: t?.source ?? "placeholder" }];
  });
}

/** Идентификаторы бесплатных вопросов взгляда. */
export function freePairSlotIds(resolved: ResolvedPair): string[] {
  return resolved.sections.flatMap((s) => s.slots.filter((x) => x.free).map((x) => x.id));
}

/** Разделы матричного разбора пары — рядом с бесплатным абзацем. */
export function matrixPairSections(resolved: ResolvedPair, unlocked: boolean) {
  const type = calcTypeBySlug("sovmestimost");
  if (!type || !resolved.matrix) return [];
  return buildReadingSections(type.sections, resolved.matrix.matrix, { unlocked });
}
