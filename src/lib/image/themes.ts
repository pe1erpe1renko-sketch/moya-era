/**
 * СЕМЬ ТЕМ ОБРАЗА — семь поводов сделать карточку.
 *
 * Ни одна тема ничего не считает заново: все берут готовое число из уже
 * посчитанной матрицы по пути из карты позиций (`resolvePath`) или из
 * карты дня. Так карточка не может разойтись с тем, что человек видит в
 * разборе, — а если разойдётся, это будет ошибкой расчёта, а не второй
 * реализации методики.
 *
 * ОФОРМЛЕНИЕ У ВСЕХ ОДНО. Меняются подпись темы и число. Поэтому темы —
 * это просто список, а не семь наборов вёрстки.
 */

import { arcanaLine, arcanaName, calculateMatrix, resolvePath } from "@/lib/matrix";
import { dayCardArcanum, moscowDay } from "@/lib/tarot";

export type ImageThemeId = "core" | "day" | "year" | "money" | "love" | "purpose" | "resource";

export type ImageTheme = {
  id: ImageThemeId;
  /** подпись темы на карточке: «ДЕНЬГИ» */
  label: string;
  /** строка под кнопкой выбора темы */
  hint: string;
};

export const IMAGE_THEMES: ImageTheme[] = [
  { id: "core", label: "Мой аркан", hint: "центральный аркан матрицы, не меняется всю жизнь" },
  { id: "day", label: "Карта дня", hint: "карта на сегодня, завтра будет другая" },
  { id: "year", label: "Мой год", hint: "аркан личного года" },
  { id: "money", label: "Деньги", hint: "денежный канал" },
  { id: "love", label: "Любовь", hint: "линия отношений" },
  { id: "purpose", label: "Предназначение", hint: "планетарное предназначение" },
  { id: "resource", label: "Ресурс", hint: "что вас наполняет" },
];

export function findImageTheme(id: string): ImageTheme | null {
  return IMAGE_THEMES.find((t) => t.id === id) ?? null;
}

/**
 * Путь к числу в матрице для каждой темы.
 *
 * «Карта дня» здесь не значится: она считается не из матрицы, а из даты
 * рождения и сегодняшних московских суток — той же функцией, что и
 * страница /taro/<дата>. Это именно карта на сегодня, а не «аркан дня»
 * из матрицы: у неё свой адрес, и её же будет рассылать бот.
 */
const THEME_PATH: Record<Exclude<ImageThemeId, "day">, string> = {
  core: "core.C",
  year: "today.yearArcana",
  money: "core.SE",
  love: "core.SW",
  purpose: "purpose.planetary.result",
  resource: "chakras.rows.3.physics",
};

/** Всё, что попадает на карточку до того, как человек снимет галочки. */
export type ImageData = {
  theme: ImageThemeId;
  /** подпись темы: «ДЕНЬГИ» */
  label: string;
  arcanum: number;
  /** название аркана — по-нашему: Перерождение, Искушение, Обновление */
  title: string;
  /** одна короткая строка смысла */
  line: string;
};

/** Число и тексты темы по дате рождения. null — дата негодная. */
export function buildImageData(theme: ImageThemeId, birthIso: string, now: Date = new Date()): ImageData | null {
  const t = findImageTheme(theme);
  if (!t) return null;

  let arcanum: number;
  try {
    arcanum =
      theme === "day"
        ? dayCardArcanum(birthIso, moscowDay(now))
        : resolvePath(calculateMatrix(birthIso, now), THEME_PATH[theme]);
  } catch {
    return null;
  }
  if (!Number.isInteger(arcanum) || arcanum < 1 || arcanum > 22) return null;

  return { theme, label: t.label, arcanum, title: arcanaName(arcanum), line: arcanaLine(arcanum) };
}

/** Все семь тем сразу — для выбора перед скачиванием. */
export function buildAllImageData(birthIso: string, now: Date = new Date()): ImageData[] {
  return IMAGE_THEMES.map((t) => buildImageData(t.id, birthIso, now)).filter((x): x is ImageData => x !== null);
}
