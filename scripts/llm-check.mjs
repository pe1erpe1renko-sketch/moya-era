#!/usr/bin/env node
/** Проверка ключа и моделей у провайдера: node scripts/llm-check.mjs */
import { readFileSync, existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.LLM_API_KEY) {
  console.error("Нет LLM_API_KEY");
  process.exit(1);
}
const client = new Anthropic({ baseURL: process.env.LLM_BASE_URL ?? "https://api.kie.ai/claude", authToken: process.env.LLM_API_KEY, apiKey: null, maxRetries: 0, timeout: 30_000 });
for (const model of [process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5", process.env.LLM_MODEL_CHAT ?? "claude-haiku-4-5"]) {
  try {
    const r = await client.messages.create({ model, max_tokens: 40, messages: [{ role: "user", content: "Ответь одним словом: работает?" }] });
    console.log(`✓ ${model}: ${r.content[0]?.text?.trim()} (вход ${r.usage?.input_tokens}, выход ${r.usage?.output_tokens})`);
  } catch (e) {
    console.log(`✗ ${model}: ${e.status ?? ""} ${e.message}`);
  }
}
