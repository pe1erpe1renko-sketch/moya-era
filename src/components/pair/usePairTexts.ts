"use client";

import { useSlotTexts, type LockReason, type SlotText } from "@/components/chart/useSlotTexts";
import type { PairViewId } from "@/lib/pair";

export type PairSlotText = SlotText;
export type PairLockReason = LockReason;

export type PairPersonInput = { date: string; time: string | null; placeId: number | null };

const sig = (p: PairPersonInput) => `${p.date}|${p.time ?? ""}|${p.placeId ?? ""}`;

/**
 * Тексты разбора пары. От одиночных отличается тем, что в подпись входят
 * оба человека и выбранный взгляд: уточнили время одного — это другая
 * пара, и прежние тексты к ней не относятся.
 */
export function usePairTexts(input: { first: PairPersonInput; second: PairPersonInput; view: PairViewId }) {
  return useSlotTexts("/api/content/pair", input, `${input.view}|${sig(input.first)}|${sig(input.second)}`);
}
