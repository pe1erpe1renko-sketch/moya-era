"use client";

import { useEffect, useMemo, useState } from "react";
import { formatZodiac } from "@/lib/ephemeris";
import {
  buildNatalChart,
  chartBody,
  natalDayVariation,
  natalSections,
  natalTextKey,
  pointName,
  type NatalChart,
  type NatalSlot,
} from "@/lib/natal";
import { moscowClock } from "@/lib/geo/dayScan";
import { RefineBirth } from "@/components/common/RefineBirth";
import { formatBirthDate } from "@/lib/pendingBirth";
import { Paywall } from "@/components/reading/Paywall";
import { LockNote } from "@/components/reading/LockNote";
import { NatalPositions, NatalWheel } from "./NatalWheel";
import { useNatalTexts } from "./useNatalTexts";
import type { BirthValue } from "./BirthForm";

/**
 * Разбор натальной карты: круг, положения и вопросы по разделам.
 *
 * Круг и все положения видны всем без регистрации — это схема, она
 * бесплатна, как октаграмма у матрицы. Замок стоит внутри, на текстах:
 * бесплатно читаются Солнце, Луна и асцендент, остальное по подписке.
 */

export function chartFromBirth(birth: BirthValue): NatalChart {
  return buildNatalChart({
    date: birth.date,
    time: birth.time,
    tz: birth.place?.tz ?? null,
    latitude: birth.place?.lat ?? null,
    longitude: birth.place?.lon ?? null,
    placeName: birth.place?.label ?? birth.placeText ?? null,
  });
}

/**
 * Меняются ли знаки планет за сутки рождения. Считается только когда время
 * неизвестно: если за сутки ничего не меняется, оговорок не нужно.
 * Отсутствие асцендента и домов — отдельный разговор, о нём говорит
 * блок оговорок под шапкой.
 */
export function useNatalVariation(birth: BirthValue, chart: NatalChart, enabled = true) {
  return useMemo(() => {
    if (!enabled || chart.moment.precision === "exact") return { preliminary: false, facts: [] as string[] };
    const v = natalDayVariation(birth.date, birth.place?.tz ?? null, birth.place?.label ?? null);
    return { preliminary: !v.stable, facts: v.facts };
  }, [enabled, birth.date, birth.place?.tz, birth.place?.label, chart.moment.precision]);
}

/** Пометка «предварительно» рядом с главным результатом. */
export function PreliminaryBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-text-accent/50 px-3 py-1 text-text-accent"
      style={{ fontSize: 12, letterSpacing: "0.04em" }}
    >
      предварительно
    </span>
  );
}

/**
 * Почему расчёт получился приблизительным — ровно по тому, чего не хватает.
 * Без места полдень называем и по московским часам: рядом стоит время
 * перехода в них же, и читатель не должен складывать двое разных часов.
 */
export function whyApproximate(
  precision: "exact" | "noon" | "date_only",
  hasTime: boolean,
  moscowNoon: string,
): string {
  if (precision === "noon") return "Время рождения не указано, поэтому расчёт сделан на полдень по местному времени.";
  if (hasTime) {
    return `Место не выбрано из справочника, поэтому перевести указанный час во всемирное время нельзя — расчёт сделан на полдень по всемирному времени, это ${moscowNoon} (мск).`;
  }
  return `Ни время, ни место не указаны, поэтому расчёт сделан на полдень по всемирному времени, это ${moscowNoon} (мск).`;
}

/** Что меняется за сутки и кнопка уточнения — прямо под результатом. */
export function NatalVariationNote({
  birth,
  facts,
  precision,
  moscowNoon,
  onRefine,
}: {
  birth: BirthValue;
  facts: string[];
  precision: "exact" | "noon" | "date_only";
  /** полдень расчёта в московских часах: «15:00» */
  moscowNoon: string;
  onRefine: (next: BirthValue) => void;
}) {
  return (
    <div className="mt-4 w-full max-w-full rounded-[14px] border border-border bg-surface-1" style={{ padding: "14px 18px" }}>
      <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
        {whyApproximate(precision, birth.time !== null, moscowNoon)} В этот день положения за сутки меняются:
      </p>
      <ul className="mt-2 flex flex-col" style={{ gap: 6 }}>
        {facts.map((f) => (
          <li key={f} className="text-text-secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
            · {f}
          </li>
        ))}
      </ul>
      <RefineBirth birth={birth} onRefine={onRefine} />
    </div>
  );
}

