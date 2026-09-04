"use client";

import { useEffect, useMemo, useState } from "react";
import { buildHumanDesignChart, hdDayVariation, hdSections, type HumanDesignChart } from "@/lib/humandesign";
import { RefineBirth } from "@/components/common/RefineBirth";
import { formatBirthDate } from "@/lib/pendingBirth";
import { Paywall } from "@/components/reading/Paywall";
import { Bodygraph, CenterList } from "./Bodygraph";
import { useHdTexts } from "./useHdTexts";
import type { BirthValue } from "@/components/natal/BirthForm";

/**
 * Разбор бодиграфа: схема, ключевые итоги и вопросы по разделам.
 *
 * Схема с определёнными центрами видна всем без регистрации, как
 * октаграмма у матрицы. Замок стоит внутри: тип и стратегия бесплатно,
 * авторитет, профиль, каналы и ворота — по подписке.
 */

export function chartFromBirth(birth: BirthValue): HumanDesignChart {
  return buildHumanDesignChart({
    date: birth.date,
    time: birth.time,
    tz: birth.place?.tz ?? null,
    latitude: birth.place?.lat ?? null,
    longitude: birth.place?.lon ?? null,
    placeName: birth.place?.label ?? birth.placeText ?? null,
  });
}

/**
 * Меняется ли бодиграф за сутки рождения. Считается только когда время
 * неизвестно: если результат за сутки не меняется, оговорок не нужно —
 * он верен в любой час этого дня.
 */
export function useHdVariation(birth: BirthValue, chart: HumanDesignChart) {
  return useMemo(() => {
    if (!chart.approximate) return { preliminary: false, facts: [] as string[] };
    const v = hdDayVariation(birth.date, birth.place?.tz ?? null, birth.place?.label ?? null);
    return { preliminary: !v.stable, facts: v.facts };
  }, [birth.date, birth.place?.tz, birth.place?.label, chart.approximate]);
}

/** Пометка «предварительно» рядом с названием типа. */
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

/** Почему расчёт получился приблизительным — ровно по тому, чего не хватает. */
function whyApproximate(precision: "exact" | "noon" | "date_only", hasTime: boolean): string {
  if (precision === "noon") return "Время рождения не указано, поэтому расчёт сделан на полдень по местному времени.";
  if (hasTime) {
    return "Место не выбрано из справочника, поэтому перевести указанный час во всемирное время нельзя — расчёт сделан на полдень.";
  }
  return "Ни время, ни место не указаны, поэтому расчёт сделан на полдень по всемирному времени.";
}

