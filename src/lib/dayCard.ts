/** Детерминированный выбор карты дня: id пользователя + дата (1..22). */
export function dayArcanum(userId: string, isoDay: string): number {
  const seed = `${userId}:${isoDay}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 22) + 1;
}

export function todayIso(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
