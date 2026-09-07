/**
 * ДЕМО-РЕАЛИЗАЦИЯ на localStorage.
 *
 * Нужна, чтобы пройти продукт целиком без Supabase: регистрация → люди →
 * разборы → кабинет. Пароли и данные живут в браузере пользователя.
 * В бою не используется: при заданных NEXT_PUBLIC_SUPABASE_* включается
 * backend.supabase.ts.
 */

import { newClientId } from "@/lib/clientId";
import {
  ok,
  fail,
  type Backend,
  type Profile,
  type Person,
  type Session,
  type User,
  type Subscription,
  type ChatThread,
  type ChatMessageRow,
  type ReadingRow,
} from "./backend";
import { DEFAULT_CREDIT_PACKS, DEFAULT_PLANS, WELCOME_CREDITS } from "./plansDefault";

const USERS_KEY = "moyaera.local.users";
const PROFILES_KEY = "moyaera.local.profiles";
const PEOPLE_KEY = "moyaera.local.people";
const SESSION_KEY = "moyaera.local.session";
const SUBS_KEY = "moyaera.local.subscriptions";
const CREDITS_KEY = "moyaera.local.credits";
const THREADS_KEY = "moyaera.local.threads";
const MESSAGES_KEY = "moyaera.local.messages";
const READINGS_KEY = "moyaera.local.readings";

type StoredUser = User & { password: string };

const listeners = new Set<(s: Session | null) => void>();
const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно */
  }
}

