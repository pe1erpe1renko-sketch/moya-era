import "server-only";

import { supabaseService } from "@/server/supabase";

/**
 * КРЕДИТЫ: СПИСАНИЕ ДО ГЕНЕРАЦИИ, ВОЗВРАТ ПРИ НЕУДАЧЕ.
 *
 * Одна механика на всех, кто зовёт нейросеть без кэша: наставник и живой
 * расклад. Порядок строгий и менять его нельзя:
 *
 *   списать → сгенерировать → не вышло → вернуть
 *
 * Наоборот («сгенерировать, потом списать») означает, что при сбое
 * записи в базу человек получил текст бесплатно, а при двойном нажатии —
 * два текста по цене одного. Списание вперёд — это плата за
 * попытку, и потому возврат обязателен: не получил текста — не платил.
 *
 * СПИСАНИЕ АТОМАРНО. Функция в базе берёт advisory-лок на пользователя,
 * проверяет баланс и пишет одну строку. Семь отдельных списаний по
 * одному кредиту были бы семью транзакциями: на четвёртой мог бы
 * кончиться баланс, и человек остался бы и без кредитов, и без расклада.
 */

export type SpendResult =
  | { ok: true; left: number }
  | { ok: false; reason: "no_credits" | "error" };

/**
 * Списывает кредиты.
 * @param ref на что списано: id треда или расклада — по нему находится возврат
 */
export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
  ref: string,
): Promise<SpendResult> {
  const sb = supabaseService();
  if (!sb) return { ok: false, reason: "error" };

  const { data, error } = await sb.rpc("spend_credits", {
    _user: userId,
    _amount: amount,
    _reason: reason,
    _ref: ref,
  });
  if (error) return { ok: false, reason: "error" };
  const left = Number(data);
  if (left < 0) return { ok: false, reason: "no_credits" };
  return { ok: true, left };
}

/**
 * Возвращает списанное.
 *
 * Возврат — отдельная строка в журнале, а не удаление списания: по
 * журналу должно быть видно, что попытка была и чем кончилась. Иначе
 * разбираться в спорном случае будет не с чем.
 */
export async function refundCredits(userId: string, amount: number, ref: string): Promise<void> {
  const sb = supabaseService();
  if (!sb || amount < 1) return;
  await sb.from("credits_ledger").insert({ user_id: userId, delta: amount, reason: "refund", ref });
}

/** Сколько кредитов осталось. Нужен витрине раскладов: цена видна заранее. */
export async function creditBalance(userId: string): Promise<number> {
  const sb = supabaseService();
  if (!sb) return 0;
  const { data, error } = await sb.rpc("credit_balance", { _user: userId });
  if (error) return 0;
  return Number(data) || 0;
}
