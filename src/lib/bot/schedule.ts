/**
 * КОГДА СЛАТЬ УТРЕННЮЮ СВОДКУ.
 *
 * Около восьми утра по часам самого человека. Пояс он выбирает кнопкой в
 * боте, по умолчанию московский: аудитория русскоязычная, и это понятная
 * всем точка отсчёта — та же, по которой считается карта дня.
 *
 * ПРАВИЛО ОТПРАВКИ НЕ ОКОННОЕ, А ДОГОНЯЮЩЕЕ: сводка полагается, если по
 * местным часам уже наступило восемь утра, а сегодняшняя ещё не
 * уходила. Окно («кому сейчас ровно восемь») выглядит проще, но теряет
 * всех, чей пояс сдвинут на полчаса или сорок пять минут, и всех, чей
 * запуск не состоялся: пропустили — и человек остался без сводки. При
 * догоняющем правиле пропущенный запуск просто наверстывается
 * следующим.
 */

export const DIGEST_HOUR = 8;

/** Пояс по умолчанию — тот же, по которому меняется карта дня. */
export const DEFAULT_BOT_TZ = "Europe/Moscow";

/** Местная дата и час в поясе. */
export function localParts(now: Date, tz: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: hour === 24 ? 0 : hour };
}

/** Годится ли строка как пояс. Кнопки в боте фиксированные, но данные из базы бывают всякие. */
export function isKnownZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type DueInput = {
  /** пояс человека */
  tz: string;
  /** местная дата последней отправленной сводки, YYYY-MM-DD; null — не слали ни разу */
  lastSentDay: string | null;
};

/** Пора ли слать этому человеку прямо сейчас. */
export function isDue(input: DueInput, now: Date): boolean {
  const tz = isKnownZone(input.tz) ? input.tz : DEFAULT_BOT_TZ;
  const { date, hour } = localParts(now, tz);
  if (hour < DIGEST_HOUR) return false;
  return input.lastSentDay !== date;
}

/**
 * СКОРОСТЬ ОТПРАВКИ. Телеграм принимает у бота примерно тридцать
 * сообщений в секунду; при превышении отвечает 429 и просит подождать.
 * Берём с запасом: рассылка не гонка, а вот попасть в блокировку за
 * превышение — значит не доставить сводку никому.
 */
export const SEND_PER_SECOND = 25;

/** Пауза между сообщениями, миллисекунды. */
export const SEND_GAP_MS = Math.ceil(1000 / SEND_PER_SECOND);

/**
 * Сколько сводок успеет уйти за один запуск.
 * @param budgetMs сколько времени есть у задачи по расписанию
 */
export function batchSize(budgetMs: number): number {
  return Math.max(1, Math.floor(budgetMs / SEND_GAP_MS));
}

/**
 * За сколько минут разойдётся вся очередь при таком темпе.
 * Нужна не коду, а разговору: по ней видно, когда пора дробить рассылку.
 */
export function minutesToSend(count: number): number {
  return Math.ceil((count * SEND_GAP_MS) / 60_000);
}
