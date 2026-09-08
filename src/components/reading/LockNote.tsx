"use client";

/**
 * Строка под закрытым вопросом. Одна на все разборы — и смысл один:
 * закрытое открывает подписка, та же, что открывает всё остальное.
 * «Что входит» открывает общий замок.
 */
export function LockNote({ onOpen }: { onOpen: () => void }) {
  return (
    <p className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
      Открывает подписка — одна на все шесть систем.{" "}
      <button type="button" onClick={onOpen} className="tap text-text-accent underline-offset-4 hover:underline">
        Что входит
      </button>
    </p>
  );
}
