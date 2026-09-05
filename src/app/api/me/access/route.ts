import { NextResponse } from "next/server";
import { urlDateToIso } from "@/lib/matrix";
import { readingAccess } from "@/server/readingTexts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/me/access?dates=13-07-1998,09-04-1992 → { unlocked, reason, loggedIn } */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("dates") ?? "").split(",").filter(Boolean);
  const dates = raw.map((d) => urlDateToIso(d));
  if (dates.length === 0 || dates.some((d) => d === null)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { unlocked, reason, access } = await readingAccess(dates as string[]);
  return NextResponse.json(
    { unlocked, reason, loggedIn: Boolean(access.userId), demo: access.demo, plan: access.plan?.id ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
