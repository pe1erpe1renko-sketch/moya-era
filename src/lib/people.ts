/**
 * СВОИ ЛЮДИ НА СТРАНИЦАХ НАПРАВЛЕНИЙ.
 *
 * Вошедший человек попадает на те же страницы, что и все — /matrica-sudby,
 * /natalnaya-karta, /dizayn-cheloveka, /numerologiya, /taro, /sovmestimost, —
 * но с его данными уже подставленными: дата, время, место, имя из
 * профиля, и результат посчитан сразу, без повторного ввода. Если людей в
 * профиле несколько — там же переключатель, для кого считаем.
 *
 * Отдельных «страниц кабинета» по направлениям (/cabinet/tarot и прочих)
 * больше нет: платящий клиент видел там худшую версию сайта. Старые
 * адреса перенаправляются на новые (см. `next.config.ts`).
 */

import { backend, RELATION_LABELS, type Person } from "@/lib/backend";
import { placeFromFields } from "@/lib/geo/birthPlace";
import type { BirthValue } from "@/components/natal/BirthForm";

/** Владелец профиля первым, остальные — как лежат. */
export function selfFirst(people: Person[]): Person[] {
  return [...people].sort((a, b) => (a.relation === "self" ? -1 : b.relation === "self" ? 1 : 0));
}

/** Имя-заглушка, которое человек не вводил сам. */
export function isPlaceholderName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  return n === "" || n === "Я" || n === "Мой профиль";
}

/** Как подписать человека в переключателе: «Вы», «Аня · Партнёр». */
export function personLabel(p: Pick<Person, "name" | "relation">): string {
  if (p.relation === "self") return isPlaceholderName(p.name) ? "Вы" : `Вы · ${p.name}`;
  const name = isPlaceholderName(p.name) ? RELATION_LABELS[p.relation] : p.name;
  return isPlaceholderName(p.name) ? name : `${name} · ${RELATION_LABELS[p.relation]}`;
}

/** Имя для расчётов, где оно что-то значит (число судьбы). Заглушка — как отсутствие. */
export function personName(p: Pick<Person, "name">): string | null {
  return isPlaceholderName(p.name) ? null : p.name.trim();
}

/** Дата, время и место человека в том виде, какой принимают карта и бодиграф. */
export function birthFromPerson(p: Person): BirthValue {
  const place = placeFromFields(p);
  return {
    date: p.birth_date.slice(0, 10),
    time: p.birth_time ? p.birth_time.slice(0, 5) : null,
    place,
    placeText: p.birth_place ?? place?.label ?? "",
  };
}

/** «26-07-1990» → { day, month, year } для форм с тремя списками. */
export function dateParts(iso: string): { day: number; month: number; year: number } | null {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { day: d, month: m, year: y };
}

/** Люди вошедшего, владелец первым. Пусто — гость, ошибка или никого нет. */
export async function loadPeople(userId: string): Promise<Person[]> {
  try {
    const { data } = await backend.people.list(userId);
    return selfFirst(data ?? []);
  } catch {
    return [];
  }
}
