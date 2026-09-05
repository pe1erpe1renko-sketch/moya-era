/**
 * КОРОТКИЕ КОДЫ ДЛЯ АДРЕСОВ И ССЫЛОК.
 *
 * Одна реализация на всех, кому нужен случайный код: адрес карточки
 * образа (/obraz/<код>) и ссылка привязки телеграм-бота
 * (t.me/bot?start=КОД).
 *
 * Алфавит без похожих знаков: ни нуля с буквой «o», ни единицы с «l».
 * Коды читают вслух и переписывают руками, и «o» вместо «0» — это чужая
 * карточка или ошибка на ровном месте.
 *
 * Коды НЕ выводятся из данных человека. Из адреса не должно
 * восстанавливаться ничего: и адресами карточек, и ссылками привязки
 * делятся в открытую.
 */

export const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/**
 * Новый код.
 * @param length сколько знаков; 10 при этом алфавите — больше 8×10¹⁴ вариантов
 * @param random источник случайности; в тестах подменяется на свой
 */
export function randomCode(length: number, random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return out;
}

/** Годится ли строка как код нужной длины. Проверяется до похода в базу. */
export function isShortCode(value: string, length: number): boolean {
  return new RegExp(`^[${CODE_ALPHABET}]{${length}}$`).test(value);
}
