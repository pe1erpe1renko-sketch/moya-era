/**
 * Слой данных: авторизация, профили, люди, тарифы, подписки, кредиты, чат.
 *
 * Интерфейс один, реализации две:
 *   backend.supabase.ts — боевая, включается при наличии NEXT_PUBLIC_SUPABASE_URL
 *   backend.local.ts    — демо на localStorage, чтобы смотреть продукт без базы
 *
 * Остальной код работает через `backend` и не знает, какая реализация внизу.
 */

import { HAS_SUPABASE } from "@/lib/env";

export type User = { id: string; email: string };
export type Session = { user: User };

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string | null; // YYYY-MM-DD
  birth_time: string | null; // HH:MM
  birth_place: string | null;
  is_owner: boolean;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
};

export type ProfileInsert = Omit<Profile, "id" | "created_at" | "referral_code"> & {
  referral_code?: string | null;
};
export type ProfilePatch = Partial<Pick<Profile, "name" | "birth_date" | "birth_time" | "birth_place">>;

export type Relation = "self" | "partner" | "child" | "mother" | "father" | "friend" | "colleague" | "other";

export const RELATION_LABELS: Record<Relation, string> = {
  self: "Я",
  partner: "Партнёр",
  child: "Ребёнок",
  mother: "Мама",
  father: "Папа",
  friend: "Друг",
  colleague: "Деловой партнёр",
  other: "Другой человек",
};

export type Person = {
  id: string;
  user_id: string;
  name: string;
  relation: Relation;
  birth_date: string; // YYYY-MM-DD
  birth_time: string | null;
  birth_place: string | null;
  sex: "м" | "ж" | null;
  created_at: string;
};

export type PersonInsert = Omit<Person, "id" | "created_at" | "user_id">;
export type PersonPatch = Partial<Pick<Person, "name" | "relation" | "birth_date" | "birth_time" | "birth_place" | "sex">>;

export type Plan = {
  id: string;
  title: string;
  subtitle: string;
  max_people: number | null; // null — без ограничений
  monthly_credits: number;
  price_month: number;
  price_year: number;
  features: string[];
  sort: number;
};

export type CreditPack = { id: string; credits: number; price: number; sort: number };

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "trial" | "active" | "past_due" | "canceled" | "expired";
  period: "month" | "year";
  started_at: string;
  current_period_end: string;
  canceled_at: string | null;
};

export type ChatThread = {
  id: string;
  user_id: string;
  person_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ReadingRow = {
  id: string;
  calc_type: string;
  dates: string[];
  last_opened_at: string;
};

export type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

export interface Backend {
  auth: {
    getSession(): Promise<Session | null>;
    onAuthStateChange(cb: (session: Session | null) => void): () => void;
    signIn(input: { email: string; password: string }): Promise<Result<Session>>;
    signUp(input: { email: string; password: string }): Promise<Result<Session>>;
    signOut(): Promise<void>;
  };
  profiles: {
    getOwner(userId: string): Promise<Result<Profile | null>>;
    insert(row: ProfileInsert): Promise<Result<Profile>>;
    update(id: string, patch: ProfilePatch): Promise<Result<Profile>>;
    myReferralCount(userId: string): Promise<number>;
  };
  people: {
    list(userId: string): Promise<Result<Person[]>>;
    insert(userId: string, row: PersonInsert): Promise<Result<Person>>;
    update(id: string, patch: PersonPatch): Promise<Result<Person>>;
    remove(id: string): Promise<Result<null>>;
  };
  billing: {
    plans(): Promise<Plan[]>;
    creditPacks(): Promise<CreditPack[]>;
    subscription(userId: string): Promise<Subscription | null>;
    creditBalance(userId: string): Promise<number>;
  };
  chat: {
    threads(userId: string): Promise<ChatThread[]>;
    messages(threadId: string): Promise<ChatMessageRow[]>;
    createThread(userId: string, personId: string | null, title: string | null): Promise<Result<ChatThread>>;
  };
  readings: {
    list(userId: string): Promise<ReadingRow[]>;
    touch(userId: string, calcType: string, dates: string[]): Promise<void>;
  };
}

export function ok<T>(data: T): Result<T> {
  return { data, error: null };
}
export function fail<T>(message: string): Result<T> {
  return { data: null, error: { message } };
}

/* Выбор реализации. Импорты — динамические по условию нельзя сделать
 * синхронно, поэтому обе реализации импортируются статически, а выбор
 * идёт по env. Supabase-модуль ничего не делает, пока его не вызовут. */
import { localBackend } from "./backend.local";
import { supabaseBackend } from "./backend.supabase";

export const backend: Backend = HAS_SUPABASE ? supabaseBackend : localBackend;
