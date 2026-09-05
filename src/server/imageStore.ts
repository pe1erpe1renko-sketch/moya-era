import "server-only";

import { randomInt } from "node:crypto";
import { isImageCode, newImageCode } from "@/lib/image/code";
import { supabaseService } from "@/server/supabase";

/**
 * ХРАНИЛИЩЕ КАРТОЧЕК ОБРАЗА.
 *
 * Запись создаётся один раз при нажатии «Скачать» и дальше не меняется:
 * карточку уже выложили, менять то, что по ссылке, нельзя.
 *
 * ЧИТАЕТСЯ СЕРВИСНЫМ КЛЮЧОМ. Из браузера таблица не читается вовсе — см.
 * миграцию: политика «читать всем» позволила бы выгрузить её целиком, то
 * есть все имена и даты разом. Случайный код защищает одну карточку, но
 * не от выборки без условия.
 *
 * БЕЗ SUPABASE карточки живут в памяти процесса. Это нужно, чтобы
 * продукт можно было посмотреть целиком до подключения базы — так же
 * работают и остальные части в демо-режиме. На нескольких серверах такая
 * память не общая, и ссылка, открытая на другом, вернёт «не найдено»:
 * в бою это не проблема, потому что там есть база, а в демо-режиме
 * ссылку и не пересылают.
 */

export type StoredImage = {
  code: string;
  theme: string;
  label: string;
  arcana: number;
  title: string | null;
  line: string | null;
  name: string | null;
  birthDate: string | null;
  createdAt: string;
};

export type NewImage = Omit<StoredImage, "code" | "createdAt"> & { userId: string | null };

/**
 * Память демо-режима висит на globalThis, а не в модуле.
 *
 * Next собирает серверный код отдельно для каждого маршрута, и обычная
 * переменная модуля у страницы и у обработчика запроса оказывается
 * РАЗНОЙ: карточка создавалась бы в одном экземпляре, а искалась в
 * другом, и страница честно отвечала бы «не найдено».
 */
const globalMemory = globalThis as typeof globalThis & { __eraImages?: Map<string, StoredImage> };
const memory: Map<string, StoredImage> = (globalMemory.__eraImages ??= new Map());

/** Случайность берём криптографическую: коды не должны быть предсказуемы. */
const secureRandom = () => randomInt(0, 1_000_000) / 1_000_000;

function rowToImage(r: Record<string, unknown>): StoredImage {
  return {
    code: String(r.code),
    theme: String(r.theme),
    label: String(r.label),
    arcana: Number(r.arcana),
    title: (r.title as string | null) ?? null,
    line: (r.line as string | null) ?? null,
    name: (r.name as string | null) ?? null,
    birthDate: (r.birth_date as string | null) ?? null,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

/** Сохраняет карточку и возвращает её код. */
export async function saveImage(input: NewImage): Promise<string> {
  const sb = supabaseService();

  // Повтор кода почти невозможен, но «почти» здесь означало бы чужую
  // карточку по вашей ссылке — поэтому пробуем несколько раз.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newImageCode(secureRandom);

    if (!sb) {
      if (memory.has(code)) continue;
      memory.set(code, { ...input, code, createdAt: new Date().toISOString() });
      return code;
    }

    const { error } = await sb.from("images").insert({
      code,
      theme: input.theme,
      label: input.label,
      arcana: input.arcana,
      title: input.title,
      line: input.line,
      name: input.name,
      birth_date: input.birthDate,
      user_id: input.userId,
    });
    if (!error) return code;
    // 23505 — код уже занят: берём новый. Остальное — настоящая ошибка.
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Не удалось подобрать свободный код");
}

/** Карточка по коду. null — такой нет. */
export async function loadImage(code: string): Promise<StoredImage | null> {
  if (!isImageCode(code)) return null;

  const sb = supabaseService();
  if (!sb) return memory.get(code) ?? null;

  const { data, error } = await sb.from("images").select("*").eq("code", code).maybeSingle();
  if (error || !data) return null;
  return rowToImage(data as Record<string, unknown>);
}
