/**
 * Поиск по справочнику мест. Чистые функции без зависимости от сервера,
 * чтобы их можно было тестировать и, при желании, запускать в браузере.
 *
 * Данные — src/lib/geo/data/places.json, собранные scripts/build-places.py
 * из GeoNames (CC BY 4.0). Формат строки места:
 * [id, название, английское название, страна, регион, широта, долгота, пояс,
 *  население, псевдонимы].
 */

export type PlaceRow = [
  id: number,
  name: string,
  nameEn: string,
  country: string,
  admin1: string,
  lat: number,
  lon: number,
  tz: string,
  population: number,
  aliases: string[],
];

export type PlacesData = {
  source: string;
  generated: string;
  count: number;
  countries: Record<string, string>;
  regions: Record<string, string>;
  places: PlaceRow[];
};

export type Place = {
  /** id GeoNames */
  id: number;
  name: string;
  nameEn: string;
  /** код страны ISO 3166-1 alpha-2 */
  country: string;
  countryName: string;
  region: string | null;
  lat: number;
  lon: number;
  /** пояс IANA */
  tz: string;
  population: number;
  /** «Новосибирск, Новосибирская область, Россия» */
  label: string;
};

/** Регионы, для которых в подписи не показываем страну. */
const COUNTRY_HIDDEN_REGIONS = new Set(["UA.11", "UA.20"]);

/** Единая нормализация запроса и названий: регистр, ё, дефисы, апострофы, диакритика. */
export function normalizePlaceText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/(?<=[A-Za-z])[\u0300-\u036f]+/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’'`ʻʼ"]/g, "")
    .replace(/[-–—_./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Entry = { place: Place; keys: string[] };

export type PlacesIndex = {
  size: number;
  search(query: string, limit?: number): Place[];
  byId(id: number): Place | null;
};

function toPlace(row: PlaceRow, data: PlacesData): Place {
  const [id, name, nameEn, country, admin1, lat, lon, tz, population] = row;
  const region = (admin1 && data.regions[admin1]) || null;
  const countryName = data.countries[country] ?? country;
  const parts = [name];
  if (region && region !== name) parts.push(region);
  if (!COUNTRY_HIDDEN_REGIONS.has(admin1)) parts.push(countryName);
  return { id, name, nameEn, country, countryName, region, lat, lon, tz, population, label: parts.join(", ") };
}

export function createPlacesIndex(data: PlacesData): PlacesIndex {
  const entries: Entry[] = data.places.map((row) => {
    const place = toPlace(row, data);
    const keys = new Set<string>();
    keys.add(normalizePlaceText(place.name));
    keys.add(normalizePlaceText(place.nameEn));
    for (const a of row[9]) keys.add(normalizePlaceText(a));
    return { place, keys: Array.from(keys).filter(Boolean) };
  });
  const byId = new Map(entries.map((e) => [e.place.id, e.place]));

  function matchScore(keys: string[], q: string): number {
    let best = 0;
    for (const k of keys) {
      if (k === q) return 3;
      if (k.startsWith(q)) best = Math.max(best, 2);
      else if (best < 1 && k.includes(" " + q)) best = 1;
    }
    return best;
  }

  return {
    size: entries.length,
    search(query, limit = 8) {
      const q = normalizePlaceText(query);
      if (q.length < 2) return [];
      const hits: Array<{ score: number; place: Place }> = [];
      for (const e of entries) {
        const score = matchScore(e.keys, q);
        if (score > 0) hits.push({ score, place: e.place });
      }
      hits.sort((a, b) => b.score - a.score || b.place.population - a.place.population || a.place.name.localeCompare(b.place.name, "ru"));
      return hits.slice(0, limit).map((h) => h.place);
    },
    byId(id) {
      return byId.get(id) ?? null;
    },
  };
}