function uid() {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function referralCode(existing: Profile[]) {
  for (;;) {
    let code = "";
    for (let i = 0; i < 8; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!existing.some((p) => p.referral_code === code)) return code;
  }
}

/** ID клиента: как в базе — один раз, с повтором при совпадении. */
function clientId(existing: Profile[]) {
  for (;;) {
    const id = newClientId();
    if (!existing.some((p) => p.client_id === id)) return id;
  }
}

function emit(session: Session | null) {
  listeners.forEach((cb) => cb(session));
}

function currentSession(): Session | null {
  return read<Session | null>(SESSION_KEY, null);
}

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

type CreditRow = { user_id: string; delta: number; reason: string; created_at: string };

export const localBackend: Backend = {
  auth: {
    async getSession() {
      return currentSession();
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === SESSION_KEY) cb(currentSession());
      };
      if (isBrowser()) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        if (isBrowser()) window.removeEventListener("storage", onStorage);
      };
    },
    async signIn({ email, password }) {
      await delay();
      const users = read<StoredUser[]>(USERS_KEY, []);
      const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!u || u.password !== password) return fail("invalid credentials");
      const session: Session = { user: { id: u.id, email: u.email } };
      write(SESSION_KEY, session);
      emit(session);
      return ok(session);
    },
    async signUp({ email, password }) {
      await delay();
      const users = read<StoredUser[]>(USERS_KEY, []);
      if (users.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
        return fail("user already registered");
      }
      const u: StoredUser = { id: uid(), email, password };
      write(USERS_KEY, [...users, u]);
      // приветственные кредиты — как триггер в базе
      const credits = read<CreditRow[]>(CREDITS_KEY, []);
      write(CREDITS_KEY, [
        ...credits,
        { user_id: u.id, delta: WELCOME_CREDITS, reason: "welcome", created_at: new Date().toISOString() },
      ]);
      const session: Session = { user: { id: u.id, email: u.email } };
      write(SESSION_KEY, session);
      emit(session);
      return ok(session);
    },
    async signOut() {
      if (isBrowser()) window.localStorage.removeItem(SESSION_KEY);
      emit(null);
    },
  },

  profiles: {
    async getOwner(userId) {
      const all = read<Profile[]>(PROFILES_KEY, []);
      const own = all
        .filter((p) => p.user_id === userId && p.is_owner)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const owner = own[0] ?? null;
      // Профили, заведённые до появления ID, получают его при первом
      // обращении — как в базе это делает миграция.
      if (owner && !owner.client_id) {
        const next = { ...owner, client_id: clientId(all) };
        write(PROFILES_KEY, all.map((p) => (p.id === owner.id ? next : p)));
        return ok(next);
      }
      return ok(owner);
    },
    async insert(row) {
      await delay(120);
      const all = read<Profile[]>(PROFILES_KEY, []);
      const profile: Profile = {
        ...row,
        id: uid(),
        created_at: new Date().toISOString(),
        referral_code: row.is_owner ? (row.referral_code ?? referralCode(all)) : null,
        client_id: row.is_owner ? (row.client_id ?? clientId(all)) : null,
      };
      write(PROFILES_KEY, [...all, profile]);
      return ok(profile);
    },
    async update(id, patch) {
      await delay(120);
      const all = read<Profile[]>(PROFILES_KEY, []);
      const idx = all.findIndex((p) => p.id === id);
      if (idx < 0) return fail("profile not found");
      const next = { ...all[idx], ...patch };
      all[idx] = next;
      write(PROFILES_KEY, all);
      return ok(next);
    },
    async myReferralCount(userId) {
      const all = read<Profile[]>(PROFILES_KEY, []);
      const codes = new Set(
        all.filter((p) => p.user_id === userId && p.is_owner && p.referral_code).map((p) => p.referral_code),
      );
      return all.filter((p) => p.referred_by && codes.has(p.referred_by)).length;
    },
  },

  people: {
    async list(userId) {
      const all = read<Person[]>(PEOPLE_KEY, []);
      return ok(
        all
          .filter((p) => p.user_id === userId)
          .sort((a, b) => (a.relation === "self" ? -1 : b.relation === "self" ? 1 : a.created_at.localeCompare(b.created_at))),
      );
    },
    async insert(userId, row) {
      await delay(120);
      const all = read<Person[]>(PEOPLE_KEY, []);
      if (row.relation === "self" && all.some((p) => p.user_id === userId && p.relation === "self")) {
        return fail("self already exists");
      }
      const person: Person = { ...row, id: uid(), user_id: userId, created_at: new Date().toISOString() };
      write(PEOPLE_KEY, [...all, person]);
      return ok(person);
    },
    async update(id, patch) {
      await delay(120);
      const all = read<Person[]>(PEOPLE_KEY, []);
      const idx = all.findIndex((p) => p.id === id);
      if (idx < 0) return fail("person not found");
      all[idx] = { ...all[idx], ...patch };
      write(PEOPLE_KEY, all);
      return ok(all[idx]);
    },
    async remove(id) {
      const all = read<Person[]>(PEOPLE_KEY, []);
      write(PEOPLE_KEY, all.filter((p) => p.id !== id));
      return ok(null);
    },
  },

  billing: {
    async plans() {
      return DEFAULT_PLANS;
    },
    async creditPacks() {
      return DEFAULT_CREDIT_PACKS;
    },
    async subscription(userId) {
      const all = read<Subscription[]>(SUBS_KEY, []);
      const now = Date.now();
      return (
        all
          .filter((s) => s.user_id === userId && new Date(s.current_period_end).getTime() > now && s.status !== "canceled")
          .sort((a, b) => b.current_period_end.localeCompare(a.current_period_end))[0] ?? null
      );
    },
    async creditBalance(userId) {
      const all = read<CreditRow[]>(CREDITS_KEY, []);
      return all.filter((c) => c.user_id === userId).reduce((s, c) => s + c.delta, 0);
    },
    async cancel(userId) {
      const all = read<Subscription[]>(SUBS_KEY, []);
      const now = new Date().toISOString();
      // Статус не трогаем: «canceled» выключил бы доступ сразу, а он
      // оплачен до конца периода. Отмена — это отметка и конец продлений.
      write(
        SUBS_KEY,
        all.map((s) => (s.user_id === userId && !s.canceled_at ? { ...s, canceled_at: now } : s)),
      );
      return true;
    },
  },

  chat: {
    async threads(userId) {
      return read<ChatThread[]>(THREADS_KEY, [])
        .filter((t) => t.user_id === userId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    async messages(threadId) {
      return read<ChatMessageRow[]>(MESSAGES_KEY, [])
        .filter((m) => m.thread_id === threadId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async createThread(userId, personId, title) {
      const all = read<ChatThread[]>(THREADS_KEY, []);
      const now = new Date().toISOString();
      const t: ChatThread = { id: uid(), user_id: userId, person_id: personId, title, created_at: now, updated_at: now };
      write(THREADS_KEY, [...all, t]);
      return ok(t);
    },
  },

  readings: {
    async list(userId) {
      return read<(ReadingRow & { user_id: string })[]>(READINGS_KEY, [])
        .filter((r) => r.user_id === userId)
        .sort((a, b) => b.last_opened_at.localeCompare(a.last_opened_at));
    },
    async touch(userId, calcType, dates) {
      const all = read<(ReadingRow & { user_id: string })[]>(READINGS_KEY, []);
      const now = new Date().toISOString();
      const idx = all.findIndex(
        (r) => r.user_id === userId && r.calc_type === calcType && r.dates.join("|") === dates.join("|"),
      );
      if (idx >= 0) all[idx] = { ...all[idx], last_opened_at: now };
      else all.push({ id: uid(), user_id: userId, calc_type: calcType, dates, last_opened_at: now });
      write(READINGS_KEY, all);
    },
  },
};

/* Демо-помощники: кредиты и подписка без оплаты — только в демо-режиме. */
export const localDemo = {
  addCredits(userId: string, delta: number, reason: string) {
    const all = read<CreditRow[]>(CREDITS_KEY, []);
    write(CREDITS_KEY, [...all, { user_id: userId, delta, reason, created_at: new Date().toISOString() }]);
  },
  activate(userId: string, planId: string, period: "month" | "year") {
    const all = read<Subscription[]>(SUBS_KEY, []);
    const end = new Date();
    end.setMonth(end.getMonth() + (period === "year" ? 12 : 1));
    const sub: Subscription = {
      id: uid(),
      user_id: userId,
      plan_id: planId,
      status: "active",
      period,
      started_at: new Date().toISOString(),
      current_period_end: end.toISOString(),
      canceled_at: null,
    };
    write(SUBS_KEY, [...all.filter((s) => s.user_id !== userId), sub]);
    const plan = DEFAULT_PLANS.find((p) => p.id === planId);
    if (plan) localDemo.addCredits(userId, plan.monthly_credits, "plan_grant");
  },
  appendMessage(threadId: string, role: "user" | "assistant", content: string) {
    const all = read<ChatMessageRow[]>(MESSAGES_KEY, []);
    const m: ChatMessageRow = { id: uid(), thread_id: threadId, role, content, created_at: new Date().toISOString() };
    write(MESSAGES_KEY, [...all, m]);
    const threads = read<ChatThread[]>(THREADS_KEY, []);
    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx >= 0) {
      threads[idx] = { ...threads[idx], updated_at: m.created_at };
      write(THREADS_KEY, threads);
    }
    return m;
  },
};
