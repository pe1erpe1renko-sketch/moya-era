/**
 * Поля места рождения в профиле и у людей: строка для человека плюс то,
 * что нужно расчёту. Общие для клиента и сервера.
 */

import type { Place } from "./placesIndex";

export type BirthPlaceFields = {
  birth_place: string | null;
  /** id места в GeoNames; null, если место введено вручную */
  birth_place_id: number | null;
  birth_lat: number | null;
  birth_lon: number | null;
  /** пояс IANA, например Europe/Moscow */
  birth_tz: string | null;
};

export const EMPTY_BIRTH_PLACE: BirthPlaceFields = {
  birth_place: null,
  birth_place_id: null,
  birth_lat: null,
  birth_lon: null,
  birth_tz: null,
};

/** Поля для сохранения: выбранное место из справочника или просто текст. */
export function birthPlaceFields(place: Place | null, text: string): BirthPlaceFields {
  const trimmed = text.trim();
  if (place) {
    return {
      birth_place: place.label,
      birth_place_id: place.id,
      birth_lat: place.lat,
      birth_lon: place.lon,
      birth_tz: place.tz,
    };
  }
  return { ...EMPTY_BIRTH_PLACE, birth_place: trimmed || null };
}

/** Обратно: сохранённые поля → значение для поля ввода. */
export function placeFromFields(row: BirthPlaceFields): Place | null {
  if (row.birth_place_id === null || row.birth_lat === null || row.birth_lon === null || !row.birth_tz) return null;
  const label = row.birth_place ?? "";
  const name = label.split(",")[0]?.trim() || label;
  return {
    id: row.birth_place_id,
    name,
    nameEn: name,
    country: "",
    countryName: "",
    region: null,
    lat: row.birth_lat,
    lon: row.birth_lon,
    tz: row.birth_tz,
    population: 0,
    label,
  };
}

/** true, если у места есть координаты и пояс — можно считать дома. */
export function hasResolvedPlace(row: BirthPlaceFields): boolean {
  return placeFromFields(row) !== null;
}
