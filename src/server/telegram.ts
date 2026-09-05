import "server-only";

import { BOT_TOKEN, HAS_BOT } from "@/lib/env";

/**
 * КЛИЕНТ ТЕЛЕГРАМА — ровно те методы, которые нужны боту.
 *
 * Никакой библиотеки: у нас четыре вызова, а любая обёртка притащила бы
 * свой жизненный цикл, свои таймеры и своё представление о том, как
 * держать соединение, — всё это в бессерверной функции лишнее.
 *
 * ЗАБЛОКИРОВАЛ БОТА — это не ошибка, а состояние. Телеграм отвечает 403,
 * и это единственный честный способ узнать, что слать больше некому.
 * Такой ответ надо не глотать и не считать сбоем, а пометить привязку,
 * иначе очередь будет вечно упираться в мёртвые чаты.
 */

export type SendResult =
  | { ok: true }
  | { ok: false; blocked: true }
  | { ok: false; blocked: false; retryAfter?: number; error: string };

export type Button = { text: string; url?: string; data?: string };

const api = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

function keyboard(rows: Button[][] | undefined) {
  if (!rows?.length) return undefined;
  return {
    inline_keyboard: rows.map((row) =>
      row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data ?? b.text })),
    ),
  };
}

async function call(method: string, body: Record<string, unknown>): Promise<SendResult> {
  if (!HAS_BOT) return { ok: false, blocked: false, error: "бот выключен: нет TELEGRAM_BOT_TOKEN" };
  try {
    const res = await fetch(api(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };

    const data = (await res.json().catch(() => ({}))) as {
      description?: string;
      parameters?: { retry_after?: number };
    };
    const description = data.description ?? `HTTP ${res.status}`;

    // 403 — бот заблокирован или выкинут из чата. Слать больше некому.
    if (res.status === 403) return { ok: false, blocked: true };
    // 400 «chat not found» означает то же самое: чата больше нет.
    if (res.status === 400 && /chat not found|user is deactivated/i.test(description)) {
      return { ok: false, blocked: true };
    }
    return { ok: false, blocked: false, retryAfter: data.parameters?.retry_after, error: description };
  } catch (e) {
    return { ok: false, blocked: false, error: (e as Error).message };
  }
}

/** Обычное сообщение с кнопками. Разметку не используем: текст и так чистый. */
export function sendMessage(chatId: number, text: string, buttons?: Button[][]): Promise<SendResult> {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: keyboard(buttons),
    // Ссылки в сводке не разворачиваем: превью крадёт экран у текста.
    link_preview_options: { is_disabled: true },
  });
}

/** Ответ на нажатие кнопки: без него телеграм оставляет часики на кнопке. */
export function answerCallback(id: string, text?: string): Promise<SendResult> {
  return call("answerCallbackQuery", { callback_query_id: id, text });
}

/** Правка уже отправленного сообщения — так меняются переключатели. */
export function editMessage(chatId: number, messageId: number, text: string, buttons?: Button[][]): Promise<SendResult> {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: keyboard(buttons),
    link_preview_options: { is_disabled: true },
  });
}
