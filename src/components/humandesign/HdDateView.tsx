"use client";

import { useEffect, useMemo } from "react";
import { CENTERS, hdBriefSlots, hdDayVariation } from "@/lib/humandesign";
import { BriefList, type BriefItem } from "@/components/chart/BriefList";
import { useUrlBirth } from "@/components/chart/useUrlBirth";
import { RefineBirth } from "@/components/common/RefineBirth";
import { formatBirthDate } from "@/lib/pendingBirth";
import { Bodygraph, CenterList } from "./Bodygraph";
import { chartFromBirth, HdReading, PreliminaryBadge } from "./HdReading";
import { useHdTexts } from "./useHdTexts";
import type { DayVariation } from "@/components/natal/NatalDateView";

/**
 * СТРАНИЦА ДИЗАЙНА ЧЕЛОВЕКА ПО ДАТЕ — /dizayn-cheloveka/26-07-1990
 *
 * Открыто всем: бодиграф с определёнными центрами, тип и стратегия и
 * короткая справка по каждому центру. Под замком — авторитет, профиль,
 * каналы, ворота и крест.
 *
 * Без времени рождения бодиграф особенно хрупок: Луна проходит одни ворота
 * примерно за десять часов, а одни ворота могут замкнуть канал и сменить
 * тип. Поэтому если за сутки результат меняется, рядом с типом стоит
 * пометка «предварительно» и назван час перехода.
 */

export function HdDateView({
  iso,
  initialTexts,
  initialVariation,
}: {
  iso: string;
  initialTexts: Record<string, string>;
  initialVariation: DayVariation;
}) {
  const { birth, loading, refine } = useUrlBirth(iso);
  const chart = useMemo(() => chartFromBirth(birth), [birth]);
  const refined = birth.time !== null || birth.place !== null;

  const variation = useMemo<DayVariation>(() => {
    if (!chart.approximate) return { preliminary: false, facts: [] };
    const tz = birth.place?.tz ?? null;
    // Без пояса это тот же расчёт, что сделал сервер, — не повторяем его.
    if (!tz) return initialVariation;
    const v = hdDayVariation(birth.date, tz, birth.place?.label ?? null);
    return { preliminary: !v.stable, facts: v.facts };
  }, [birth.date, birth.place?.tz, birth.place?.label, chart.approximate, initialVariation]);

  const brief = useMemo(() => hdBriefSlots(chart), [chart]);
  const { texts, load } = useHdTexts({ date: birth.date, time: birth.time, placeId: birth.place?.id ?? null });

  // Пока уточнения нет, тексты уже пришли с сервера в HTML. После уточнения
  // это другой бодиграф: центр мог стать определённым.
  useEffect(() => {
    if (refined) load(brief.map((s) => s.id));
  }, [refined, brief, load]);

  const items: BriefItem[] = brief.map((slot) => {
    const loaded = texts[slot.id];
    const text = loaded && "text" in loaded ? loaded.text : refined ? null : (initialTexts[slot.id] ?? null);
    const defined = slot.center ? chart.definedCenters.includes(slot.center) : false;
    return {
      id: slot.id,
      title: slot.center ? CENTERS[slot.center].name : slot.label,
      detail: `${defined ? "определён" : "открыт"} · ${slot.center ? CENTERS[slot.center].about : ""}`,
      text,
    };
  });

  return (
    <div className="w-full">
      <header>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.08 }}>
          Дизайн человека {formatBirthDate(iso)}
        </h1>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="text-text-secondary" style={{ fontSize: "clamp(16px, 1.25vw, 20px)", lineHeight: 1.5 }}>
            Тип {chart.type.name}, стратегия «{chart.type.strategy}». Определённых центров:{" "}
            {chart.definedCenters.length} из девяти
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

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Bodygraph chart={chart} className="mx-auto w-full max-w-[340px]" />
        <div>
          <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Центры
          </div>
          <div className="mt-3">
            <CenterList chart={chart} />
          </div>
          <p className="mt-4 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Карта личности рассчитана на момент рождения, карта дизайна — на {chart.daysBetween.toFixed(1)} суток
            раньше, когда Солнце стояло на 88° назад. Расчёт сверен с открытым калькулятором на двадцати датах
          </p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Девять центров
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Коротко о каждом центре этой карты: что в ней устойчиво, а что зависит от людей рядом
        </p>
        <BriefList items={items} />
      </section>

      <section className="mt-14">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Полный разбор бодиграфа
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Тип и стратегия читаются бесплатно. Авторитет, профиль, каналы и ворота открывает подписка
        </p>
        <div className="mt-2">
          <HdReading birth={birth} variant="questions" onRefine={refine} />
        </div>
      </section>
    </div>
  );
}

/** Честная оговорка страницы по дате: на какой час посчитано и что меняется. */
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
    <div className="mt-6 w-full max-w-full rounded-[14px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
      {loading ? (
        <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
          Пересчитываем бодиграф по указанным времени и месту…
        </p>
      ) : exact ? (
        <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
          Бодиграф посчитан на {birth.time} по местному времени, {chart.place?.name ?? ""}. Эта страница не
          индексируется поисковиками — общий адрес остаётся по одной дате
        </p>
      ) : (
        <>
          <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
            {refined
              ? "Место не выбрано из справочника, поэтому бодиграф посчитан на полдень по всемирному времени."
              : "Бодиграф посчитан на полдень по всемирному времени: на этой странице известна только дата."}{" "}
            Луна проходит одни ворота примерно за десять часов, а одни ворота могут замкнуть канал — поэтому час
            рождения здесь важнее, чем в натальной карте
          </p>
          {facts.length > 0 && (
            <>
              <p className="mt-3 text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
                В этот день результат за сутки меняется:
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
