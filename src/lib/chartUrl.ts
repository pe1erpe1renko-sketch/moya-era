/**
 * ПОСТОЯННЫЕ АДРЕСА КАРТ
 *   /natalnaya-karta/26-07-1990
 *   /dizayn-cheloveka/26-07-1990
 * По образцу матрицы: /matrica/13-07-1998.
 *
 * Индексируется только адрес по дате. Время и место передаются
 * параметрами запроса (?t=0940&g=524901): у таких страниц canonical
 * указывает на чистый адрес, а сами они закрыты от индексации.
 *
 * Причина проста. Дат в диапазоне — тридцать одна тысяча, и это разумное
 * число страниц. Комбинаций «дата + минута + город» — триллионы; отдать
 * их поисковику значит утопить сайт.
 */

/** Первая дата рождения, для которой существуют адреса. */
export const FIRST_CHART_DATE = "1940-01-01";

/** Последний год: позапрошлый — за прошлый год ещё нет взрослых читателей. */
export function lastChartYear(now: Date = new Date()): number {
  return now.getUTCFullYear() - 2;
}

const URL_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** '26-07-1990' → '1990-07-26'. null, если дата негодная или вне диапазона. */
export function chartUrlDateToIso(slug: string, now: Date = new Date()): string | null {
  const m = URL_DATE.exec(slug);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }
  if (year < Number(FIRST_CHART_DATE.slice(0, 4)) || year > lastChartYear(now)) return null;
  return `${y}-${mo}-${d}`;
}

/** '1990-07-26' → '26-07-1990' */
export function isoToChartUrlDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

export type ChartSystem = "natal" | "humandesign" | "numerology";

export const CHART_SYSTEMS: Record<ChartSystem, { slug: string; title: string }> = {
  natal: { slug: "natalnaya-karta", title: "Натальная карта" },
  humandesign: { slug: "dizayn-cheloveka", title: "Дизайн человека" },
  // Нумерологии не нужны ни время, ни место: она считается по одной дате.
  // Поэтому уточняющих параметров у её адресов не бывает.
  numerology: { slug: "numerologiya", title: "Нумерология" },
};

/**
 * Системы, у которых бывает уточнённый адрес. Карте и дизайну человека
 * нужны время и место, нумерологии — имя для числа судьбы. У всех таких
 * адресов noindex и canonical на чистый адрес по дате.
 */
export const REFINABLE_SYSTEMS: ChartSystem[] = ["natal", "humandesign", "numerology"];

/** Чистый адрес по дате — он же canonical. */
export function chartPath(system: ChartSystem, iso: string): string {
  return `/${CHART_SYSTEMS[system].slug}/${isoToChartUrlDate(iso)}`;
}

export type ChartQuery = {
  /** HH:MM или null */
  time: string | null;
  /** id места в GeoNames или null */
  placeId: number | null;
};

const TIME_PARAM = /^([01]\d|2[0-3])([0-5]\d)$/;

/** Разбирает ?t=0940&g=524901. Мусор молча игнорируется. */
export function parseChartQuery(params: { t?: string | null; g?: string | null }): ChartQuery {
  const t = params.t ? TIME_PARAM.exec(params.t) : null;
  const g = params.g ? Number(params.g) : NaN;
  return {
    time: t ? `${t[1]}:${t[2]}` : null,
    placeId: Number.isInteger(g) && g > 0 ? g : null,
  };
}

/** Собирает строку запроса из времени и места: '?t=0940&g=524901'. */
export function buildChartQuery(query: ChartQuery): string {
  const parts: string[] = [];
  if (query.time) parts.push(`t=${query.time.replace(":", "")}`);
  if (query.placeId) parts.push(`g=${query.placeId}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Уточнение для пары: у первого t1/g1, у второго t2/g2.
 * /sovmestimost/13-07-1998/09-04-1992?t1=0940&g1=524901&t2=1430
 */
export function parsePairQuery(params: {
  t1?: string | null;
  g1?: string | null;
  t2?: string | null;
  g2?: string | null;
}): [ChartQuery, ChartQuery] {
  return [
    parseChartQuery({ t: params.t1, g: params.g1 }),
    parseChartQuery({ t: params.t2, g: params.g2 }),
  ];
}

export function buildPairQuery(first: ChartQuery, second: ChartQuery): string {
  const parts: string[] = [];
  if (first.time) parts.push(`t1=${first.time.replace(":", "")}`);
  if (first.placeId) parts.push(`g1=${first.placeId}`);
  if (second.time) parts.push(`t2=${second.time.replace(":", "")}`);
  if (second.placeId) parts.push(`g2=${second.placeId}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Имя в адресе нумерологии: ?n=Пётр%20Петров.
 *
 * В путь адреса имя не кладём принципиально. Кириллица в ссылке
 * превращается в нечитаемую кашу из процентов, а чужое имя в
 * общедоступном адресе — это персональные данные в чистом виде. Поэтому
 * имя живёт в параметре, а такая страница закрыта от индексации.
 */
export function parseNameQuery(value: string | null | undefined): string | null {
  const clean = (value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  return clean.length >= 2 ? clean : null;
}

export function buildNameQuery(name: string | null): string {
  const clean = parseNameQuery(name);
  return clean ? `?n=${encodeURIComponent(clean)}` : "";
}

/** Есть ли в запросе уточнение — от этого зависит noindex. */
export function hasChartQuery(query: ChartQuery): boolean {
  return query.time !== null || query.placeId !== null;
}

/**
 * Сколько адресов кладём в один файл карты сайта. Предел поисковиков —
 * 50 000, берём с запасом: дат становится больше каждый год.
 */
export const SITEMAP_CHUNK = 45_000;

/** Сколько файлов карты сайта нужно одной системе. */
export function chartSitemapCount(now: Date = new Date()): number {
  return Math.max(1, Math.ceil(allChartDates(now).length / SITEMAP_CHUNK));
}

/** Даты одного файла карты сайта. */
export function chartSitemapChunk(id: number, now: Date = new Date()): string[] {
  return allChartDates(now).slice(id * SITEMAP_CHUNK, (id + 1) * SITEMAP_CHUNK);
}

/** Все даты диапазона в ISO — для карты сайта. */
export function allChartDates(now: Date = new Date()): string[] {
  const out: string[] = [];
  const end = Date.UTC(lastChartYear(now), 11, 31);
  const p = (n: number) => String(n).padStart(2, "0");
  for (let t = Date.parse(`${FIRST_CHART_DATE}T00:00:00Z`); t <= end; t += 86_400_000) {
    const d = new Date(t);
    out.push(`${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`);
  }
  return out;
}
