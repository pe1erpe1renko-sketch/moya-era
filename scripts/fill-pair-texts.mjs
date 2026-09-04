#!/usr/bin/env node
/**
 * НАПОЛНЕНИЕ ТЕКСТОВ РАЗБОРА ПАРЫ — разово, до запуска.
 *
 * Синастрия и композит складываются в ту же таблицу matrix_texts, ключи
 * начинаются с syn_, hdc_ и pair_. Повторный запуск безопасен: то, что уже
 * есть с текущей версией промпта, пропускается.
 *
 * Запуск:
 *   npm run fill-pair-texts -- --dry              # только посчитать объём
 *   npm run fill-pair-texts -- --only free        # бесплатные абзацы
 *   npm run fill-pair-texts -- --only aspects --limit 50
 *
 * Нужны те же переменные окружения, что и для остальных скриптов.
 *
 * Бесплатные абзацы («что вас связывает» по каждому из трёх взглядов)
 * стоит сгенерировать первыми: их видят все, включая того, кому прислали
 * ссылку на разбор.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
// Импортируем конкретные модули, а не общий index: под tsx этот файл
// становится CommonJS, и реэкспорты через `export *` теряют имена.
import { BODIES } from "../src/lib/ephemeris/bodies.ts";
import { ASPECTS, ASPECT_ORDER } from "../src/lib/natal/aspects.ts";
import { CHANNELS } from "../src/lib/humandesign/channels.ts";
import { HD_TYPES, DEFINITIONS } from "../src/lib/humandesign/chart.ts";
import { SYNASTRY_POINTS, BRIEF_POINTS, synastryPairAllowed } from "../src/lib/pair/synastry.ts";
import { CONNECTION_KINDS } from "../src/lib/pair/composite.ts";
import { buildPairRequest, PAIR_PROMPT_VERSION } from "../src/lib/pair/prompts.ts";

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
const ONLY = opt("only", "all"); // all | free | aspects | houses | types | channels
const LIMIT = Number(opt("limit", "0")) || Infinity;
const CONCURRENCY = Number(opt("concurrency", "4"));
const MODEL = process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5";

const jobs = [];
const push = (key, ctx, group) => jobs.push({ key, ctx, group });
const want = (group) => ONLY === "all" || ONLY === group;

const name = (p) => (p === "asc" ? "Асцендент" : p === "mc" ? "Середина неба" : BODIES[p].name);
const HOUSE_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const TYPE_IDS = Object.keys(HD_TYPES);

/* ── бесплатные абзацы: что связывает пару ── */
if (want("free")) {
  // Матрица: аркан пары, 22 значения.
  for (let arcana = 1; arcana <= 22; arcana++) {
    push(`pair_brief_matrix_${arcana}`, { kind: "pair_brief_matrix", slotLabel: `Аркан пары ${arcana}`, arcana }, "free");
  }
  // Синастрия: самый точный аспект между личными планетами.
  for (const a of BRIEF_POINTS) {
    for (const b of BRIEF_POINTS) {
      for (const aspect of ASPECT_ORDER) {
        push(
          `syn_brief_${a}_${b}_${aspect}`,
          { kind: "syn_brief", slotLabel: `${name(a)} первого и ${name(b)} второго`, a, b, aspect },
          "free",
        );
      }
    }
  }
  push("syn_brief_none", { kind: "syn_brief", slotLabel: "Что вас связывает", a: null, b: null, aspect: null }, "free");
  // Композит: пара типов.
  for (const first of TYPE_IDS) {
    for (const second of TYPE_IDS) {
      push(
        `hdc_brief_${first}_${second}`,
        { kind: "hdc_brief", slotLabel: `${HD_TYPES[first].name} и ${HD_TYPES[second].name}`, first, second },
        "free",
      );
    }
  }
}

/* ── синастрия: аспекты между картами ── */
if (want("aspects")) {
  for (const a of SYNASTRY_POINTS) {
    for (const b of SYNASTRY_POINTS) {
      if (!synastryPairAllowed(a, b)) continue;
      for (const aspect of ASPECT_ORDER) {
        push(
          `syn_aspect_${a}_${b}_${aspect}`,
          {
            kind: "syn_aspect",
            slotLabel: `${name(a)} первого и ${name(b)} второго: ${ASPECTS[aspect].name.toLowerCase()}`,
            a,
            b,
            aspect,
          },
          "aspects",
        );
      }
    }
  }
}

/* ── синастрия: наложение домов ── */
if (want("houses")) {
  for (const body of HOUSE_BODIES) {
    for (let house = 1; house <= 12; house++) {
      push(
        `syn_house_${body}_${house}`,
        { kind: "syn_house", slotLabel: `${BODIES[body].name} одного в ${house} доме другого`, body: BODIES[body].name, house },
        "houses",
      );
    }
  }
}

/* ── композит: пары типов и определение ── */
if (want("types")) {
  for (const first of TYPE_IDS) {
    for (const second of TYPE_IDS) {
      push(
        `hdc_type_${first}_${second}`,
        {
          kind: "hdc_type",
          slotLabel: `${HD_TYPES[first].name} и ${HD_TYPES[second].name}: как это работает`,
          first,
          second,
        },
        "types",
      );
    }
  }
  for (const definition of Object.keys(DEFINITIONS)) {
    push(
      `hdc_definition_${definition}`,
      { kind: "hdc_definition", slotLabel: `Определение пары: ${DEFINITIONS[definition]}`, definition },
      "types",
    );
  }
}

/* ── композит: каналы связи ── */
if (want("channels")) {
  const seen = new Set();
  for (const c of CHANNELS) {
    const key = `${Math.min(c.a, c.b)}_${Math.max(c.a, c.b)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const connection of Object.keys(CONNECTION_KINDS)) {
      push(
        `hdc_channel_${key}_${connection}`,
        {
          kind: "hdc_channel",
          slotLabel: `Канал ${c.a}—${c.b}: ${c.name}, ${CONNECTION_KINDS[connection].name.toLowerCase()}`,
          a: Math.min(c.a, c.b),
          b: Math.max(c.a, c.b),
          connection,
        },
        "channels",
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
  for (const r of data ?? []) {
    if (r.version === PAIR_PROMPT_VERSION && /^(syn_|hdc_|pair_brief_)/.test(r.key)) existing.add(r.key);
  }
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
  const req = buildPairRequest(job.ctx);
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
      .upsert({ key: job.key, body: text, version: PAIR_PROMPT_VERSION, model: res.model, source: "generated" });
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
