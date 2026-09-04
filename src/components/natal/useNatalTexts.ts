"use client";

import { birthSignature, useSlotTexts, type BirthKey, type LockReason, type SlotText } from "@/components/chart/useSlotTexts";

export type NatalSlotText = SlotText;
export type NatalLockReason = LockReason;

/** Тексты вопросов натальной карты. Вся механика — в useSlotTexts. */
export function useNatalTexts(input: BirthKey) {
  return useSlotTexts("/api/content/natal", input, birthSignature(input));
}
