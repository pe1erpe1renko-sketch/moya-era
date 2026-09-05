/**
 * КОД КАРТОЧКИ В АДРЕСЕ — /obraz/k7m2q9xw4t.
 *
 * Случайный, а не выведенный из даты рождения. Из адреса не должно
 * восстанавливаться ничего о человеке: адресами делятся в открытую.
 *
 * Алфавит без похожих букв: ни нуля с буквой «o», ни единицы с «l». Код
 * читают вслух и переписывают руками, и «o» вместо «0» — это чужая
 * карточка или ошибка 404 на ровном месте.
 *
 * Длина 10 при алфавите из 31 знака — это больше 8×10¹⁴ вариантов.
 * Перебором чужую карточку не найти, а на глаз код остаётся коротким.
 */

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const CODE_LENGTH = 10;

const CODE_RE = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

/** Годится ли строка как код. Проверяется до похода в базу. */
export function isImageCode(value: string): boolean {
  return CODE_RE.test(value);
}

/**
 * Новый код.
 * @param random источник случайности; в тестах подменяется на свой
 */
export function newImageCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  }
  return out;
}

/** Адрес карточки. */
export function imagePath(code: string): string {
  return `/obraz/${code}`;
}
