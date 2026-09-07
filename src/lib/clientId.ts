/**
 * ID КЛИЕНТА — МЭ-7K3F-92QD.
 *
 * Постоянный короткий идентификатор аккаунта: человек называет его в
 * поддержке, и по нему находят именно его, а не однофамильца. Выдаётся
 * один раз при регистрации и не меняется.
 *
 * АЛФАВИТ БЕЗ ПОХОЖИХ ЗНАКОВ: ни нуля с буквой O, ни единицы с I и L.
 * Этот код диктуют по телефону и переписывают с экрана руками; «O» вместо
 * «0» — это чужой аккаунт или ошибка на ровном месте. Заглавные, потому
 * что так читается как номер, а не как слово.
 *
 * Восемь знаков при 31 символе алфавита — около 8,5·10¹¹ вариантов;
 * уникальность всё равно гарантирует база (уникальный индекс и повтор
 * при совпадении), а не вероятность.
 *
 * Тот же алфавит стоит в миграции `generate_client_id`; тест сверяет.
 */

export const CLIENT_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const CLIENT_ID_PREFIX = "МЭ";

/** Сколько знаков в самом коде, без префикса и дефисов. */
export const CLIENT_ID_LENGTH = 8;

/** «7K3F92QD» → «МЭ-7K3F-92QD» */
export function formatClientId(raw: string): string {
  return `${CLIENT_ID_PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

/**
 * Новый ID.
 * @param random источник случайности [0, 1); в тестах подменяется
 */
export function newClientId(random: () => number = Math.random): string {
  let raw = "";
  for (let i = 0; i < CLIENT_ID_LENGTH; i++) {
    raw += CLIENT_ID_ALPHABET[Math.floor(random() * CLIENT_ID_ALPHABET.length) % CLIENT_ID_ALPHABET.length];
  }
  return formatClientId(raw);
}

/** Годится ли строка как ID клиента. */
export function isClientId(value: string): boolean {
  return new RegExp(`^${CLIENT_ID_PREFIX}-[${CLIENT_ID_ALPHABET}]{4}-[${CLIENT_ID_ALPHABET}]{4}$`).test(value);
}
