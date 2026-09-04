/**
 * Знаки зодиака: тропический круг, отсчёт от точки весеннего равноденствия.
 * Ключи знаков совпадают с ключами в src/lib/natal.ts, чтобы интерфейс
 * знака Солнца продолжал работать без изменений.
 */

import { formatDms, norm360 } from "./angles";

export type SignKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

export type Sign = {
  /** 0 — Овен … 11 — Рыбы */
  index: number;
  key: SignKey;
  /** «Лев» */
  name: string;
  /** «Льва» — для записи «12°34′ Льва» */
  genitive: string;
  /** «во Льве» — для фразы «Солнце во Льве» */
  inCase: string;
  glyph: string;
  element: Element;
  modality: Modality;
};

const ELEMENTS: Element[] = ["fire", "earth", "air", "water"];
const MODALITIES: Modality[] = ["cardinal", "fixed", "mutable"];

const RAW: Array<[SignKey, string, string, string, string]> = [
  ["aries", "Овен", "Овна", "в Овне", "♈"],
  ["taurus", "Телец", "Тельца", "в Тельце", "♉"],
  ["gemini", "Близнецы", "Близнецов", "в Близнецах", "♊"],
  ["cancer", "Рак", "Рака", "в Раке", "♋"],
  ["leo", "Лев", "Льва", "во Льве", "♌"],
  ["virgo", "Дева", "Девы", "в Деве", "♍"],
  ["libra", "Весы", "Весов", "в Весах", "♎"],
  ["scorpio", "Скорпион", "Скорпиона", "в Скорпионе", "♏"],
  ["sagittarius", "Стрелец", "Стрельца", "в Стрельце", "♐"],
  ["capricorn", "Козерог", "Козерога", "в Козероге", "♑"],
  ["aquarius", "Водолей", "Водолея", "в Водолее", "♒"],
  ["pisces", "Рыбы", "Рыб", "в Рыбах", "♓"],
];

export const SIGNS: Sign[] = RAW.map(([key, name, genitive, inCase, glyph], index) => ({
  index,
  key,
  name,
  genitive,
  inCase,
  glyph,
  element: ELEMENTS[index % 4],
  modality: MODALITIES[index % 3],
}));

export function signByKey(key: SignKey): Sign {
  return SIGNS.find((s) => s.key === key)!;
}

/** Знак по эклиптической долготе. */
export function signAt(longitude: number): Sign {
  return SIGNS[Math.floor(norm360(longitude) / 30) % 12];
}

/** Градус внутри знака, [0, 30). */
export function degreeInSign(longitude: number): number {
  return norm360(longitude) % 30;
}

export type ZodiacPosition = {
  longitude: number;
  sign: Sign;
  /** градусы внутри знака с дробной частью */
  degree: number;
  /** «3°07′ Льва» */
  label: string;
};

export function zodiacPosition(longitude: number): ZodiacPosition {
  const lon = norm360(longitude);
  const sign = signAt(lon);
  const degree = degreeInSign(lon);
  return { longitude: lon, sign, degree, label: `${formatDms(degree)} ${sign.genitive}` };
}

/** «3°07′ Льва» или «3°07′51″ Льва». */
export function formatZodiac(longitude: number, { seconds = false }: { seconds?: boolean } = {}): string {
  const lon = norm360(longitude);
  return `${formatDms(degreeInSign(lon), { seconds })} ${signAt(lon).genitive}`;
}