/** Что именно меняется за сутки и кнопка уточнения — под результатом. */
export function HdVariationNote({
  birth,
  facts,
  precision,
  onRefine,
}: {
  birth: BirthValue;
  facts: string[];
  precision: "exact" | "noon" | "date_only";
  onRefine: (next: BirthValue) => void;
}) {
  return (
    <div className="mt-4 w-full max-w-full rounded-[14px] border border-border bg-surface-1" style={{ padding: "14px 18px" }}>
      <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
        {whyApproximate(precision, birth.time !== null)} В этот день результат за сутки меняется:
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

export function HdReading({
  birth,
  variant = "full",
  onRefine,
}: {
  birth: BirthValue;
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
  const variation = useHdVariation(local, chart);
  const [active, setActive] = useState<string | null>(null);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);

  const { texts, busy, unlocked, reason, load, reset } = useHdTexts({
    date: local.date,
    time: local.time,
    placeId: local.place?.id ?? null,
  });

  const sections = useMemo(() => hdSections(chart), [chart]);

  useEffect(() => {
    const free = sections.flatMap((s) => s.slots.filter((x) => x.free).map((x) => x.id));
    if (free.length > 0) load(free);
  }, [sections, load]);

  useEffect(() => {
    if (unlocked) reset();
  }, [unlocked, reset]);

  const totalSlots = sections.reduce((n, s) => n + s.slots.length, 0);

  return (
    <div className="w-full">
      {variant === "full" && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
              Бодиграф на {formatBirthDate(local.date)}
            </h2>
            <span className="text-text-secondary" style={{ fontSize: 14 }}>
              {local.time ?? "время не указано"}
              {chart.place ? `, ${chart.place.name ?? ""}` : local.placeText ? `, ${local.placeText}` : ""}
            </span>
            {variation.preliminary && <PreliminaryBadge />}
          </div>

          {variation.preliminary && (
            <HdVariationNote
              birth={local}
              facts={variation.facts}
              precision={chart.moment.precision}
              onRefine={refine}
            />
          )}

          <HdNotes chart={chart} />

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <Bodygraph chart={chart} active={active} onActivate={setActive} className="mx-auto w-full max-w-[380px]" />

            <div>
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Тип" value={chart.type.name} preliminary={variation.preliminary} />
                <Fact label="Стратегия" value={chart.type.strategy} />
                <Fact label="Авторитет" value={chart.authority.name} />
                <Fact label="Профиль" value={chart.profile} />
                <Fact label="Определение" value={definitionName(chart)} />
                <Fact label="Каналов" value={`${chart.channels.length} из 36`} />
              </div>

              <div className="mt-6">
                <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Центры
                </div>
                <div className="mt-3">
                  <CenterList chart={chart} active={active} onActivate={setActive} />
                </div>
              </div>

              <p className="mt-5 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
                Карта личности рассчитана на момент рождения, карта дизайна — на {chart.daysBetween.toFixed(1)} суток
                раньше, когда Солнце стояло на 88° назад. Расчёт сверен с открытым калькулятором на двадцати датах
              </p>
            </div>
          </div>
        </>
      )}

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
              {section.slots.map((slot) => {
                const value = texts[slot.id];
                const locked = value && "locked" in value;
                const open = openSlot === slot.id;
                return (
                  <div key={slot.id} className="rounded-[14px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = open ? null : slot.id;
                        setOpenSlot(next);
                        if (next) load([slot.id]);
                        if (next && value && "locked" in value) setPaywall(true);
                      }}
                      onMouseEnter={() => {
                        if (slot.center) setActive(`center:${slot.center}`);
                        if (slot.channel) setActive(`channel:${Math.min(slot.channel.a, slot.channel.b)}_${Math.max(slot.channel.a, slot.channel.b)}`);
                      }}
                      onMouseLeave={() => setActive(null)}
                      className="flex w-full items-center justify-between gap-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.4 }}>
                        {slot.label}
                      </span>
                      <span className="shrink-0 text-text-accent" style={{ fontSize: 13 }}>
                        {locked ? "замок" : slot.free ? "бесплатно" : open ? "свернуть" : "открыть"}
                      </span>
                    </button>

                    {open && (
                      <div className="mt-3">
                        {busy.has(slot.id) ? (
                          <p className="text-text-secondary" style={{ fontSize: 15 }}>
                            Пишем разбор…
                          </p>
                        ) : locked ? (
                          <p className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                            Этот вопрос открывается по подписке.{" "}
                            <button type="button" onClick={() => setPaywall(true)} className="text-text-accent underline-offset-4 hover:underline">
                              Что входит
                            </button>
                          </p>
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

      <Paywall
        open={paywall}
        onClose={() => setPaywall(false)}
        date={local.date}
        freeCount={2}
        totalCount={totalSlots}
        reason={reason ?? undefined}
      />
    </div>
  );
}

function Fact({ label, value, preliminary = false }: { label: string; value: string; preliminary?: boolean }) {
  return (
    <div>
      <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="text-text-primary" style={{ fontSize: "clamp(16px, 1.3vw, 20px)", lineHeight: 1.25 }}>
          {value}
        </span>
        {preliminary && <span className="text-text-accent" style={{ fontSize: 12 }}>предварительно</span>}
      </div>
    </div>
  );
}

function definitionName(chart: HumanDesignChart): string {
  const names: Record<string, string> = {
    none: "Нет определения",
    single: "Единое",
    split: "Раздвоенное",
    triple_split: "Тройное",
    quadruple_split: "Четверное",
  };
  return names[chart.definition] ?? chart.definition;
}

/** Честные оговорки: без времени бодиграф может быть неверным. */
function HdNotes({ chart }: { chart: HumanDesignChart }) {
  const notes: string[] = [];

  if (chart.moment.precision === "date_only") {
    notes.push(
      "Место рождения не выбрано из справочника, поэтому карта построена на полдень по всемирному времени. Быстрые активации — Луна и оба узла — за сутки уходят на несколько ворот вперёд, а от них зависят каналы и тип. Это прикидка, а не ваш бодиграф.",
    );
  } else if (chart.moment.precision === "noon") {
    notes.push(
      "Время рождения не указано, карта построена на полдень. Для бодиграфа это существеннее, чем для натальной карты: Луна проходит одни ворота примерно за десять часов, и от неё может зависеть целый канал, а значит и тип. Добавьте время, чтобы результат стал вашим.",
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
