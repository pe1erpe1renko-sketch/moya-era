import "server-only";

import { SEED_TEXTS, buildPlaceholder } from "@/lib/matrix/seedTexts";
import { buildRequest, PROMPT_VERSION, type RequestCtx } from "@/lib/matrix/prompts";
import { supabaseService } from "@/server/supabase";
import { complete, LLM_ENABLED, MODEL_TEXTS } from "@/server/llm";

/**
 * КОНТЕНТНЫЙ СЛОЙ — боевая версия contentLayer.js.
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

export type SlotContext = RequestCtx & {
  key: string;
  slotLabel?: string;
  sectionTitle?: string;
  arcana?: number;
};

/* ─── хранилище ─────────────────────────────────────────────────── */

type Row = { key: string; body: string; version: number };

async function readMany(keys: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const sb = supabaseService();
  if (!sb || keys.length === 0) return out;
  const { data } = await sb.from("matrix_texts").select("key, body, version").in("key", keys);
  for (const row of (data as Row[] | null) ?? []) {
    if (row.version === PROMPT_VERSION) out.set(row.key, row.body);
  }
  return out;
}

async function writeOne(key: string, body: string, model: string): Promise<void> {
  const sb = supabaseService();
  if (!sb) return;
  await sb.from("matrix_texts").upsert({ key, body, version: PROMPT_VERSION, model, source: "generated" });
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
  const req = buildRequest(ctx);
  const user = req.user ?? "";
  const out = await complete({
    model: MODEL_TEXTS,
    system: req.system,
    messages: [{ role: "user", content: user }],
    maxTokens: req.maxTokens,
    temperature: req.temperature,
  });
  await writeOne(ctx.key, out.text, out.model);
  return out.text;
}

function placeholder(ctx: SlotContext): string {
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
  const cached = await readMany(ctxs.map((c) => c.key));

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
