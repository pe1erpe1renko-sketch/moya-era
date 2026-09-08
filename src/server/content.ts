import "server-only";

import { SEED_TEXTS, buildPlaceholder } from "@/lib/matrix/seedTexts";
import { buildRequest, PROMPT_VERSION, type RequestCtx } from "@/lib/matrix/prompts";
import { buildNatalRequest, isNatalCtx, NATAL_PROMPT_VERSION, type NatalCtx } from "@/lib/natal/prompts";
import { buildHdRequest, isHdCtx, HD_PROMPT_VERSION, type HdCtx } from "@/lib/humandesign/prompts";
import { buildPairRequest, isPairCtx, PAIR_PROMPT_VERSION, type PairCtx } from "@/lib/pair/prompts";
import { buildNumRequest, isNumCtx, NUM_PROMPT_VERSION, type NumCtx } from "@/lib/numerology/prompts";
import { buildTaroRequest, isTaroCtx, TARO_PROMPT_VERSION, type TaroCtx } from "@/lib/tarot/prompts";
import { supabaseService } from "@/server/supabase";
import { complete, LLM_ENABLED, MODEL_TEXTS } from "@/server/llm";

/**
 * КОНТЕНТНЫЙ СЛОЙ. Прежний макетный contentLayer.js из первой версии удалён.
 *
 * Порядок тот же: кэш в базе → эталонный текст → генерация → заглушка.
 * Отличия от макета: хранилище — таблица matrix_texts в Supabase (пишет
 * только сервис), генерация — через KIE, режим включается ключом LLM_API_KEY.
 *
 * Три защиты сохранены: блокировка от двойной генерации одного ключа,
 * запись только после успеха, версия промпта в каждой строке.
 */

export type TextSource = "cache" | "seed" | "generated" | "placeholder";
export type TextResult = { key: string; text: string; source: TextSource; error?: string };

export type SlotContext = (RequestCtx | NatalCtx | HdCtx | PairCtx | NumCtx | TaroCtx) & {
  key: string;
  slotLabel?: string;
  sectionTitle?: string;
  arcana?: number;
};

/**
 * У матрицы и у натальной карты свои промпты и свои версии: правка одних
 * не должна перегенерировать другие.
 */
function requestFor(ctx: SlotContext) {
  if (isNatalCtx(ctx)) return buildNatalRequest(ctx);
  if (isHdCtx(ctx)) return buildHdRequest(ctx);
  if (isPairCtx(ctx)) return buildPairRequest(ctx);
  if (isNumCtx(ctx)) return buildNumRequest(ctx);
  if (isTaroCtx(ctx)) return buildTaroRequest(ctx);
  return buildRequest(ctx);
}

function versionFor(ctx: SlotContext): number {
  if (isNatalCtx(ctx)) return NATAL_PROMPT_VERSION;
  if (isHdCtx(ctx)) return HD_PROMPT_VERSION;
  if (isPairCtx(ctx)) return PAIR_PROMPT_VERSION;
  if (isNumCtx(ctx)) return NUM_PROMPT_VERSION;
  if (isTaroCtx(ctx)) return TARO_PROMPT_VERSION;
  return PROMPT_VERSION;
}

/* ─── хранилище ─────────────────────────────────────────────────── */

type Row = { key: string; body: string; version: number };

async function readMany(ctxs: SlotContext[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sb = supabaseService();
  if (!sb || ctxs.length === 0) return out;
  const wanted = new Map(ctxs.map((c) => [c.key, versionFor(c)]));
  const { data } = await sb.from("matrix_texts").select("key, body, version").in("key", [...wanted.keys()]);
  for (const row of (data as Row[] | null) ?? []) {
    if (row.version === wanted.get(row.key)) out.set(row.key, row.body);
  }
  return out;
}

async function writeOne(key: string, body: string, model: string, version: number): Promise<void> {
  const sb = supabaseService();
  if (!sb) return;
  await sb.from("matrix_texts").upsert({ key, body, version, model, source: "generated" });
}

/* ─── генерация с блокировкой ───────────────────────────────────── */

const inFlight = new Map<string, Promise<string>>();

function withLock(key: string, task: () => Promise<string>): Promise<string> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = task().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function generate(ctx: SlotContext): Promise<string> {
  const req = requestFor(ctx);
  const user = req.user ?? "";
  const out = await complete({
    model: MODEL_TEXTS,
    system: req.system,
    messages: [{ role: "user", content: user }],
    maxTokens: req.maxTokens,
    temperature: req.temperature,
  });
  await writeOne(ctx.key, out.text, out.model, req.version);
  return out.text;
}

function placeholder(ctx: SlotContext): string {
  // Заглушка не должна врать про то, из чего считается разбор: у
  // нумерологии никаких планет нет, у карты дня — тем более.
  if (isNatalCtx(ctx) || isHdCtx(ctx) || isPairCtx(ctx)) {
    return `${ctx.slotLabel}\n\nЗдесь будет разбор этой позиции. Текст пишется по реальному положению планет в момент вашего рождения.`;
  }
  if (isNumCtx(ctx)) {
    return `${ctx.slotLabel}\n\nЗдесь будет разбор этой позиции. Текст пишется по числам вашей даты рождения.`;
  }
  if (isTaroCtx(ctx)) {
    return `${ctx.slotLabel}\n\nЗдесь будет разбор этой позиции. Текст пишется по аркану сегодняшнего дня и вашему аркану рождения.`;
  }
  return buildPlaceholder({
    slotLabel: ctx.slotLabel ?? "Разбор",
    arcana: ctx.arcana ?? 0,
    sectionTitle: ctx.sectionTitle ?? "",
  });
}

/* ─── главные функции ───────────────────────────────────────────── */

export async function getText(ctx: SlotContext, { allowGenerate = true } = {}): Promise<TextResult> {
  const [result] = await getTexts([ctx], { allowGenerate });
  return result;
}

/**
 * Пакетная выдача: один запрос в базу на все ключи, генерация — только
 * для тех, кого нет ни в кэше, ни в эталонах.
 */
export async function getTexts(ctxs: SlotContext[], { allowGenerate = true } = {}): Promise<TextResult[]> {
  const cached = await readMany(ctxs);

  return Promise.all(
    ctxs.map(async (ctx): Promise<TextResult> => {
      const fromCache = cached.get(ctx.key);
      if (fromCache) return { key: ctx.key, text: fromCache, source: "cache" };

      const seed = SEED_TEXTS[ctx.key];
      if (seed) return { key: ctx.key, text: seed, source: "seed" };

      if (!LLM_ENABLED || !allowGenerate) {
        return { key: ctx.key, text: placeholder(ctx), source: "placeholder" };
      }

      try {
        const text = await withLock(ctx.key, () => generate(ctx));
        return { key: ctx.key, text, source: "generated" };
      } catch (error) {
        return {
          key: ctx.key,
          text: placeholder(ctx),
          source: "placeholder",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );
}

/** Сколько текстов уже в базе — для админки и скрипта наполнения. */
export async function countTexts(): Promise<number> {
  const sb = supabaseService();
  if (!sb) return 0;
  const { count } = await sb.from("matrix_texts").select("key", { count: "exact", head: true });
  return count ?? 0;
}
