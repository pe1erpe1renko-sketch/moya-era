/**
 * БОЕВАЯ РЕАЛИЗАЦИЯ на Supabase.
 * Схема — в supabase/migrations. Все таблицы под RLS: пользователь видит
 * только своё. Подписки, кредиты и сообщения чата пишет сервер.
 */

import { supabaseBrowser } from "@/lib/supabase/browser";
import {
  ok,
  fail,
  type Backend,
  type Profile,
  type Person,
  type Session,
  type Plan,
  type CreditPack,
  type Subscription,
  type ChatThread,
  type ChatMessageRow,
  type ReadingRow,
} from "./backend";
import { DEFAULT_CREDIT_PACKS, DEFAULT_PLANS } from "./plansDefault";

type SbSession = { user: { id: string; email?: string | null } } | null;

function toSession(s: SbSession): Session | null {
  if (!s?.user) return null;
  return { user: { id: s.user.id, email: s.user.email ?? "" } };
}

function msg(e: { message?: string } | null | undefined, fallback = "unknown error") {
  return e?.message ?? fallback;
}

export const supabaseBackend: Backend = {
  auth: {
    async getSession() {
      const { data } = await supabaseBrowser().auth.getSession();
      return toSession(data.session);
    },
    onAuthStateChange(cb) {
      const { data } = supabaseBrowser().auth.onAuthStateChange((_event: string, session: SbSession) => {
        cb(toSession(session));
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn({ email, password }) {
      const { data, error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) return fail(error.message);
      const s = toSession(data.session);
      return s ? ok(s) : fail("no session");
    },
    async signUp({ email, password }) {
      const { data, error } = await supabaseBrowser().auth.signUp({ email, password });
      if (error) return fail(error.message);
      // Если в проекте включено подтверждение почты, сессии ещё нет —
      // интерфейс покажет «проверьте почту».
      const s = toSession(data.session);
      return s ? ok(s) : fail("confirm_email");
    },
    async signOut() {
      await supabaseBrowser().auth.signOut();
    },
  },

  profiles: {
    async getOwner(userId) {
      const { data, error } = await supabaseBrowser()
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("is_owner", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return fail(msg(error));
      return ok((data as Profile | null) ?? null);
    },
    async insert(row) {
      const { data, error } = await supabaseBrowser().from("profiles").insert(row).select("*").single();
      if (error) return fail(msg(error));
      return ok(data as Profile);
    },
    async update(id, patch) {
      const { data, error } = await supabaseBrowser().from("profiles").update(patch).eq("id", id).select("*").single();
      if (error) return fail(msg(error));
      return ok(data as Profile);
    },
    async myReferralCount() {
      const { data, error } = await supabaseBrowser().rpc("my_referral_count");
      if (error) return 0;
      return Number(data ?? 0);
    },
  },

  people: {
    async list(userId) {
      const { data, error } = await supabaseBrowser()
        .from("people")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) return fail(msg(error));
      const rows = (data as Person[]).map((p) => ({ ...p, birth_date: String(p.birth_date).slice(0, 10) }));
      rows.sort((a, b) => (a.relation === "self" ? -1 : b.relation === "self" ? 1 : 0));
      return ok(rows);
    },
    async insert(userId, row) {
      const { data, error } = await supabaseBrowser()
        .from("people")
        .insert({ ...row, user_id: userId })
        .select("*")
        .single();
      if (error) return fail(msg(error));
      return ok(data as Person);
    },
    async update(id, patch) {
      const { data, error } = await supabaseBrowser().from("people").update(patch).eq("id", id).select("*").single();
      if (error) return fail(msg(error));
      return ok(data as Person);
    },
    async remove(id) {
      const { error } = await supabaseBrowser().from("people").delete().eq("id", id);
      if (error) return fail(msg(error));
      return ok(null);
    },
  },

  billing: {
    async plans() {
      const { data, error } = await supabaseBrowser().from("plans").select("*").eq("active", true).order("sort");
      if (error || !data?.length) return DEFAULT_PLANS;
      return (data as Plan[]).map((p) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] }));
    },
    async creditPacks() {
      const { data, error } = await supabaseBrowser().from("credit_packs").select("*").eq("active", true).order("sort");
      if (error || !data?.length) return DEFAULT_CREDIT_PACKS;
      return data as CreditPack[];
    },
    async subscription(userId) {
      const { data, error } = await supabaseBrowser().rpc("active_subscription", { _user: userId });
      if (error || !data) return null;
      const row = (Array.isArray(data) ? data[0] : data) as Subscription | null;
      return row && row.id ? row : null;
    },
    async creditBalance(userId) {
      const { data, error } = await supabaseBrowser().rpc("credit_balance", { _user: userId });
      if (error) return 0;
      return Number(data ?? 0);
    },
    async cancel() {
      // Строки подписок клиент только читает; отмену делает сервер.
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      return res.ok;
    },
  },

  chat: {
    async threads(userId) {
      const { data } = await supabaseBrowser()
        .from("chat_threads")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      return (data as ChatThread[]) ?? [];
    },
    async messages(threadId) {
      const { data } = await supabaseBrowser()
        .from("chat_messages")
        .select("id, thread_id, role, content, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      return (data as ChatMessageRow[]) ?? [];
    },
    async createThread(userId, personId, title) {
      const { data, error } = await supabaseBrowser()
        .from("chat_threads")
        .insert({ user_id: userId, person_id: personId, title })
        .select("*")
        .single();
      if (error) return fail(msg(error));
      return ok(data as ChatThread);
    },
  },

  readings: {
    async list(userId) {
      const { data } = await supabaseBrowser()
        .from("readings")
        .select("id, calc_type, dates, last_opened_at")
        .eq("user_id", userId)
        .order("last_opened_at", { ascending: false })
        .limit(50);
      return (data as ReadingRow[]) ?? [];
    },
    async touch(userId, calcType, dates) {
      await supabaseBrowser()
        .from("readings")
        .upsert(
          { user_id: userId, calc_type: calcType, dates, last_opened_at: new Date().toISOString() },
          { onConflict: "user_id,calc_type,dates" },
        );
    },
  },
};
