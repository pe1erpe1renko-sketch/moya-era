import "server-only";

import type { Person, Plan, Subscription } from "@/lib/backend";
import { DEFAULT_PLANS } from "@/lib/plansDefault";
import { DEMO_MODE } from "@/lib/env";
import { supabaseService, currentUser } from "@/server/supabase";
import { datesUnlocked, type AccessState } from "@/lib/access";

export type ServerAccess = AccessState & {
  userId: string | null;
  email: string | null;
  /** демо-режим: всё открыто, база не нужна */
  demo: boolean;
};

/** Загружает всё, что нужно для решения о доступе, за три запроса. */
export async function loadAccess(): Promise<ServerAccess> {
  if (DEMO_MODE) {
    return { userId: "demo", email: null, demo: true, plan: DEFAULT_PLANS[2], subscription: null, people: [] };
  }
  const user = await currentUser();
  if (!user) return { userId: null, email: null, demo: false, plan: null, subscription: null, people: [] };

  const sb = supabaseService();
  if (!sb) return { userId: user.id, email: user.email, demo: false, plan: null, subscription: null, people: [] };

  const [subRes, peopleRes] = await Promise.all([
    sb.rpc("active_subscription", { _user: user.id }),
    sb.from("people").select("*").eq("user_id", user.id),
  ]);

  const subRaw = subRes.data;
  const subscription = ((Array.isArray(subRaw) ? subRaw[0] : subRaw) as Subscription | null) ?? null;
  const people = ((peopleRes.data as Person[] | null) ?? []).map((p) => ({ ...p, birth_date: String(p.birth_date).slice(0, 10) }));

  let plan: Plan | null = null;
  if (subscription?.id) {
    const { data } = await sb.from("plans").select("*").eq("id", subscription.plan_id).maybeSingle();
    plan = (data as Plan | null) ?? DEFAULT_PLANS.find((p) => p.id === subscription.plan_id) ?? null;
  }

  return { userId: user.id, email: user.email, demo: false, plan, subscription: subscription?.id ? subscription : null, people };
}

/** Открыт ли полный разбор по этим датам. */
export function accessUnlocks(access: ServerAccess, dates: string[]): boolean {
  if (access.demo) return true;
  return datesUnlocked(access, dates);
}
