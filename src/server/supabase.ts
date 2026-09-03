import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, HAS_SUPABASE } from "@/lib/env";

/**
 * Клиент от имени текущего пользователя (по cookies). Подчиняется RLS.
 * Используется в маршрутах, чтобы узнать, кто пришёл.
 */
export async function supabaseForUser() {
  if (!HAS_SUPABASE) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* в Server Component cookies только читаются — это нормально */
        }
      },
    },
  });
}

/**
 * Сервисный клиент — обходит RLS. Только на сервере, только для того,
 * что пользователь делать не должен: запись текстов, списание кредитов,
 * создание подписок после оплаты.
 */
export function supabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!HAS_SUPABASE || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** id и email текущего пользователя или null. */
export async function currentUser(): Promise<{ id: string; email: string } | null> {
  const sb = await supabaseForUser();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}
