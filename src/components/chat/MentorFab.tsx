"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

/**
 * НАСТАВНИК ПОД РУКОЙ — плавающая круглая кнопка внизу справа.
 *
 * Только вошедшим: гостю чат всё равно ответит «войдите». Не на самой
 * странице наставника — там она вела бы на себя.
 *
 * ЧТОБЫ НИЧЕГО НЕ ЗАКРЫВАТЬ: полоса подсказки внизу страницы отдаёт свою
 * высоту в переменную --hint-strip, и кнопка поднимается над ней. А на
 * телефоне странице добавляется отступ снизу под кнопку, чтобы последняя
 * кнопка содержимого не оказалась под ней.
 */
export function MentorFab() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const shown = isAuthenticated && pathname !== "/nastavnik";

  useEffect(() => {
    if (!shown) return;
    document.body.classList.add("has-fab");
    return () => document.body.classList.remove("has-fab");
  }, [shown]);

  if (!shown) return null;

  return (
    <Link
      href="/nastavnik"
      aria-label="Спросить наставника"
      title="Спросить наставника"
      className="qc-focus mentor-fab fixed right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary-foreground shadow-lg transition-transform hover:scale-105 md:right-6"
      style={{ bottom: "calc(18px + var(--hint-strip, 0px))" }}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
        <path d="M8.5 8.5h7M8.5 12h4" />
      </svg>
    </Link>
  );
}
