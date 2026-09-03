#!/usr/bin/env node
/**
 * НАПОЛНЕНИЕ БАЗЫ ТЕКСТОВ — разово, до запуска.
 *
 * Генерирует все тексты разборов (слот × аркан) и складывает в matrix_texts.
 * Повторный запуск безопасен: то, что уже есть с текущей PROMPT_VERSION,
 * пропускается. Можно прерывать и продолжать.
 *
 * Запуск:
 *   node scripts/fill-texts.mjs --dry        # только посчитать объём
 *   node scripts/fill-texts.mjs              # генерировать
 *   node scripts/fill-texts.mjs --only points --limit 50
 *
 * Нужны переменные окружения (можно в .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   LLM_API_KEY, LLM_BASE_URL (по умолчанию KIE), LLM_MODEL_TEXTS
 *
 * Объём: 160 слотов × 22 аркана = 3 520 текстов (сферы, парные, финансы,
 * детская, точки схемы). Аркан дня, личный год и образы генерируются
 * лениво по запросу — у них ключи зависят от даты или периода.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { SECTIONS, PAIR_SECTIONS, FINANCE_EXTRA, CHILD_SECTIONS, POINT_SLOTS, textKey } from "../src/lib/matrix/contentPositions.js";
import { buildRequest, PROMPT_VERSION } from "../src/lib/matrix/prompts.js";
import { SEED_TEXTS } from "../src/lib/matrix/seedTexts.js";

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
  return i >= 0 ? args[i + 1] : d;
};
const DRY = flag("dry");
const ONLY = opt("only", "all"); // all | sections | pairs | points
const LIMIT = Number(opt("limit", "0")) || Infinity;
const CONCURRENCY = Number(opt("concurrency", "4"));
const MODEL = process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5";

const brand = (s) => s.replaceAll("«Матрика»", "«Моя Эра»").replaceAll("Матрика", "Моя Эра");

/* ── план ── */
const jobs = [];
const push = (key, ctx, group) => jobs.push({ key, ctx, group });

if (ONLY === "all" || ONLY === "sections") {
  for (const section of [...SECTIONS, ...FINANCE_EXTRA, ...CHILD_SECTIONS]) {
    if (section.daily || section.yearly) continue;
    for (const slot of section.slots) {
      if (slot.daily) continue;
      if (slot.path.startsWith("today.")) continue;
      for (let a = 1; a <= 22; a++) {
        push(textKey(slot.id, a), { kind: "section", sectionTitle: section.title, sectionLead: section.lead, slotLabel: slot.label, arcana: a }, "sections");
      }
    }
  }
}
if (ONLY === "all" || ONLY === "pairs") {
  for (const [pairKind, sections] of Object.entries(PAIR_SECTIONS)) {
    for (const section of sections) {
      for (const slot of section.slots) {
        for (let a = 1; a <= 22; a++) {
          push(textKey(slot.id, a), { kind: "pair", pairKind, sectionTitle: section.title, sectionLead: section.lead, slotLabel: slot.label, arcana: a }, "pairs");
        }
      }
    }
  }
}
if (ONLY === "all" || ONLY === "points") {
  for (const p of POINT_SLOTS) {
    for (let a = 1; a <= 22; a++) push(textKey(p.id, a), { kind: "point", slotLabel: p.label, arcana: a }, "points");
  }
}

// дубликаты ключей (один слот может встречаться в нескольких типах) — оставляем один
const seen = new Set();
const unique = jobs.filter((j) => (seen.has(j.key) ? false : (seen.add(j.key), true))).filter((j) => !SEED_TEXTS[j.key]);

console.log(`Всего ключей: ${unique.length} (сфер+тем: ${unique.filter((j) => j.group === "sections").length}, парных: ${unique.filter((j) => j.group === "pairs").length}, точек: ${unique.filter((j) => j.group === "points").length})`);
console.log(`Версия промпта: ${PROMPT_VERSION}, модель: ${MODEL}`);

/* ── база ── */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(DRY ? 0 : 1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

// что уже есть
const existing = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("matrix_texts").select("key, version").range(from, from + 999);
  if (error) {
    console.error("Ошибка чтения базы:", error.message);
    process.exit(1);
  }
  for (const r of data ?? []) if (r.version === PROMPT_VERSION) existing.add(r.key);
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
  const req = buildRequest(job.ctx);
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      system: brand(req.system),
      messages: [{ role: "user", content: req.user }],
    });
    const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!text) throw new Error("пустой ответ");
    inTok += res.usage?.input_tokens ?? 0;
    outTok += res.usage?.output_tokens ?? 0;
    const { error } = await sb.from("matrix_texts").upsert({ key: job.key, body: text, version: PROMPT_VERSION, model: res.model, source: "generated" });
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
