import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Единственная точка обращения к нейросети.
 *
 * Провайдер — KIE (посредник, оплата из РФ), у него Anthropic-совместимый
 * endpoint: https://api.kie.ai/claude + /v1/messages. Тот же код работает
 * и напрямую с Anthropic: достаточно поменять LLM_BASE_URL и ключ.
 *
 * Модели задаются через env, потому что идентификаторы у посредника
 * надо сверять с его списком:
 *   LLM_MODEL_TEXTS — тексты разборов (пишутся один раз, качество важнее цены)
 *   LLM_MODEL_CHAT  — наставник (единственный масштабируемый расход)
 *
 * Ключ никогда не попадает в браузер: файл помечен server-only.
 */

export const LLM_ENABLED = Boolean(process.env.LLM_API_KEY);

export const MODEL_TEXTS = process.env.LLM_MODEL_TEXTS ?? "claude-opus-4-5";
export const MODEL_CHAT = process.env.LLM_MODEL_CHAT ?? "claude-haiku-4-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!LLM_ENABLED) throw new Error("LLM_NOT_CONFIGURED");
  if (!client) {
    client = new Anthropic({
      baseURL: process.env.LLM_BASE_URL ?? "https://api.kie.ai/claude",
      // KIE ждёт Authorization: Bearer <ключ> — это authToken в SDK.
      authToken: process.env.LLM_API_KEY,
      apiKey: null,
      maxRetries: 2,
      timeout: 60_000,
    });
  }
  return client;
}

export type LlmMessage = { role: "user" | "assistant"; content: string };

export type CompleteInput = {
  model?: string;
  system: string;
  messages: LlmMessage[];
  maxTokens: number;
  temperature?: number;
};

export type CompleteOutput = { text: string; model: string; inputTokens: number; outputTokens: number };

/**
 * Тяжёлые арканы на сайте зовутся Перерождение, Искушение и Обновление
 * (см. `lib/arcana.ts`), а закрытые промпты матрицы всё ещё перечисляют
 * их старыми именами. Подменяем на лету в системном промпте и в
 * сообщениях — там стоят опоры вида «13 · Смерть», по которым модель
 * называет аркан.
 */
const HEAVY_ARCANA: Array<[RegExp, string]> = [
  [/\bСмерть\b/g, "Перерождение"],
  [/\bДьявол\b/g, "Искушение"],
  [/\bБашня\b/g, "Обновление"],
];
const HEAVY_RULE = "\n\nНазвания арканов 13, 15 и 16 — только «Перерождение», «Искушение» и «Обновление». Слова «Смерть», «Дьявол» и «Башня» как названия арканов не использовать.";

export function renameArcana(text: string): string {
  return HEAVY_ARCANA.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

/** Промпты написаны для другого бренда — подменяем имя сервиса на лету, файлы не трогаем. */
export function brand(system: string): string {
  const named = system.replaceAll("«Матрика»", "«Моя Эра»").replaceAll("Матрика", "Моя Эра").replaceAll("образам-талисманам", "образам");
  return renameArcana(named) + (named.includes("Перерождение") ? "" : HEAVY_RULE);
}

function renameMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  return messages.map((m) => (typeof m.content === "string" ? { ...m, content: renameArcana(m.content) } : m));
}

export async function complete({ model, system, messages, maxTokens, temperature = 0.8 }: CompleteInput): Promise<CompleteOutput> {
  const c = getClient();
  const res = await c.messages.create({
    model: model ?? MODEL_TEXTS,
    max_tokens: maxTokens,
    temperature,
    system: brand(system),
    messages: renameMessages(messages),
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("EMPTY_COMPLETION");
  return {
    text,
    model: res.model,
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
  };
}

/**
 * Потоковый ответ для чата: отдаём куски по мере генерации.
 * Возвращает асинхронный итератор строк и промис с итогом.
 */
export async function* stream({ model, system, messages, maxTokens, temperature = 0.9 }: CompleteInput): AsyncGenerator<string, CompleteOutput> {
  const c = getClient();
  const s = c.messages.stream({
    model: model ?? MODEL_CHAT,
    max_tokens: maxTokens,
    temperature,
    system: brand(system),
    messages: renameMessages(messages),
  });
  let full = "";
  for await (const event of s) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      yield event.delta.text;
    }
  }
  const final = await s.finalMessage();
  return {
    text: full.trim(),
    model: final.model,
    inputTokens: final.usage?.input_tokens ?? 0,
    outputTokens: final.usage?.output_tokens ?? 0,
  };
}
