"use client";

import { useCallback, useRef, useState } from "react";

export type NatalSlotText = { text: string; source: string } | { locked: true };

export type NatalLockReason = "no_subscription" | "person_not_added" | "not_logged_in";

/**
 * Загрузка текстов вопросов натальной карты пачками. Устроена так же, как
 * `useReadingTexts` у матрицы: один запрос на пачку, повторно за тем же
 * вопросом не ходим.
 */
export function useNatalTexts(input: { date: string; time: string | null; placeId: number | null }) {
  const [texts, setTexts] = useState<Record<string, NatalSlotText>>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [unlocked, setUnlocked] = useState(false);
  const [reason, setReason] = useState<NatalLockReason | null>(null);
  const pending = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (slotIds: string[]) => {
      const need = slotIds.filter((id) => !texts[id] && !pending.current.has(id));
      if (need.length === 0) return;
      need.forEach((id) => pending.current.add(id));
      setBusy((b) => new Set([...b, ...need]));
      try {
        const res = await fetch("/api/content/natal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, slots: need }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          unlocked: boolean;
          reason: NatalLockReason | null;
          answers: Array<{ slotId: string; locked: boolean; text?: string; source?: string }>;
        };
        setUnlocked(data.unlocked);
        setReason(data.reason);
        setTexts((prev) => {
          const next = { ...prev };
          for (const a of data.answers) {
            next[a.slotId] = a.locked ? { locked: true } : { text: a.text ?? "", source: a.source ?? "placeholder" };
          }
          return next;
        });
      } catch {
        /* интерфейс покажет, что текст не загрузился */
      } finally {
        need.forEach((id) => pending.current.delete(id));
        setBusy((b) => {
          const n = new Set(b);
          need.forEach((id) => n.delete(id));
          return n;
        });
      }
    },
    [texts, input],
  );

  /** Сброс замков после входа или оплаты. */
  const reset = useCallback(
    () =>
      setTexts((prev) => {
        const next: Record<string, NatalSlotText> = {};
        for (const [k, v] of Object.entries(prev)) if (!("locked" in v)) next[k] = v;
        return next;
      }),
    [],
  );

  return { texts, busy, unlocked, reason, load, reset };
}
