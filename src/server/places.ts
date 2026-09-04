import "server-only";

import data from "@/lib/geo/data/places.json";
import { createPlacesIndex, type Place, type PlacesData, type PlacesIndex } from "@/lib/geo/placesIndex";

/**
 * Справочник мест на сервере. Индекс строится один раз на процесс.
 * Данные — GeoNames (CC BY 4.0), см. scripts/build-places.py.
 */

let index: PlacesIndex | null = null;

function getIndex(): PlacesIndex {
  if (!index) index = createPlacesIndex(data as unknown as PlacesData);
  return index;
}

export function searchPlaces(query: string, limit = 8): Place[] {
  return getIndex().search(query, limit);
}

export function placeById(id: number): Place | null {
  return getIndex().byId(id);
}

export const PLACES_SOURCE = (data as { source: string }).source;
