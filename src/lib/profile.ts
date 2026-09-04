import { backend } from "@/lib/backend";
import { clearPendingBirth, readPendingBirth, type PendingBirth } from "@/lib/pendingBirth";
import { clearPendingRef, readPendingRef } from "@/lib/referral";

/**
 * Создаёт профиль владельца, если его ещё нет, и записывает дату рождения из
 * pendingBirth. Данные из хранилища удаляются только после успешной записи.
 * Возвращает false, если запись не удалась.
 */
export async function ensureOwnerProfile(
  userId: string,
  pending: PendingBirth | null = readPendingBirth(),
): Promise<boolean> {
  const { data: existing, error } = await backend.profiles.getOwner(userId);
  if (error) return false;

  if (!existing) {
    const { error: insertError } = await backend.profiles.insert({
      user_id: userId,
      name: "Мой профиль",
      is_owner: true,
      birth_date: pending?.date ?? null,
      birth_time: pending?.time ?? null,
      birth_place: pending?.place ?? null,
      birth_place_id: pending?.placeId ?? null,
      birth_lat: pending?.lat ?? null,
      birth_lon: pending?.lon ?? null,
      birth_tz: pending?.tz ?? null,
      referred_by: readPendingRef(),
    });
    if (insertError) return false;
    clearPendingBirth();
    clearPendingRef();
    return true;
  }

  // Профиль есть и дата в нём уже есть — второй раз ничего не спрашиваем.
  if (existing.birth_date) {
    clearPendingBirth();
    return true;
  }

  if (!pending?.date) return true;

  const { error: updateError } = await backend.profiles.update(existing.id, {
    birth_date: pending.date,
    birth_time: pending.time ?? null,
    birth_place: pending.place ?? null,
    birth_place_id: pending.placeId ?? null,
    birth_lat: pending.lat ?? null,
    birth_lon: pending.lon ?? null,
    birth_tz: pending.tz ?? null,
  });

  if (updateError) return false;
  clearPendingBirth();
  return true;
}
