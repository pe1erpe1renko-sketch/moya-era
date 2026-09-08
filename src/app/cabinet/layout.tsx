"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { currentPath, leaveForAuth, takeReturn } from "@/lib/returnTo";

/**
 * Защищённая зона: без сессии уводим на /login. Аналог _authenticated из TanStack.
 *
 * Вошедшего с незаконченным делом кабинет не задерживает: если адрес
 * возврата ещё лежит в хранилище (человек подтверждал почту из письма
 * и попал сюда мимо формы входа), его отправляют туда, откуда он уходил.
 */
export default function CabinetLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // С адресом возврата: /cabinet?add=26-07-1990 после входа откроется
      // с той же датой, а не пустым кабинетом.
      leaveForAuth(router, "login", currentPath(), "replace");
      return;
    }
    const back = takeReturn();
    if (back && !back.startsWith("/cabinet")) router.replace(back);
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return <div className="min-h-screen w-full bg-bg-page" aria-busy="true" />;
  }
  return <>{children}</>;
}
