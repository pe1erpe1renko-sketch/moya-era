"use client";

import { birthSignature, useSlotTexts, type BirthKey, type LockReason, type SlotText } from "@/components/chart/useSlotTexts";

export type HdSlotText = SlotText;
export type HdLockReason = LockReason;

/** Тексты вопросов бодиграфа. Вся механика — в useSlotTexts. */
export function useHdTexts(input: BirthKey) {
  return useSlotTexts("/api/content/humandesign", input, birthSignature(input));
}