export function NatalReading({
  birth,
  variant = "full",
  onRefine,
}: {
  birth: BirthValue;
  /** full — с кругом и положениями; questions — только вопросы разбора */
  variant?: "full" | "questions";
  /** уточнение времени и места: наверх, чтобы пересчитались все блоки */
  onRefine?: (next: BirthValue) => void;
}) {
  const [local, setLocal] = useState(birth);
  useEffect(() => setLocal(birth), [birth]);
  const refine = (next: BirthValue) => {
    setLocal(next);
    onRefine?.(next);
  };
  const chart = useMemo(() => chartFromBirth(local), [local]);
  // Проверка суток стоит десятки миллисекунд, поэтому считаем её только
  // там, где показываем: в варианте с картой.
  const variation = useNatalVariation(local, chart, variant === "full");

  const [active, setActive] = useState<string | null>(null);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);

  const { texts, busy, unlocked, reason, load, reset } = useNatalTexts({
    date: local.date,
    time: local.time,
    placeId: local.place?.id ?? null,
  });

  const sections = useMemo(() => natalSections(chart), [chart]);

  // Бесплатные вопросы подгружаются сразу: они и есть первый экран разбора.
  useEffect(() => {
    const free = sections.flatMap((s) => s.slots.filter((x) => x.free && natalTextKey(x, chart)).map((x) => x.id));
    if (free.length > 0) load(free);
  }, [sections, chart, load]);

  useEffect(() => {
    if (unlocked) reset();
  }, [unlocked, reset]);

  function openQuestion(slot: NatalSlot) {
    const next = openSlot === slot.id ? null : slot.id;
    setOpenSlot(next);
    if (next) load([slot.id]);
    const value = texts[slot.id];
    if (next && value && "locked" in value) setPaywall(true);
  }

  const sun = chartBody(chart, "sun");
  const moon = chartBody(chart, "moon");

  const showChart = variant === "full";

  return (
    <div className="w-full">
      {showChart ? (
        <>
      {/* Шапка: что посчитано и по каким данным */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Карта на {formatBirthDate(local.date)}
        </h2>
        <span className="text-text-secondary" style={{ fontSize: 14 }}>
          {local.time ? `${local.time}` : "время не указано"}
          {chart.place ? `, ${chart.place.name ?? ""}` : local.placeText ? `, ${local.placeText}` : ""}
        </span>
        {variation.preliminary && <PreliminaryBadge />}
      </div>

      {variation.preliminary && (
        <NatalVariationNote
          birth={local}
          facts={variation.facts}
          precision={chart.moment.precision}
          moscowNoon={moscowClock(chart.moment.utc)}
          onRefine={refine}
        />
      )}

      <ChartNotes chart={chart} />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <NatalWheel chart={chart} active={active} onActivate={setActive} className="mx-auto w-full max-w-[560px]" />
        <div>
          <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Положения
          </div>
          <div className="mt-3">
            <NatalPositions chart={chart} active={active} onActivate={setActive} />
          </div>
          {sun && moon ? (
            <p className="mt-4 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Солнце {formatZodiac(sun.longitude, { seconds: true })}, Луна {formatZodiac(moon.longitude, { seconds: true })}.
              Положения рассчитаны по астрономическим эфемеридам и сверены со Swiss Ephemeris
            </p>
          ) : null}
        </div>
      </div>
        </>
      ) : null}

      {/* Вопросы разбора */}
      <div className="mt-10 flex flex-col" style={{ gap: 28 }}>
        {sections.map((section) => (
          <section key={section.id}>
            <h3 className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 28px)", lineHeight: 1.15 }}>
              {section.title}
            </h3>
            <p className="mt-1.5 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.55 }}>
              {section.lead}
            </p>

            <div className="mt-4 flex flex-col" style={{ gap: 10 }}>
              {section.slots
                .filter((slot) => natalTextKey(slot, chart) !== null)
                .map((slot) => {
                  const value = texts[slot.id];
                  const locked = value && "locked" in value;
                  const open = openSlot === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className="rounded-[14px] border border-border bg-surface-1"
                      style={{ padding: "0 18px" }}
                    >
                      <button
                        type="button"
                        onClick={() => openQuestion(slot)}
                        className="flex w-full items-center justify-between gap-4 py-4 text-left"
                        aria-expanded={open}
                      >
                        <span className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.4 }}>
                          {slot.label}
                          <span className="ml-2 text-text-secondary" style={{ fontSize: 13 }}>
                            {positionHint(slot, chart)}
                          </span>
                        </span>
                        <span className="shrink-0 text-text-accent" style={{ fontSize: 13 }}>
                          {locked ? "замок" : slot.free ? "бесплатно" : open ? "свернуть" : "открыть"}
                        </span>
                      </button>

                      {open && (
                        <div className="pb-4">
                          {busy.has(slot.id) ? (
                            <p className="text-text-secondary" style={{ fontSize: 15 }}>
                              Пишем разбор…
                            </p>
                          ) : locked ? (
                            <LockNote onOpen={() => setPaywall(true)} />
                          ) : value && "text" in value ? (
                            <div className="flex flex-col" style={{ gap: 12 }}>
                              {value.text.split("\n\n").map((p, i) => (
                                <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
                                  {p}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-text-secondary" style={{ fontSize: 15 }}>
                              Не удалось загрузить текст. Попробуйте ещё раз
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      <Paywall open={paywall} onClose={() => setPaywall(false)} date={local.date} system="natal" reason={reason ?? undefined} />
    </div>
  );
}

/** Короткая подпись к вопросу: где именно стоит планета. */
function positionHint(slot: NatalSlot, chart: NatalChart): string {
  if (slot.kind === "body_sign" && slot.body) {
    const b = chartBody(chart, slot.body);
    return b ? `· ${b.sign.name}${b.retrograde ? ", R" : ""}` : "";
  }
  if (slot.kind === "body_house" && slot.body) {
    const b = chartBody(chart, slot.body);
    return b?.house ? `· ${b.house} дом` : "";
  }
  if (slot.kind === "asc_sign") return chart.asc ? `· ${chart.asc.sign.name}` : "";
  if (slot.kind === "mc_sign") return chart.mc ? `· ${chart.mc.sign.name}` : "";
  if (slot.kind === "aspect" && slot.aspect) {
    const found = chart.aspects.find((a) => a.a === slot.aspect!.a && a.b === slot.aspect!.b);
    return found ? `· орбис ${found.orb.toFixed(1)}°` : "";
  }
  return "";
}

/** Честные оговорки: чего не хватает и что из-за этого не посчитано. */
function ChartNotes({ chart }: { chart: NatalChart }) {
  const notes: string[] = [];

  if (chart.moment.precision === "date_only") {
    notes.push(
      `Место рождения не выбрано из справочника, поэтому карта построена на полдень по всемирному времени — это ${moscowClock(chart.moment.utc)} (мск). Знаки медленных планет верны, но Луна может отличаться на несколько градусов, а дома и асцендент не считаются вовсе.`,
    );
  } else if (chart.moment.precision === "noon") {
    notes.push(
      "Время рождения не указано, поэтому карта построена на полдень. Дома и асцендент не определены: они меняются каждые два часа.",
    );
  }

  if (chart.unknown.moonSign) {
    notes.push("В этот день Луна переходит из знака в знак. Без времени рождения назвать её знак нельзя — добавьте время.");
  }

  if (chart.unknown.polarHouses) {
    notes.push(
      "Место за полярным кругом: система домов Плацидуса там математически не определена. Дома посчитаны по Порфирию, асцендент и середина неба верны в любом случае.",
    );
  }

  if (chart.moment.clockShiftNote) notes.push(`${chart.moment.clockShiftNote}.`);

  if (chart.moment.offsetLabel && chart.place) {
    notes.push(
      `Местное время переведено во всемирное как ${chart.moment.offsetLabel} — с учётом декретного и летнего времени, действовавших в этом месте в тот год.`,
    );
  }

  if (notes.length === 0) return null;

  return (
    <div className="mt-4 rounded-[14px] border border-border bg-surface-1" style={{ padding: "14px 18px" }}>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {notes.map((n) => (
          <p key={n} className="text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Заголовок для страницы направления: знак Солнца крупно. */
export function NatalHeadline({ chart }: { chart: NatalChart }) {
  const sun = chartBody(chart, "sun");
  const moon = chartBody(chart, "moon");
  if (!sun) return null;
  return (
    <div>
      <div className="font-display text-text-primary" style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}>
        Солнце {sun.sign.inCase}
      </div>
      <div className="mt-2 text-text-secondary" style={{ fontSize: "clamp(15px, 1.15vw, 18px)" }}>
        {moon && !chart.unknown.moonSign ? `Луна ${moon.sign.inCase}` : "Знак Луны — по времени рождения"}
        {chart.asc ? `, асцендент ${chart.asc.sign.inCase}` : ""}
      </div>
      <div className="mt-1 text-text-secondary" style={{ fontSize: 13, opacity: 0.75 }}>
        {pointName("asc")} и дома считаются только по времени и месту
      </div>
    </div>
  );
}
