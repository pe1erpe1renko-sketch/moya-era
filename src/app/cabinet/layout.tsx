"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

/** Защищённая зона: без сессии уводим на /login. Аналог _authenticated из TanStack. */
export default function CabinetLayout({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return <div className="min-h-screen w-full bg-bg-page" aria-busy="true" />;
  }
  return <>{children}</>;
}
