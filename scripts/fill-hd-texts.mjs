#!/usr/bin/env node
/**
 * НАПОЛНЕНИЕ ТЕКСТОВ ДИЗАЙНА ЧЕЛОВЕКА — разово, до запуска.
 *
 * Складывает тексты в ту же таблицу matrix_texts, ключи начинаются с hd_.
 * Повторный запуск безопасен: то, что уже есть с текущей версией промпта,
 * пропускается. Можно прерывать и продолжать.
 *
 * Запуск:
 *   npm run fill-hd-texts -- --dry            # только посчитать объём
 *   npm run fill-hd-texts                     # генерировать
 *   npm run fill-hd-texts -- --only free      # сначала бесплатные
 *   npm run fill-hd-texts -- --only brief     # короткие абзацы страниц по дате
 *   npm run fill-hd-texts -- --only gates --limit 50
 *
 * Нужны те же переменные окружения, что и для fill-texts.mjs.
 *
 * Объём: 357 текстов. Из них 10 бесплатных (тип и стратегия для пяти типов)
 * и 18 коротких абзацев о центрах для страниц по дате: их видят посетители
 * без подписки и поисковики.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
// Импортируем конкретные модули, а не общий index: под tsx этот файл
// становится CommonJS, и реэкспорты через `export *` теряют имена.
import { CENTERS, CENTER_ORDER } from "../src/lib/humandesign/centers.ts";
import { CHANNELS } from "../src/lib/humandesign/channels.ts";
import { GATE_WHEEL, gateName } from "../src/lib/humandesign/gates.ts";
import { HD_TYPES, AUTHORITIES, CROSS_ANGLES } from "../src/lib/humandesign/chart.ts";
import { PROFILES, PROFILE_NAMES } from "../src/lib/humandesign/sections.ts";
import { buildHdRequest, HD_PROMPT_VERSION } from "../src/lib/humandesign/prompts.ts";

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
const ONLY = opt("only", "all"); // all | free | brief | authorities | profiles | centers | channels | gates | crosses
const LIMIT = Number(opt("limit", "0")) || Infinity;
const CONCURRENCY = Number(opt("concurrency", "4"));
const MODEL = process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5";

const jobs = [];
const push = (key, ctx, group) => jobs.push({ key, ctx, group });
const want = (group) => ONLY === "all" || ONLY === group;

// Короткие абзацы о центрах для страниц по дате.
if (want("brief")) {
  for (const center of CENTER_ORDER) {
    for (const defined of [true, false]) {
      push(
        `hd_brief_center_${center}_${defined ? "defined" : "open"}`,
        {
          kind: "hd_brief_center",
          slotLabel: `${CENTERS[center].name}: ${defined ? "определён" : "открыт"}`,
          center,
          defined,
        },
        "brief",
      );
    }
  }
}

// Тип и стратегия — бесплатная часть.
if (want("free")) {
  for (const t of Object.values(HD_TYPES)) {
    push(`hd_type_${t.id}`, { kind: "hd_type", slotLabel: `Ваш тип: ${t.name}`, type: t.id }, "free");
    push(`hd_strategy_${t.id}`, { kind: "hd_strategy", slotLabel: `Стратегия: ${t.strategy}`, type: t.id }, "free");
  }
}

if (want("authorities")) {
  for (const a of Object.values(AUTHORITIES)) {
    push(
      `hd_authority_${a.id}`,
      { kind: "hd_authority", slotLabel: `Ваш авторитет: ${a.name}`, authority: a.id },
      "authorities",
    );
  }
}

if (want("profiles")) {
  for (const profile of PROFILES) {
    push(
      `hd_profile_${profile.replace("/", "_")}`,
      { kind: "hd_profile", slotLabel: `Профиль ${profile}: ${PROFILE_NAMES[profile]}`, profile },
      "profiles",
    );
  }
}

if (want("centers")) {
  for (const center of CENTER_ORDER) {
    for (const defined of [true, false]) {
      push(
        `hd_center_${center}_${defined ? "defined" : "open"}`,
        { kind: "hd_center", slotLabel: `Центр ${center}: ${defined ? "определён" : "открыт"}`, center, defined },
        "centers",
      );
    }
  }
}

if (want("channels")) {
  for (const c of CHANNELS) {
    push(
      `hd_channel_${c.a}_${c.b}`,
      { kind: "hd_channel", slotLabel: `Канал ${c.a}—${c.b}: ${c.name}`, a: c.a, b: c.b, name: c.name },
      "channels",
    );
  }
}

if (want("gates")) {
  for (const gate of [...GATE_WHEEL].sort((x, y) => x - y)) {
    push(`hd_gate_${gate}`, { kind: "hd_gate", slotLabel: `Ворота ${gate}: ${gateName(gate)}`, gate }, "gates");
  }
}

// Кресты воплощения: угол и ворота Солнца личности — 3 × 64 = 192.
if (want("crosses")) {
  for (const angle of Object.keys(CROSS_ANGLES)) {
    for (const gate of [...GATE_WHEEL].sort((x, y) => x - y)) {
      push(
        `hd_cross_${angle}_${gate}`,
        {
          kind: "hd_cross",
          slotLabel: `${CROSS_ANGLES[angle]}, крест ворот ${gate} — ${gateName(gate)}`,
          angle,
          gates: [gate, gate, gate, gate],
        },
        "crosses",
      );
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
  for (const r of data ?? []) if (r.version === HD_PROMPT_VERSION && r.key.startsWith("hd_")) existing.add(r.key);
  if (!data || data.length < 1000) break;
}
const todo = unique.filter((j) => !existing.has(j.key)).slice(0, LIMIT);
console.log(`В базе уже: ${existing.size}. Осталось сгенерировать: ${todo.length}`);

if (DRY || todo.length === 0) process.exit(0);

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
  const req = buildHdRequest(job.ctx);
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
      .upsert({ key: job.key, body: text, version: HD_PROMPT_VERSION, model: res.model, source: "generated" });
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
