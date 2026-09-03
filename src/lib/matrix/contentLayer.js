/**
 * КОНТЕНТНЫЙ СЛОЙ
 * ===============
 * Отвечает на один вопрос: «дай текст для этого слота».
 *
 * ПОРЯДОК ПОИСКА:
 *   1. Кэш в базе            → мгновенно, бесплатно
 *   2. Эталонные тексты      → написаны вручную
 *   3. Генерация нейросетью  → если MODE = 'live', результат сохраняется в базу
 *   4. Шаблон-заглушка       → если генерация выключена или упала
 *
 * ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА: смените CONTENT_MODE на 'live', вставьте ключ
 * провайдера в generateText() — и всё заработает по-настоящему.
 * Переписывать остальной код не нужно.
 */

import { SEED_TEXTS, buildPlaceholder } from './seedTexts.js';
import { buildRequest, PROMPT_VERSION } from './prompts.js';

/** 'stub' — макет для показа | 'live' — рабочий режим с генерацией */
export const CONTENT_MODE = 'stub';

// ═══════════════════════════════════════════════════════════
// ХРАНИЛИЩЕ
// ═══════════════════════════════════════════════════════════

/**
 * Интерфейс базы. В макете — память процесса.
 * ТОЧКА ПОДКЛЮЧЕНИЯ: замените на таблицу Supabase `matrix_texts`
 *   колонки: key (PK, text), body (text), version (int), created_at (timestamptz)
 */
export const textStore = {
  _memory: new Map(),

  async get(key) {
    const row = this._memory.get(key);
    if (!row) return null;
    if (row.version !== PROMPT_VERSION) return null; // текст устарел → перегенерировать
    return row.body;
  },

  async set(key, body) {
    this._memory.set(key, { body, version: PROMPT_VERSION, createdAt: new Date().toISOString() });
  },

  async count() {
    return this._memory.size;
  },
};

// ═══════════════════════════════════════════════════════════
// ГЕНЕРАЦИЯ
// ═══════════════════════════════════════════════════════════

/**
 * ТОЧКА ПОДКЛЮЧЕНИЯ НЕЙРОСЕТИ.
 * Вызывать только с бэкенда: ключ провайдера не должен попадать в браузер.
 */
export async function generateText(slotContext) {
  const request = buildRequest(slotContext);

  // TODO: заменить на реальный вызов провайдера.
  // const res = await fetch(PROVIDER_URL, { method: 'POST', headers: {...}, body: ... });
  // if (!res.ok) throw new Error(`Провайдер вернул ${res.status}`);
  // return extractText(await res.json());

  throw new Error('GENERATION_NOT_CONFIGURED');
}

// ═══════════════════════════════════════════════════════════
// ЗАЩИТА ОТ ДВОЙНОЙ ГЕНЕРАЦИИ
// ═══════════════════════════════════════════════════════════

/**
 * Двое с одинаковым арканом могут открыть раздел одновременно.
 * Без блокировки обе генерации уйдут в нейросеть и одна оплатится зря.
 * Первый генерирует — остальные ждут его результат.
 */
const inFlight = new Map();

function withLock(key, task) {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = task().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════
// ГЛАВНАЯ ФУНКЦИЯ
// ═══════════════════════════════════════════════════════════

/**
 * @returns {{ text: string, source: 'cache'|'seed'|'generated'|'placeholder', error?: string }}
 * source нужен для аналитики: видно, сколько запросов реально идёт в нейросеть.
 */
export async function getText(slotContext) {
  const { key } = slotContext;

  const cached = await textStore.get(key);
  if (cached) return { text: cached, source: 'cache' };

  if (SEED_TEXTS[key]) {
    return { text: SEED_TEXTS[key], source: 'seed' };
  }

  if (CONTENT_MODE !== 'live') {
    return { text: buildPlaceholder(slotContext), source: 'placeholder' };
  }

  return withLock(key, async () => {
    try {
      const generated = await generateText(slotContext);
      // Пишем в базу ТОЛЬКО после успеха: битый ответ не должен осесть навсегда.
      await textStore.set(key, generated);
      return { text: generated, source: 'generated' };
    } catch (error) {
      return {
        text: buildPlaceholder(slotContext),
        source: 'placeholder',
        error: String(error.message || error),
      };
    }
  });
}

/** Пакетная загрузка раздела — все слоты параллельно. */
export async function getSectionTexts(section) {
  const results = await Promise.all(
    section.slots.map(async (slot) => ({
      ...slot,
      ...(await getText({
        key: slot.key,
        slotLabel: slot.label,
        arcana: slot.arcana,
        sectionTitle: section.title,
        sectionLead: section.lead,
      })),
    }))
  );
  return { ...section, slots: results };
}
