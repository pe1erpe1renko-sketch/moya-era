import { MONTHS } from "@/lib/arcana";

const KEY = "pendingBirth";

export type PendingBirth = {
  /** ISO-дата, YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time?: string;
  place?: string;
  /** идентификатор направления, с которого пришёл человек */
  direction?: string;
};

export function toIsoDate(day: number, month: number, year: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(month)}-${p(day)}`;
}

export function savePendingBirth(value: PendingBirth): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
}

export function readPendingBirth(): PendingBirth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBirth;
    if (!parsed || typeof parsed.date !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingBirth(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** «26 июля 1990» */
export function formatBirthDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  const month = MONTHS[(m ?? 1) - 1];
  if (!y || !m || !d || !month) return iso;
  return `${d} ${month.toLowerCase()} ${y}`;
}

/** Строка-подсказка для формы регистрации. */
export function formatPendingBirth(value: PendingBirth): string {
  const parts = [`Твоя дата ${formatBirthDate(value.date)}`];
  if (value.time) parts.push(`время ${value.time}`);
  if (value.place) parts.push(value.place);
  return `${parts.join(", ")} сохранится в профиле`;
}

const PROFILE_ERROR_KEY = "profileSaveError";

export function setProfileSaveError(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PROFILE_ERROR_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function takeProfileSaveError(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const had = window.sessionStorage.getItem(PROFILE_ERROR_KEY) === "1";
    if (had) window.sessionStorage.removeItem(PROFILE_ERROR_KEY);
    return had;
  } catch {
    return false;
  }
}
