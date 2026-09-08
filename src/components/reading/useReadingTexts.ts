"use client";

import { useCallback, useRef, useState } from "react";

export type SlotText = { text: string; source: string } | { locked: true };

/**
 * Загрузка текстов вопросов пачками. Ключ кэша — id вопроса.
 * Повторные запросы за тем же вопросом не уходят на сервер.
 */
export function useReadingTexts(typeSlug: string, urlDates: string[], initial: Record<string, SlotText> = {}) {
  const [texts, setTexts] = useState<Record<string, SlotText>>(initial);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const pending = useRef<Set<string>>(new Set());
  // Вопросы, на которые сервер не ответил: второй раз не спрашиваем,
  // иначе карточка с недостающим текстом запрашивала бы его в цикле.
  const missing = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (slotIds: string[]) => {
      const need = slotIds.filter((id) => !texts[id] && !pending.current.has(id) && !missing.current.has(id));
      if (need.length === 0) return;
      need.forEach((id) => pending.current.add(id));
      setBusy((b) => new Set([...b, ...need]));
      try {
        const res = await fetch("/api/content/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: typeSlug, dates: urlDates, slots: need }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          answers: Array<{ slotId: string; locked: boolean; text?: string; source?: string }>;
        };
        const answered = new Set(data.answers.map((a) => a.slotId));
        need.forEach((id) => {
          if (!answered.has(id)) missing.current.add(id);
        });
        setTexts((prev) => {
          const next = { ...prev };
          for (const a of data.answers) {
            next[a.slotId] = a.locked ? { locked: true } : { text: a.text ?? "", source: a.source ?? "placeholder" };
          }
          return next;
        });
      } catch {
        /* оставляем пустым — интерфейс покажет «не удалось загрузить» */
      } finally {
        need.forEach((id) => pending.current.delete(id));
        setBusy((b) => {
          const n = new Set(b);
          need.forEach((id) => n.delete(id));
          return n;
        });
      }
    },
    [texts, typeSlug, urlDates],
  );

  /** Сброс замков (после входа или оплаты) — закрытые вопросы перезапросятся. */
  const reset = useCallback(
    () =>
      setTexts((prev) => {
        const next: Record<string, SlotText> = {};
        for (const [k, v] of Object.entries(prev)) if (!("locked" in v)) next[k] = v;
        return next;
      }),
    [],
  );

  return { texts, busy, load, reset };
}
