"use client";

import { useCallback, useRef, useState } from "react";

export type SlotText = { text: string; source: string } | { locked: true };

export type LockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type BirthKey = { date: string; time: string | null; placeId: number | null };

/**
 * Загрузка текстов разбора пачками. Одна на натальную карту и на дизайн
 * человека: отличается только адрес API.
 *
 * Тексты привязаны к данным рождения. Уточнили время и место — это ДРУГАЯ
 * карта: Луна может стоять в другом знаке, центр — оказаться открытым.
 * Поэтому у набора текстов есть подпись из даты, времени и места. При её
 * смене прежние тексты отбрасываются, а ответ на запрос по прежней подписи
 * отбрасывается тоже. Иначе человек уточнил бы время и читал разбор старой
 * карты — хуже, чем не показать ничего.
 */

type Store = { sig: string; texts: Record<string, SlotText> };

/** Одна и та же пустая карта, чтобы её ссылка не менялась от рендера к рендеру. */
const NOTHING: Record<string, SlotText> = {};

const signatureOf = (input: BirthKey) => `${input.date}|${input.time ?? ""}|${input.placeId ?? ""}`;

export function useSlotTexts(endpoint: string, input: BirthKey) {
  const signature = signatureOf(input);
  const [state, setState] = useState<Store>({ sig: signature, texts: {} });
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [unlocked, setUnlocked] = useState(false);
  const [reason, setReason] = useState<LockReason | null>(null);
  // Ключи запросов в полёте, вместе с подписью: `1990-07-26||524901:natal_brief_sun`.
  const pending = useRef<Set<string>>(new Set());

  // Данные рождения сменились — начинаем с чистого листа. Правка состояния
  // прямо в рендере: React тут же перезапустит рендер с новым значением,
  // и load ниже уже не увидит чужих текстов.
  if (state.sig !== signature) setState({ sig: signature, texts: {} });
  const texts = state.sig === signature ? state.texts : NOTHING;

  const load = useCallback(
    async (slotIds: string[]) => {
      const sig = signature;
      const need = slotIds.filter((id) => !texts[id] && !pending.current.has(`${sig}:${id}`));
      if (need.length === 0) return;
      need.forEach((id) => pending.current.add(`${sig}:${id}`));
      setBusy((b) => new Set([...b, ...need]));
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, slots: need }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          unlocked: boolean;
          reason: LockReason | null;
          answers: Array<{ slotId: string; locked: boolean; text?: string; source?: string }>;
        };
        // Подписка и причина замка от карты не зависят — их принимаем всегда.
        setUnlocked(data.unlocked);
        setReason(data.reason);
        setState((prev) => {
          if (prev.sig !== sig) return prev; // ответ на прежнюю карту — выбрасываем
          const next = { ...prev.texts };
          for (const a of data.answers) {
            next[a.slotId] = a.locked ? { locked: true } : { text: a.text ?? "", source: a.source ?? "placeholder" };
          }
          return { sig, texts: next };
        });
      } catch {
        /* интерфейс покажет, что текст не загрузился */
      } finally {
        need.forEach((id) => pending.current.delete(`${sig}:${id}`));
        setBusy((b) => {
          const n = new Set(b);
          need.forEach((id) => n.delete(id));
          return n;
        });
      }
    },
    [endpoint, input, signature, texts],
  );

  /** Сброс замков после входа или оплаты. */
  const reset = useCallback(
    () =>
      setState((prev) => {
        const next: Record<string, SlotText> = {};
        for (const [k, v] of Object.entries(prev.texts)) if (!("locked" in v)) next[k] = v;
        return { sig: prev.sig, texts: next };
      }),
    [],
  );

  return { texts, busy, unlocked, reason, load, reset };
}
