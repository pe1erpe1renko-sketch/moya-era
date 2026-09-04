import { ImageResponse } from "next/og";
import { ALL_CALC_TYPES, urlDateToIso, computeReading, arcanaName, arcanaLine, formatDateDots } from "@/lib/matrix";
import { chartUrlDateToIso, type ChartSystem } from "@/lib/chartUrl";
import { chartBody } from "@/lib/natal";
import { resolveNatalChart } from "@/server/natalTexts";
import { resolveHdChart } from "@/server/hdTexts";

export const runtime = "nodejs";
const size = { width: 1200, height: 630 };

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: 72,
  background: "linear-gradient(135deg, #03191e 0%, #063f47 100%)",
  color: "#e6f0ef",
  fontFamily: "serif",
};

/**
 * Превью карты по дате: /api/og?chart=natal&date=26-07-1990
 * Показываем то же, что и заголовок страницы, — знак Солнца или тип.
 */
function chartImage(system: ChartSystem, slug: string) {
  const iso = chartUrlDateToIso(slug);
  if (!iso) return null;
  const dots = formatDateDots(iso);

  let heading = "";
  let sub = "";
  if (system === "natal") {
    const chart = resolveNatalChart({ date: iso, time: null, placeId: null });
    const sun = chart ? chartBody(chart, "sun") : null;
    const moon = chart ? chartBody(chart, "moon") : null;
    if (!sun) return null;
    heading = `Солнце ${sun.sign.inCase}`;
    sub = moon && !chart?.unknown.moonSign ? `Луна ${moon.sign.inCase}. Все планеты по знакам и разбор каждого положения` : "Все планеты по знакам и разбор каждого положения";
  } else {
    const chart = resolveHdChart({ date: iso, time: null, placeId: null });
    if (!chart) return null;
    heading = chart.type.name;
    sub = `Стратегия «${chart.type.strategy}». Определённых центров: ${chart.definedCenters.length} из девяти`;
  }

  const title = `${system === "natal" ? "Натальная карта" : "Дизайн человека"} · ${dots}`;
  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>МОЯ ЭРА</div>
          <div style={{ fontSize: 26, color: "#9fbab9", fontFamily: "sans-serif" }}>{title}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 64, lineHeight: 1.1 }}>{heading}</div>
          <div style={{ fontSize: 28, color: "#9fbab9", fontFamily: "sans-serif" }}>{sub}</div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}

/** GET /api/og?type=matrica&dates=13-07-1998[,09-04-1992] — картинка для превью ссылки. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chart = url.searchParams.get("chart");
  if (chart === "natal" || chart === "humandesign") {
    const image = chartImage(chart, url.searchParams.get("date") ?? "");
    if (image) return image;
  }
  const slug = url.searchParams.get("type") ?? "";
  const dates = (url.searchParams.get("dates") ?? "").split(",").filter(Boolean);
  const type = ALL_CALC_TYPES.find((t) => t.slug === slug);
  const iso = dates.map(urlDateToIso);
  let title = "Моя Эра";
  let sub = "";
  let core = 0;
  if (type && !iso.some((d) => d === null) && iso.length === (type.pair ? 2 : 1)) {
    try {
      const r = computeReading(type, iso as string[]);
      core = r.matrix.core.C;
      title = `${type.title} · ${(iso as string[]).map(formatDateDots).join(" + ")}`;
      sub = `${type.pair ? "Ядро пары" : "Центральный аркан"} ${core} — ${arcanaName(core)}. ${arcanaLine(core)}`;
    } catch {
      /* картинка по умолчанию */
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #03191e 0%, #063f47 100%)", color: "#e6f0ef", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>МОЯ ЭРА</div>
          <div style={{ fontSize: 26, color: "#9fbab9", fontFamily: "sans-serif" }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {core > 0 && (
            <div style={{ width: 180, height: 180, borderRadius: 90, background: "#7a5da8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96 }}>{core}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ fontSize: 56, lineHeight: 1.1 }}>{core > 0 ? arcanaName(core) : "Шесть систем — один человек"}</div>
            <div style={{ fontSize: 28, color: "#9fbab9", fontFamily: "sans-serif" }}>{sub || "Расчёт по дате рождения с объяснением каждого числа"}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}
