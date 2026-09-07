import { ImageResponse } from "next/og";
import { ALL_CALC_TYPES, urlDateToIso, computeReading, arcanaName, arcanaLine, formatDateDots } from "@/lib/matrix";
import { chartUrlDateToIso, type ChartSystem } from "@/lib/chartUrl";
import { chartBody } from "@/lib/natal";
import { resolveNatalChart } from "@/server/natalTexts";
import { resolveHdChart } from "@/server/hdTexts";
import { resolveNumerology } from "@/server/numerologyTexts";
import { lifePath } from "@/lib/numerology";
import { arcanumInfo, buildDayCard } from "@/lib/tarot";
import { directions } from "@/lib/directions";

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
  } else if (system === "humandesign") {
    const chart = resolveHdChart({ date: iso, time: null, placeId: null });
    if (!chart) return null;
    heading = chart.type.name;
    sub = `Стратегия «${chart.type.strategy}». Определённых центров: ${chart.definedCenters.length} из девяти`;
  } else {
    const chart = resolveNumerology(iso);
    if (!chart) return null;
    const card = lifePath.find((x) => x.n === chart.path);
    heading = `Число пути ${chart.path}${card ? ` · ${card.title}` : ""}`;
    sub = `День рождения ${chart.birthday}, отношение ${chart.attitude}, личный год ${chart.personalYear}`;
  }

  const SYSTEM_TITLE: Record<ChartSystem, string> = {
    natal: "Натальная карта",
    humandesign: "Дизайн человека",
    numerology: "Нумерология",
  };
  const title = `${SYSTEM_TITLE[system]} · ${dots}`;
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

/**
 * Превью карты дня: /api/og?taro=26-07-1990
 *
 * Картинка живёт сутки, как и сама карта: адрес у неё постоянный, а
 * содержимое меняется, поэтому кэш здесь короче, чем у остальных
 * превью, — иначе в мессенджере висел бы вчерашний аркан.
 */
function taroImage(slug: string) {
  const iso = chartUrlDateToIso(slug);
  if (!iso) return null;
  const card = buildDayCard(iso);
  if (!card) return null;
  const info = arcanumInfo(card.arcanum);
  const birth = arcanumInfo(card.birthArcanum);
  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>МОЯ ЭРА</div>
          <div style={{ fontSize: 26, color: "#9fbab9", fontFamily: "sans-serif" }}>
            {`Карта дня · ${formatDateDots(iso)}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 180,
              height: 260,
              borderRadius: 14,
              border: "2px solid #9fbab9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
            }}
          >
            {card.arcanum}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ fontSize: 56, lineHeight: 1.1 }}>{info.name}</div>
            {/* Одной строкой, не несколькими выражениями: Satori считает
                каждое выражение отдельным узлом и требует от родителя
                display:flex — а без него роняет всю картинку. Именно так
                превью карты дня отдавало 500, и Telegram показывал ссылку
                без картинки. */}
            <div style={{ fontSize: 28, color: "#9fbab9", fontFamily: "sans-serif" }}>
              {`${info.line}. Ваш аркан рождения — ${card.birthArcanum}, ${birth.name}`}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}

/**
 * Превью страницы направления: /api/og?direction=matrix
 *
 * Иллюстрация направления и его название — вместо общей картинки «шесть
 * систем», одинаковой у всех шести страниц. Картинка берётся уменьшенной
 * копией из public/images/og (640 точек, JPEG): оригиналы по мегабайту и
 * больше, а превью строится на каждый запрос, пока не осядет в кэше.
 */
const DIRECTION_LEAD: Record<string, string> = {
  matrix: "22 аркана по дате рождения: характер, деньги, отношения, предназначение",
  natal: "Планеты по знакам и домам в минуту рождения — с объяснением каждого положения",
  humandesign: "Тип, стратегия и авторитет: как вы устроены и как принимать решения",
  numerology: "Число судьбы, квадрат Пифагора и личный год — из одной даты",
  tarot: "Карта дня по дате рождения, меняется каждый день. Расклад на свой вопрос",
  synastry: "Аркан пары, синастрия и композит: три взгляда на двоих по двум датам",
};

async function directionImage(id: string, origin: string) {
  const d = directions.find((x) => x.id === id);
  if (!d) return null;
  let art: ArrayBuffer | null = null;
  try {
    const res = await fetch(`${origin}/images/og/${id}.jpg`);
    if (res.ok) art = await res.arrayBuffer();
  } catch {
    art = null;
  }
  return new ImageResponse(
    (
      <div style={{ ...frame, flexDirection: "row", alignItems: "center", gap: 56 }}>
        {art && (
          <img
            alt=""
            src={`data:image/jpeg;base64,${Buffer.from(art).toString("base64")}`}
            width={420}
            height={420}
            style={{ width: 420, height: 420, borderRadius: 28, objectFit: "cover" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, height: "100%" }}>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>МОЯ ЭРА</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 68, lineHeight: 1.05 }}>{d.title}</div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: "#9fbab9", fontFamily: "sans-serif" }}>{DIRECTION_LEAD[id] ?? d.desc}</div>
          </div>
          <div style={{ fontSize: 24, color: "#9fbab9", fontFamily: "sans-serif" }}>Бесплатно, без регистрации</div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}

/** GET /api/og?type=matrica&dates=13-07-1998[,09-04-1992] — картинка для превью ссылки. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const direction = url.searchParams.get("direction");
  if (direction) {
    const image = await directionImage(direction, url.origin);
    if (image) return image;
  }
  const chart = url.searchParams.get("chart");
  if (chart === "natal" || chart === "humandesign" || chart === "numerology") {
    const image = chartImage(chart, url.searchParams.get("date") ?? "");
    if (image) return image;
  }
  const taro = url.searchParams.get("taro");
  if (taro) {
    const image = taroImage(taro);
    if (image) return image;
  }
  const slug = url.searchParams.get("type") ?? "";
  const dates = (url.searchParams.get("dates") ?? "").split(",").filter(Boolean);
  const type = ALL_CALC_TYPES.find((t) => t.slug === slug);
  const iso = dates.map((d) => urlDateToIso(d));
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
