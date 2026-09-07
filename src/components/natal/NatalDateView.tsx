"use client";

import { useEffect, useMemo } from "react";
import { formatZodiac } from "@/lib/ephemeris";
import { briefSlots, chartBody, natalDayVariation, natalTextKey } from "@/lib/natal";
import { moscowClock } from "@/lib/geo/dayScan";
import { BriefList, type BriefItem } from "@/components/chart/BriefList";
import { useUrlBirth } from "@/components/chart/useUrlBirth";
import { RefineBirth } from "@/components/common/RefineBirth";
import { formatBirthDate } from "@/lib/pendingBirth";
import { chartFromBirth, NatalReading, PreliminaryBadge, whyApproximate } from "./NatalReading";
import { NatalPositions, NatalWheel } from "./NatalWheel";
import { useNatalTexts } from "./useNatalTexts";

/**
 * СТРАНИЦА НАТАЛЬНОЙ КАРТЫ ПО ДАТЕ — /natalnaya-karta/26-07-1990
 *
 * Открыто всем: круг карты, положения планет и короткая справка по каждому
 * положению. Под замком — полный разбор позиций, дома и аспекты.
 *
 * Асцендент и дома здесь не показываем принципиально: по одной дате их не
 * существует. Если за сутки что-то меняется — говорим об этом фактом, с
 * временем перехода, и рядом даём кнопку уточнения: время и место
 * дописываются в адрес (?t=0940&g=524901) и всё пересчитывается на месте.
 */

export type DayVariation = { preliminary: boolean; facts: string[] };

export function NatalDateView({
  iso,
  initialTexts,
  initialVariation,
}: {
  iso: string;
  /** короткие справки, посчитанные на сервере для карты по дате */
  initialTexts: Record<string, string>;
  /** что меняется за эти сутки — посчитано на сервере, чтобы не считать в браузере */
  initialVariation: DayVariation;
}) {
  const { birth, loading, refine } = useUrlBirth(iso);
  const chart = useMemo(() => chartFromBirth(birth), [birth]);
  const refined = birth.time !== null || birth.place !== null;

  const variation = useMemo<DayVariation>(() => {
    if (chart.moment.precision === "exact") return { preliminary: false, facts: [] };
    const tz = birth.place?.tz ?? null;
    // Без пояса это тот же расчёт, что сделал сервер, — не повторяем его.
    if (!tz) return initialVariation;
    const v = natalDayVariation(birth.date, tz, birth.place?.label ?? null);
    return { preliminary: !v.stable, facts: v.facts };
  }, [birth.date, birth.place?.tz, birth.place?.label, chart.moment.precision, initialVariation]);

  const brief = useMemo(() => briefSlots(chart), [chart]);
  const { texts, load } = useNatalTexts({ date: birth.date, time: birth.time, placeId: birth.place?.id ?? null });

  // Пока уточнения нет, тексты уже пришли с сервера в HTML. После уточнения
  // это другая карта: знаки могли смениться, справки нужны новые.
  useEffect(() => {
    if (refined) load(brief.map((s) => s.id));
  }, [refined, brief, load]);

  const items: BriefItem[] = brief.flatMap((slot) => {
    const body = slot.body ? chartBody(chart, slot.body) : null;
    if (!body || !natalTextKey(slot, chart)) return [];
    const loaded = texts[slot.id];
    const text = loaded && "text" in loaded ? loaded.text : refined ? null : (initialTexts[slot.id] ?? null);
    return [
      {
        id: slot.id,
        title: slot.label,
        detail: `${formatZodiac(body.longitude)}${body.retrograde ? ", ретроградный" : ""}`,
        text,
      },
    ];
  });

  const sun = chartBody(chart, "sun");
  const moon = chartBody(chart, "moon");

  return (
    <div className="w-full">
      <header>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.08 }}>
          Натальная карта {formatBirthDate(iso)}
        </h1>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="text-text-secondary" style={{ fontSize: "clamp(16px, 1.25vw, 20px)", lineHeight: 1.5 }}>
            {sun && `Солнце ${sun.sign.inCase}`}
            {moon && !chart.unknown.moonSign ? `, Луна ${moon.sign.inCase}` : ""}
            {chart.asc ? `, асцендент ${chart.asc.sign.inCase}` : ""}
          </p>
          {variation.preliminary && <PreliminaryBadge />}
        </div>
      </header>

      <DateNote
        birth={birth}
        chart={chart}
        facts={variation.facts}
        loading={loading}
        refined={refined}
        onRefine={refine}
      />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <NatalWheel chart={chart} className="mx-auto w-full max-w-[560px]" />
        <div>
          <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Положения
          </div>
          <div className="mt-3">
            <NatalPositions chart={chart} />
          </div>
          <p className="mt-4 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Положения рассчитаны по астрономическим эфемеридам и сверены со Swiss Ephemeris — той же библиотекой, на
            которой считает astro.com
          </p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Планеты по знакам
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Коротко о каждом положении в этой карте. Подробный разбор каждой позиции — ниже
        </p>
        <BriefList items={items} />
      </section>

      <section className="mt-14">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Полный разбор карты
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Солнце и Луна читаются бесплатно. Остальные позиции, дома и аспекты открывает подписка
        </p>
        <div className="mt-2">
          <NatalReading birth={birth} variant="questions" onRefine={refine} />
        </div>
      </section>
    </div>
  );
}

/**
 * Честная оговорка страницы по дате: на какой час посчитано, чего по одной
 * дате не бывает и что меняется за сутки. Рядом — кнопка уточнения.
 */
function DateNote({
  birth,
  chart,
  facts,
  loading,
  refined,
  onRefine,
}: {
  birth: ReturnType<typeof useUrlBirth>["birth"];
  chart: ReturnType<typeof chartFromBirth>;
  facts: string[];
  loading: boolean;
  refined: boolean;
  onRefine: (next: ReturnType<typeof useUrlBirth>["birth"]) => void;
}) {
  const exact = chart.moment.precision === "exact";

  return (
    <div id="refine" className="mt-6 w-full max-w-full scroll-mt-28 rounded-[14px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
      {loading ? (
        <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
          Пересчитываем карту по указанным времени и месту…
        </p>
      ) : exact ? (
        <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
          Карта посчитана на {birth.time} по местному времени, {chart.place?.name ?? ""}. Асцендент и дома в ней есть.
          Эта страница не индексируется поисковиками — общий адрес остаётся по одной дате
        </p>
      ) : (
        <>
          <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
            {refined
              ? whyApproximate(chart.moment.precision, birth.time !== null, moscowClock(chart.moment.utc))
              : `Карта посчитана на полдень по всемирному времени, это ${moscowClock(chart.moment.utc)} (мск): на этой странице известна только дата.`}{" "}
            Асцендент, середина неба и дома по одной дате не определяются — они меняются каждые два часа,
            {birth.place ? " для них нужен час рождения" : " для них нужны час и место рождения"}
          </p>
          {facts.length > 0 && (
            <>
              <p className="mt-3 text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
                В этот день положения за сутки меняются:
              </p>
              <ul className="mt-2 flex flex-col" style={{ gap: 6 }}>
                {facts.map((f) => (
                  <li key={f} className="text-text-secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    · {f}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <RefineBirth birth={birth} onRefine={onRefine} />
    </div>
  );
}
