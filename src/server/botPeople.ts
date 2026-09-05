import "server-only";

import { supabaseService } from "@/server/supabase";

/**
 * Данные человека для сводки: дата рождения и имя.
 *
 * Отдельным файлом, потому что этим пользуются и вебхук, и рассылка, а
 * тянуть ради двух полей весь слой доступа незачем.
 *
 * «Я» — это подпись строки в списке людей, а не имя: на обращение в
 * сводке она не годится, и здесь же и отсекается.
 */

export type BotPerson = { id: string; name: string | null; birthDate: string };

export async function personBirth(personId: string): Promise<BotPerson | null> {
  const sb = supabaseService();
  if (!sb) return null;
  const { data } = await sb.from("people").select("id, name, birth_date").eq("id", personId).maybeSingle();
  if (!data) return null;
  const row = data as { id: string; name: string | null; birth_date: string };
  if (!row.birth_date) return null;
  return {
    id: String(row.id),
    name: row.name && row.name !== "Я" ? row.name : null,
    birthDate: String(row.birth_date).slice(0, 10),
  };
}

/** Данные сразу для многих — рассылке нужно именно так. */
export async function peopleByIds(ids: string[]): Promise<Map<string, BotPerson>> {
  const out = new Map<string, BotPerson>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const sb = supabaseService();
  if (!sb) return out;

  for (let i = 0; i < unique.length; i += 200) {
    const { data } = await sb.from("people").select("id, name, birth_date").in("id", unique.slice(i, i + 200));
    for (const raw of (data as Array<{ id: string; name: string | null; birth_date: string }> | null) ?? []) {
      if (!raw.birth_date) continue;
      out.set(String(raw.id), {
        id: String(raw.id),
        name: raw.name && raw.name !== "Я" ? raw.name : null,
        birthDate: String(raw.birth_date).slice(0, 10),
      });
    }
  }
  return out;
}
