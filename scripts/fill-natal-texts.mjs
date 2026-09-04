#!/usr/bin/env node
/**
 * НАПОЛНЕНИЕ ТЕКСТОВ НАТАЛЬНОЙ КАРТЫ — разово, до запуска.
 *
 * Делает для натальной карты то же, что `fill-texts.mjs` для матрицы:
 * генерирует все тексты позиций и складывает в ту же таблицу matrix_texts.
 * Ключи начинаются с natal_, поэтому не пересекаются с матричными.
 * Повторный запуск безопасен: то, что уже есть с текущей версией промпта,
 * пропускается. Можно прерывать и продолжать.
 *
 * Отдельный файл, а не часть fill-texts.mjs, по прозаической причине:
 * модули натальной карты на TypeScript, и запускать их надо через tsx,
 * а под tsx перестают читаться матричные модули на .js.
 *
 * Запуск:
 *   npm run fill-natal-texts -- --dry             # только посчитать объём
 *   npm run fill-natal-texts                      # генерировать
 *   npm run fill-natal-texts -- --only free       # сначала бесплатные
 *   npm run fill-natal-texts -- --only brief      # короткие абзацы страниц по дате
 *   npm run fill-natal-texts -- --only aspects --limit 50
 *
 * Нужны те же переменные окружения, что и для fill-texts.mjs:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   LLM_API_KEY, LLM_BASE_URL (по умолчанию KIE), LLM_MODEL_TEXTS
 *
 * Объём: около 890 текстов. Из них 36 бесплатных (Солнце, Луна и асцендент
 * по знакам) и 132 коротких абзаца страниц по дате — их стоит сгенерировать
 * первыми: их видят посетители без подписки и поисковики.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
// Импортируем конкретные модули, а не общий index: под tsx этот файл
// становится CommonJS, и реэкспорты через `export *` теряют имена.
import { BODIES, NATAL_BODIES } from "../src/lib/ephemeris/bodies.ts";
import { SIGNS } from "../src/lib/ephemeris/zodiac.ts";
import { ASPECTS, ASPECT_ORDER } from "../src/lib/natal/aspects.ts";
import { NATAL_SECTIONS } from "../src/lib/natal/sections.ts";
import { buildNatalRequest, NATAL_PROMPT_VERSION } from "../src/lib/natal/prompts.ts";

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
const ONLY = opt("only", "all"); // all | free | brief | signs | houses | angles | aspects
const LIMIT = Number(opt("limit", "0")) || Infinity;
const CONCURRENCY = Number(opt("concurrency", "4"));
const MODEL = process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5";

/* ── что генерировать ── */
const jobs = [];
const push = (key, ctx, group) => jobs.push({ key, ctx, group });

const slotById = new Map(NATAL_SECTIONS.flatMap((s) => s.slots).map((s) => [s.id, s]));
const CHART_BODIES = NATAL_BODIES.filter((b) => b !== "lilith");
/** Солнце и Луна не бывают ретроградными, узлы у нас всегда идут назад. */
const CAN_RETRO = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);

const want = (group) => ONLY === "all" || ONLY === group || (ONLY === "free" && group === "free");

// Короткие абзацы страниц по дате: планета в знаке, без ретроградности.
if (want("brief")) {
  for (const body of CHART_BODIES) {
    for (const sign of SIGNS) {
      push(
        `natal_brief_${body}_${sign.key}`,
        { kind: "natal_brief", slotLabel: `${BODIES[body].name} ${sign.inCase}`, bodyName: BODIES[body].name, sign: sign.key },
        "brief",
      );
    }
  }
}

for (const body of CHART_BODIES) {
  const slot = slotById.get(`natal_body_sign_${body}`);
  if (slot) {
    for (const sign of SIGNS) {
      for (const retrograde of CAN_RETRO.has(body) ? [false, true] : [false]) {
        const group = slot.free && !retrograde ? "free" : "signs";
        if (!want(group) && !(ONLY === "signs" && group === "free")) continue;
        push(
          `${slot.id}_${sign.key}${retrograde ? "_r" : ""}`,
          { kind: "natal_body_sign", slotLabel: slot.label, bodyName: BODIES[body].name, sign: sign.key, retrograde },
          group,
        );
      }
    }
  }

  const houseSlot = slotById.get(`natal_body_house_${body}`);
  if (houseSlot && want("houses")) {
    for (let house = 1; house <= 12; house++) {
      push(
        `${houseSlot.id}_${house}`,
        { kind: "natal_body_house", slotLabel: houseSlot.label, bodyName: BODIES[body].name, house },
        "houses",
      );
    }
  }
}

for (const [id, angle] of [
  ["natal_asc_sign", "asc"],
  ["natal_mc_sign", "mc"],
]) {
  const slot = slotById.get(id);
  if (!slot) continue;
  const group = slot.free ? "free" : "angles";
  if (!want(group) && !(ONLY === "angles" && group === "free")) continue;
  for (const sign of SIGNS) {
    push(`${id}_${sign.key}`, { kind: "natal_angle_sign", slotLabel: slot.label, angle, sign: sign.key }, group);
  }
}

if (want("aspects")) {
  const POINTS = [...CHART_BODIES, "asc", "mc"];
  const name = (p) => (p === "asc" ? "Асцендент" : p === "mc" ? "Середина неба" : BODIES[p].name);
  for (let i = 0; i < POINTS.length; i++) {
    for (let j = i + 1; j < POINTS.length; j++) {
      for (const key of ASPECT_ORDER) {
        push(
          `natal_aspect_${POINTS[i]}_${POINTS[j]}_${key}`,
          {
            kind: "natal_aspect",
            slotLabel: `${ASPECTS[key].name}: ${name(POINTS[i])} и ${name(POINTS[j])}`,
            a: POINTS[i],
            b: POINTS[j],
            aspect: key,
          },
          "aspects",
        );
      }
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
  for (const r of data ?? []) if (r.version === NATAL_PROMPT_VERSION && r.key.startsWith("natal_")) existing.add(r.key);
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
  const req = buildNatalRequest(job.ctx);
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
      .upsert({ key: job.key, body: text, version: NATAL_PROMPT_VERSION, model: res.model, source: "generated" });
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
