import "server-only";

import {
  buildReadingSections,
  computeReading,
  calcTypeByAnySlug,
  weekdayName,
  POINT_SLOTS,
  resolvePath,
  textKey,
  type CalcType,
  type Reading,
} from "@/lib/matrix";
import type { SlotContext } from "@/server/content";
import { getTexts, type TextResult } from "@/server/content";
import { loadAccess, accessUnlocks, type ServerAccess } from "@/server/entitlements";

/**
 * Собирает контексты генерации для запрошенных вопросов разбора и решает,
 * что из этого можно отдать. Единственное место, где сходятся тип разбора,
 * даты, доступ и ключи текстов — чтобы замок нельзя было обойти,
 * дёрнув API напрямую.
 *
 * Страница разбора рендерится статически (без cookies) и получает только
 * бесплатные тексты; всё, что зависит от пользователя, идёт через API.
 */

const PAIR_KIND: Record<string, "love" | "parentChild" | "business"> = {
  sovmestimost: "love",
  "mama-rebenok": "parentChild",
  biznes: "business",
};

const YEAR_ASPECT: Record<string, "main" | "focus" | "risk" | "money" | "love"> = {
  year_arcana: "main",
  year_focus: "focus",
  year_risk: "risk",
  year_money: "money",
  year_love: "love",
};

export type SlotAnswer =
  | { slotId: string; locked: true }
  | { slotId: string; locked: false; key: string; text: string; source: TextResult["source"] };

export type ResolvedReading = { type: CalcType; reading: Reading };

export function resolveReading(typeSlug: string, isoDates: string[], now = new Date()): ResolvedReading | null {
  const type = calcTypeByAnySlug(typeSlug);
  if (!type) return null;
  if (isoDates.length !== (type.pair ? 2 : 1)) return null;
  try {
    return { type, reading: computeReading(type, isoDates, now) };
  } catch {
    return null;
  }
}

export type LockReason = "no_subscription" | "person_not_added" | "not_logged_in";

/** Открыт ли разбор для текущего пользователя и почему нет. */
export async function readingAccess(isoDates: string[]): Promise<{ unlocked: boolean; reason: LockReason | null; access: ServerAccess }> {
  const access = await loadAccess();
  const unlocked = accessUnlocks(access, isoDates);
  let reason: LockReason | null = null;
  if (!unlocked) {
    if (!access.userId) reason = "not_logged_in";
    else if (!access.plan) reason = "no_subscription";
    else reason = "person_not_added";
  }
  return { unlocked, reason, access };
}

function contextFor(resolved: ResolvedReading, slotId: string, unlocked: boolean): { ctx: SlotContext; locked: boolean } | null {
  const { type, reading } = resolved;
  const matrix = reading.matrix;

  // Точки октаграммы — короткие подсказки, открыты всем.
  const point = POINT_SLOTS.find((p) => p.id === slotId);
  if (point) {
    const arcana = resolvePath(matrix, point.path);
    return {
      locked: false,
      ctx: { kind: "point", key: textKey(point.id, arcana), slotLabel: point.label, arcana, sectionTitle: "Схема" },
    };
  }

  // «Аркан дня» есть в разделах только у полной матрицы, а карточка
  // «Сегодня» стоит на всех личных разборах — деньги, детская, карма и
  // прочих. Отвечаем по слоту полной матрицы: без этого карточка не
  // получала ответа и запрашивала текст без конца, десятки раз в секунду.
  if (reading.kind === "single" && slotId === "day_energy") {
    const full = calcTypeByAnySlug("matrica");
    const daily = full
      ? buildReadingSections(full.sections, matrix, { unlocked })
          .flatMap((s) => s.slots)
          .find((s) => s.id === "day_energy")
      : undefined;
    if (daily) {
      const t = reading.matrix.today;
      return {
        locked: false,
        ctx: {
          key: daily.key,
          slotLabel: daily.label,
          arcana: t.dayArcana,
          sectionTitle: "Сегодня",
          kind: "daily",
          periodArcana: t.arcana,
          weekday: weekdayName(t.date),
          date: t.date,
        },
      };
    }
  }

  const sections = buildReadingSections(type.sections, matrix, { unlocked });
  for (const section of sections) {
    const slot = section.slots.find((s) => s.id === slotId);
    if (!slot) continue;
    const src = type.sections.find((s) => s.id === section.id);
    if (!src) continue;

    const base = { key: slot.key, slotLabel: slot.label, arcana: slot.arcana, sectionTitle: section.title };
    if (slot.locked) return { locked: true, ctx: base };

    if (reading.kind === "single" && slotId === "day_energy") {
      const t = reading.matrix.today;
      return {
        locked: false,
        ctx: { ...base, kind: "daily", arcana: t.dayArcana, periodArcana: t.arcana, weekday: weekdayName(t.date), date: t.date },
      };
    }

    if (reading.kind === "single" && src.yearly && YEAR_ASPECT[slotId]) {
      const t = reading.matrix.today;
      return {
        locked: false,
        ctx: { ...base, kind: "year", yearArcana: slot.arcana, periodArcana: t.arcana, year: t.year, aspect: YEAR_ASPECT[slotId] },
      };
    }

    const pairKind = PAIR_KIND[type.id];
    if (type.pair && pairKind) {
      return {
        locked: false,
        ctx: { ...base, kind: "pair", pairKind, sectionTitle: section.title, sectionLead: section.lead, slotLabel: slot.label, arcana: slot.arcana },
      };
    }

    return {
      locked: false,
      ctx: { ...base, kind: "section", sectionTitle: section.title, sectionLead: section.lead, slotLabel: slot.label, arcana: slot.arcana },
    };
  }
  return null;
}

/** Тексты для набора вопросов: замки — как есть, остальное — из слоя контента. */
export async function answerSlots(
  resolved: ResolvedReading,
  slotIds: string[],
  { unlocked, allowGenerate = true }: { unlocked: boolean; allowGenerate?: boolean },
): Promise<SlotAnswer[]> {
  const items = slotIds
    .map((slotId) => ({ slotId, r: contextFor(resolved, slotId, unlocked) }))
    .filter((x): x is { slotId: string; r: { ctx: SlotContext; locked: boolean } } => x.r !== null);

  const open = items.filter((x) => !x.r.locked);
  const texts = await getTexts(
    open.map((x) => x.r.ctx),
    { allowGenerate },
  );
  const byKey = new Map(texts.map((t) => [t.key, t]));

  return items.map((x): SlotAnswer => {
    if (x.r.locked) return { slotId: x.slotId, locked: true };
    const t = byKey.get(x.r.ctx.key);
    return { slotId: x.slotId, locked: false, key: x.r.ctx.key, text: t?.text ?? "", source: t?.source ?? "placeholder" };
  });
}
