/**
 * Слой данных: авторизация и профили.
 *
 * Сейчас это ЛОКАЛЬНАЯ ЗАГЛУШКА на localStorage — чтобы воронку
 * (регистрация → кабинет → оформление) можно было пройти без сервера.
 * Пароли и профили живут только в браузере пользователя.
 *
 * Для боевой версии этот файл заменяется адаптером к Supabase
 * (схема таблицы profiles — в `supabase/migrations`). Интерфейс `Backend`
 * остаётся тем же, остальной код трогать не нужно.
 */

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
export type ProfilePatch = Partial<
  Pick<Profile, "name" | "birth_date" | "birth_time" | "birth_place">
>;

type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

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
}

/* ────────────────────────────────────────────────────────────────────── */
/* Локальная реализация                                                    */
/* ────────────────────────────────────────────────────────────────────── */

const USERS_KEY = "moyaera.local.users";
const PROFILES_KEY = "moyaera.local.profiles";
const SESSION_KEY = "moyaera.local.session";

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

function emit(session: Session | null) {
  listeners.forEach((cb) => cb(session));
}

function currentSession(): Session | null {
  return read<Session | null>(SESSION_KEY, null);
}

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}
function fail<T>(message: string): Result<T> {
  return { data: null, error: { message } };
}

// Небольшая задержка — чтобы интерфейс вёл себя как с настоящей сетью.
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const backend: Backend = {
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
      return ok(own[0] ?? null);
    },

    async insert(row) {
      await delay(150);
      const all = read<Profile[]>(PROFILES_KEY, []);
      const profile: Profile = {
        ...row,
        id: uid(),
        created_at: new Date().toISOString(),
        referral_code: row.is_owner ? (row.referral_code ?? referralCode(all)) : null,
      };
      write(PROFILES_KEY, [...all, profile]);
      return ok(profile);
    },

    async update(id, patch) {
      await delay(150);
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
};
