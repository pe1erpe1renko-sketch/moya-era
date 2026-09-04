/**
 * Местное время рождения → всемирное время (UTC) с историей часовых поясов.
 *
 * Пояса берутся из встроенной базы движка JavaScript (Intl, база tzdata
 * IANA): она знает декретное время 1930 года, летнее время 1981–1991,
 * отмену декретного времени в 1991 и возврат в 1992, реформы 2011 и 2014,
 * местное среднее время до введения поясов. Отдельная библиотека не нужна,
 * работает и в браузере, и на сервере.
 *
 * Долгота места в переводе не участвует: только идентификатор пояса IANA
 * («Europe/Moscow», «Asia/Novosibirsk»), который хранится рядом с местом.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(tz, f);
  }
  return f;
}

/** true, если движок знает такой пояс. */
export function isValidTimeZone(tz: string): boolean {
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

/**
 * Смещение пояса относительно UTC в секундах на момент `utc`
 * (местное время − UTC). Секунды нужны для местного среднего времени
 * до введения поясов: Москва до 1919 года это +2:30:17.
 */
export function zoneOffsetSeconds(utc: Date, tz: string): number {
  const parts = formatter(tz).formatToParts(utc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  let hour = get("hour");
  if (hour === 24) hour = 0;
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  // Intl округляет до секунд; сами миллисекунды не влияют на смещение.
  const base = Math.floor(utc.getTime() / 1000) * 1000;
  return Math.round((wall - base) / 1000);
}

export function zoneOffsetMinutes(utc: Date, tz: string): number {
  return zoneOffsetSeconds(utc, tz) / 60;
}

export type LocalToUtc = {
  utc: Date;
  /** смещение, которое применилось, в минутах */
  offsetMinutes: number;
  /** такого местного времени не было: часы перевели вперёд через него */
  nonexistent: boolean;
  /** такое местное время было дважды: часы переводили назад */
  ambiguous: boolean;
};

const DAY_MS = 86_400_000;

/**
 * Момент UTC для местной даты и времени в поясе.
 *
 * Перебираются смещения, действовавшие за сутки до и после: для каждого
 * проверяется, даёт ли оно в обратную сторону то же местное время.
 * Если подходящих два (осенний перевод назад), берётся первое, летнее.
 * Если ни одного (весенний перевод вперёд), время считается по смещению,
 * действовавшему до перевода, и помечается как несуществовавшее.
 */
export function localToUtc(dateIso: string, timeHHMM: string, tz: string): LocalToUtc {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = timeHHMM.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error(`Плохая дата или время: ${dateIso} ${timeHHMM}`);
  }
  const wall = Date.UTC(y, m - 1, d, hh, mm, 0);

  const before = zoneOffsetSeconds(new Date(wall - DAY_MS), tz);
  const after = zoneOffsetSeconds(new Date(wall + DAY_MS), tz);
  const around = zoneOffsetSeconds(new Date(wall), tz);
  const candidates = Array.from(new Set([before, around, after])).sort((a, b) => b - a);

  const valid = candidates.filter((off) => zoneOffsetSeconds(new Date(wall - off * 1000), tz) === off);

  if (valid.length === 0) {
    const off = before;
    return { utc: new Date(wall - off * 1000), offsetMinutes: off / 60, nonexistent: true, ambiguous: false };
  }
  const off = valid[0];
  return { utc: new Date(wall - off * 1000), offsetMinutes: off / 60, nonexistent: false, ambiguous: valid.length > 1 };
}

/** «UTC+3», «UTC+5:30», «UTC−1», «UTC+2:30:17». */
export function formatOffset(offsetMinutes: number): string {
  const totalSeconds = Math.round(offsetMinutes * 60);
  const sign = totalSeconds < 0 ? "−" : "+";
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const min = Math.floor((abs % 3600) / 60);
  const sec = abs % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (sec) return `UTC${sign}${h}:${p(min)}:${p(sec)}`;
  if (min) return `UTC${sign}${h}:${p(min)}`;
  return `UTC${sign}${h}`;
}
