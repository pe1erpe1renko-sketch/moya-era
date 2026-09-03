/**
 * Куда вести после входа/регистрации: параметр ?next=/checkout?…,
 * только относительные адреса. По умолчанию — кабинет.
 */
export function nextPath(fallback = "/cabinet"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  } catch {
    /* ignore */
  }
  return fallback;
}
