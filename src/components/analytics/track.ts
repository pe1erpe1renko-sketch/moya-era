"use client";

import { METRIKA_ID } from "@/lib/env";

type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

/**
 * События воронки. Имена — стабильные, по ним строятся цели в Метрике:
 *   calc_submit, reading_view, paywall_open, signup, login, person_add,
 *   checkout_open, checkout_pay, chat_message
 */
export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[track]", event, params);
  }
  if (METRIKA_ID && window.ym) {
    try {
      window.ym(Number(METRIKA_ID), "reachGoal", event, params);
    } catch {
      /* ignore */
    }
  }
}
