import { NextResponse } from "next/server";
import { placeById, searchPlaces } from "@/server/places";

export const runtime = "nodejs";

/**
 * GET /api/places?q=новосиб   → { places: [...] } — до восьми подсказок
 * GET /api/places?id=1496747  → { places: [место] } — по id GeoNames
 *
 * Справочник статический, ответы можно кэшировать надолго.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const headers = { "Cache-Control": "public, max-age=86400, s-maxage=86400" };

  const id = url.searchParams.get("id");
  if (id) {
    const place = placeById(Number(id));
    return NextResponse.json({ places: place ? [place] : [] }, { headers });
  }

  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ places: [] }, { headers });
  return NextResponse.json({ places: searchPlaces(q, 8) }, { headers });
}
