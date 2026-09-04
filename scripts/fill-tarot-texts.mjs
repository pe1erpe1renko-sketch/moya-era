#!/usr/bin/env node
/**
 * НАПОЛНЕНИЕ ТЕКСТОВ КАРТЫ ДНЯ — разово, до запуска.
 *
 * Складывает тексты в ту же таблицу matrix_texts, ключи начинаются с taro_.
 * Повторный запуск безопасен: то, что уже есть с текущей версией промпта,
 * пропускается.
 *
 * Запуск:
 *   npm run fill-tarot-texts -- --dry            # только посчитать объём
 *   npm run fill-tarot-texts -- --only free      # короткие справки
 *   npm run fill-tarot-texts -- --only pairs --limit 20
 *
 * Бесплатные короткие справки стоит сгенерировать первыми: их видят все
 * посетители и поисковики, и их всего 22.
 *
 * Пар «аркан дня × аркан рождения» 484 — это самая большая группа, и её
 * можно лить фоном: она под замком, и до подписки её никто не увидит.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
// Импортируем конкретные модули, а не общий index: под tsx этот файл
// становится CommonJS, и реэкспорты через `export *` теряют имена.
import { briefSlot, tarotSections } from "../src/lib/tarot/sections.ts";
import { buildTaroRequest, taroContextFor, TARO_PROMPT_VERSION } from "../src/lib/tarot/prompts.ts";

/* ── env ── */
for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const DRY = flag("dry");
const ONLY = opt("only", "all"); // all | free | pairs | days
const LIMIT = Number(opt("limit", "0")) || Infinity;
const CONCURRENCY = Number(opt("concurrency", "4"));
const MODEL = process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5";

const jobs = [];
const push = (key, ctx, group) => jobs.push({ key, ctx, group });
const want = (group) => ONLY === "all" || ONLY === group;

const ARCANA = Array.from({ length: 22 }, (_, i) => i + 1);

/**
 * Задания строятся из тех же позиций разбора, что и страница, — иначе
 * ключи разойдутся и половина текстов ляжет мимо.
 */
const cardFor = (arcanum, birthArcanum) => ({ birth: "1990-07-26", day: "2026-01-01", arcanum, birthArcanum });

if (want("free")) {
  for (const arcanum of ARCANA) {
    const card = cardFor(arcanum, 1);
    const slot = briefSlot(card);
    push(slot.key, taroContextFor(slot, card), "free");
  }
}

if (want("pairs")) {
  for (const arcanum of ARCANA) {
    for (const birthArcanum of ARCANA) {
      const card = cardFor(arcanum, birthArcanum);
      const slot = tarotSections(card)[0].slots.find((s) => s.id === "taro_on");
      push(slot.key, taroContextFor(slot, card), "pairs");
    }
  }
}

if (want("days")) {
  for (const arcanum of ARCANA) {
    const card = cardFor(arcanum, 1);
    for (const slot of tarotSections(card)[0].slots.filter((s) => s.id !== "taro_on")) {
      push(slot.key, taroContextFor(slot, card), "days");
    }
  }
}

const seen = new Set();
const unique = jobs.filter((j) => (seen.has(j.key) ? false : (seen.add(j.key), true)));
const byGroup = unique.reduce((acc, j) => ({ ...acc, [j.group]: (acc[j.group] ?? 0) + 1 }), {});
console.log(`Всего заданий: ${unique.length}`, byGroup);

/* ── база ── */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const existing = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("matrix_texts").select("key, version").range(from, from + 999);
  if (error) {
    console.error("Ошибка чтения базы:", error.message);
    process.exit(1);
  }
  for (const r of data ?? []) if (r.version === TARO_PROMPT_VERSION && r.key.startsWith("taro_")) existing.add(r.key);
  if (!data || data.length < 1000) break;
}
const todo = unique.filter((j) => !existing.has(j.key)).slice(0, LIMIT);
console.log(`В базе уже: ${existing.size}. Осталось сгенерировать: ${todo.length}`);

if (DRY || todo.length === 0) process.exit(0);

/* ── модель ── */
if (!process.env.LLM_API_KEY) {
  console.error("Нет LLM_API_KEY");
  process.exit(1);
}
const client = new Anthropic({
  baseURL: process.env.LLM_BASE_URL ?? "https://api.kie.ai/claude",
  authToken: process.env.LLM_API_KEY,
  apiKey: null,
  maxRetries: 3,
  timeout: 90_000,
});

let done = 0;
let failed = 0;
let inTok = 0;
let outTok = 0;
const started = Date.now();

async function one(job) {
  const req = buildTaroRequest(job.ctx);
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("пустой ответ");
    inTok += res.usage?.input_tokens ?? 0;
    outTok += res.usage?.output_tokens ?? 0;
    const { error } = await sb
      .from("matrix_texts")
      .upsert({ key: job.key, body: text, version: TARO_PROMPT_VERSION, model: res.model, source: "generated" });
    if (error) throw new Error(error.message);
    done += 1;
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${job.key}: ${e.message ?? e}`);
  }
  const n = done + failed;
  if (n % 25 === 0 || n === todo.length) {
    const sec = (Date.now() - started) / 1000;
    console.log(`  ${n}/${todo.length} · ok ${done} · ошибок ${failed} · ${(n / sec).toFixed(2)}/с · токены ${inTok}/${outTok}`);
  }
}

// ограничение KIE: 20 запросов за 10 секунд
let i = 0;
async function worker() {
  while (i < todo.length) {
    const job = todo[i++];
    await one(job);
    await new Promise((r) => setTimeout(r, 600));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Готово: ${done} сгенерировано, ${failed} ошибок, токены ${inTok} вход / ${outTok} выход`);
