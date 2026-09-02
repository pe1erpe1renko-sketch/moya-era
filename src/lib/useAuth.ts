"use client";

import { useEffect, useState } from "react";
import { backend, type Session } from "@/lib/backend";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    backend.auth.getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    const unsubscribe = backend.auth.onAuthStateChange((next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    email: session?.user?.email ?? null,
    loading,
    isAuthenticated: Boolean(session?.user),
  };
}
