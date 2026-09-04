/**
 * Углы в градусах: нормализация, тригонометрия, запись в градусах и минутах.
 * Весь движок эфемерид работает в градусах, чтобы числа в коде совпадали
 * с тем, что видно в астрологических программах.
 */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/** Приводит угол к диапазону [0, 360). */
export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** Разность a − b, приведённая к (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  const d = norm360(a - b);
  return d > 180 ? d - 360 : d;
}

export const sind = (d: number): number => Math.sin(d * DEG2RAD);
export const cosd = (d: number): number => Math.cos(d * DEG2RAD);
export const tand = (d: number): number => Math.tan(d * DEG2RAD);
export const asind = (x: number): number => Math.asin(x) * RAD2DEG;
export const acosd = (x: number): number => Math.acos(x) * RAD2DEG;
export const atand = (x: number): number => Math.atan(x) * RAD2DEG;
export const atan2d = (y: number, x: number): number => Math.atan2(y, x) * RAD2DEG;

export type Dms = { deg: number; min: number; sec: number };

/**
 * Градусы → градусы, минуты, секунды. Секунды округляются до целых,
 * минуты и градусы при переполнении переносятся.
 */
export function toDms(x: number): Dms {
  const total = Math.round(Math.abs(x) * 3600);
  const deg = Math.floor(total / 3600);
  const min = Math.floor((total - deg * 3600) / 60);
  const sec = total - deg * 3600 - min * 60;
  return { deg, min, sec };
}

/**
 * «12°34′» или «12°34′56″». Без секунд минуты не округляются, а
 * отбрасываются, как принято в таблицах положений: 3°07′51″ → 3°07′.
 */
export function formatDms(x: number, { seconds = false }: { seconds?: boolean } = {}): string {
  const p = (n: number) => String(n).padStart(2, "0");
  if (seconds) {
    const { deg, min, sec } = toDms(x);
    return `${deg}°${p(min)}′${p(sec)}″`;
  }
  const totalMin = Math.floor(Math.abs(x) * 60 + 1e-9);
  const deg = Math.floor(totalMin / 60);
  const min = totalMin - deg * 60;
  return `${deg}°${p(min)}′`;
}
