import "server-only";

import { buildDigestSource, digestKeys, digestMessage, type BotTopic } from "@/lib/bot";
import { dailyTextKey, dayArcana } from "@/lib/matrix";
import { supabaseService } from "@/server/supabase";

/**
 * ТЕКСТЫ СВОДКИ — ТОЛЬКО ИЗ ОБЩЕГО КЭША.
 *
 * Здесь принципиально НЕ вызывается `getTexts`: она умеет генерировать
 * недостающее, а бот генерировать не должен. Тексты на день готовятся
 * заранее, отдельной задачей, до начала рассылки. Если к моменту
 * отправки текста нет — уходит строка без разбора, и это честнее, чем
 * заставить полторы тысячи человек по очереди ждать нейросеть.
 *
 * Читаем сервисным ключом одним запросом на все ключи сразу: у рассылки
 * ключей на весь день не больше сорока (двадцать два аркана дня плюс
 * двадцать два аркана таро плюс девять чисел), и тянуть их по одному на
 * каждого подписчика было бы расточительством.
 */

/** Готовые тексты по ключам. Чего нет в базе, того нет и в ответе. */
export async function cachedTexts(keys: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return {};
  const sb = supabaseService();
  if (!sb) return {};

  const out: Record<string, string> = {};
  // Запрос длинными списками ключей упирается в длину строки — режем.
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const { data } = await sb.from("matrix_texts").select("key, body").in("key", chunk);
    for (const row of (data as Array<{ key: string; body: string }> | null) ?? []) {
      if (row.body) out[String(row.key)] = String(row.body);
    }
  }
  return out;
}

export type DigestFor = {
  birthDate: string;
  name: string | null;
  topics: readonly BotTopic[];
};

/** Готовое сообщение сводки. null — показывать нечего. */
export async function buildDigest(
  input: DigestFor,
  now: Date = new Date(),
  texts?: Record<string, string>,
): Promise<{ day: string; body: string } | null> {
  const src = buildDigestSource(input.birthDate, input.name, now);
  if (!src) return null;

  const ready = texts ?? (await cachedTexts(digestKeys(src, input.topics)));
  const body = digestMessage(src, input.topics, ready);
  return body ? { day: src.day, body } : null;
}

/**
 * Все ключи, которые понадобятся сегодняшней рассылке.
 *
 * Аркан дня выводится из аркана периода, поэтому их ровно двадцать два
 * на все сутки — сколько бы ни было подписчиков. Этот же список задача
 * подготовки прогревает до начала рассылки.
 */
export function allDigestKeysForDay(day: string): string[] {
  const keys: string[] = [];
  for (let period = 1; period <= 22; period++) {
    // Аркан дня спрашиваем у движка матрицы, а не выводим здесь заново:
    // вторая реализация той же формулы однажды разойдётся с первой, и
    // прогретые ключи окажутся не теми, по которым пойдёт рассылка.
    keys.push(dailyTextKey(dayArcana(day, period), period, day));
  }
  for (let n = 1; n <= 22; n++) keys.push(`taro_day_${n}`);
  for (let n = 1; n <= 9; n++) keys.push(`num_brief_dayn_${n}`);
  return keys;
}
