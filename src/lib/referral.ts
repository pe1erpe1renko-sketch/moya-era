const KEY = "pendingRef";

/** Сохраняет код пригласившего (параметр ref) на время сессии. */
export function savePendingRef(code: string): void {
  if (typeof window === "undefined") return;
  const clean = code.trim().slice(0, 32);
  if (!clean) return;
  try {
    window.sessionStorage.setItem(KEY, clean);
  } catch {
    /* приватный режим — просто не сохраняем */
  }
}

export function readPendingRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingRef(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Ссылка-приглашение для блока «Пригласить друга». */
export function referralLink(code: string): string {
  return `moyaera.ru/register?ref=${code}`;
}
