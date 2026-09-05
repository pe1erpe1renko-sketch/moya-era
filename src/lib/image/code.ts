/**
 * КОД КАРТОЧКИ В АДРЕСЕ — /obraz/k7m2q9xw4t.
 *
 * Случайный, а не выведенный из даты рождения. Из адреса не должно
 * восстанавливаться ничего о человеке: адресами делятся в открытую.
 *
 * Алфавит и сама выдача кодов — общие с ботом, см. `lib/shortCode`.
 * Длина 10 при алфавите из 31 знака — это больше 8×10¹⁴ вариантов:
 * перебором чужую карточку не найти, а на глаз код остаётся коротким.
 */

import { isShortCode, randomCode } from "@/lib/shortCode";

export const CODE_LENGTH = 10;

/** Годится ли строка как код. Проверяется до похода в базу. */
export function isImageCode(value: string): boolean {
  return isShortCode(value, CODE_LENGTH);
}

/**
 * Новый код.
 * @param random источник случайности; в тестах подменяется на свой
 */
export function newImageCode(random: () => number = Math.random): string {
  return randomCode(CODE_LENGTH, random);
}

/** Адрес карточки. */
export function imagePath(code: string): string {
  return `/obraz/${code}`;
}
