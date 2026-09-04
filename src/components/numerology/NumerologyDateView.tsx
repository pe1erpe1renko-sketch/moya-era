"use client";

import { useEffect, useState } from "react";
import { briefSlots, numerologySections, type NumerologyChart } from "@/lib/numerology";
import { BriefList, type BriefItem } from "@/components/chart/BriefList";
import { useSlotTexts } from "@/components/chart/useSlotTexts";
import { Paywall } from "@/components/reading/Paywall";
import { formatBirthDate } from "@/lib/pendingBirth";
import { NumbersSchema, PythagorasSquare, WorkingNumbers } from "./NumbersSchema";

/**
 * СТРАНИЦА НУМЕРОЛОГИИ ПО ДАТЕ — /numerologiya/26-07-1990
 *
 * Открыто всем: схема из четырёх чисел, квадрат Пифагора, арифметика
 * рабочих чисел и короткая справка по каждому числу. Под замком — полные
 * разборы чисел и девять ячеек квадрата.
 *
 * Ни времени, ни места нумерологии не нужно: она считается по одной дате
 * целиком. Поэтому здесь нет ни кнопки уточнения, ни оговорок про полдень —
 * этой странице нечего оговаривать, и делать вид, что есть, не нужно.
 */

export function NumerologyDateView({
  chart,
  initialTexts,
}: {
  chart: NumerologyChart;
  /** короткие справки, посчитанные на сервере */
  initialTexts: Record<string, string>;
}) {
  const [paywall, setPaywall] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const brief = briefSlots(chart);
  const sections = numerologySections(chart);

  const { texts, busy, unlocked, load, reset } = useSlotTexts(
    "/api/content/numerologiya",
    { date: chart.date, forYear: chart.forYear },
    `${chart.date}|${chart.forYear}`,
  );

  useEffect(() => {
    if (unlocked) reset();
  }, [unlocked, reset]);

  const items: BriefItem[] = brief.map((slot) => {
    const loaded = texts[slot.id];
    return {
      id: slot.id,
      title: slot.label,
      detail: slot.hint,
      text: loaded && "text" in loaded ? loaded.text : (initialTexts[slot.id] ?? null),
    };
  });

  return (
    <div className="w-full">
      <header>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.08 }}>
          Нумерология {formatBirthDate(chart.date)}
        </h1>
        <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(16px, 1.25vw, 20px)", lineHeight: 1.5 }}>
          Число жизненного пути {chart.path}, число дня рождения {chart.birthday}, число отношения {chart.attitude}.
          Личный год на {chart.forYear} — {chart.personalYear}
        </p>
      </header>

      <NumbersSchema chart={chart} className="mt-7" />

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div>
          <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Квадрат Пифагора
          </div>
          <PythagorasSquare chart={chart} className="mt-3" />
        </div>
        <div>
          <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Как это посчитано
          </div>
          <div className="mt-3">
            <WorkingNumbers chart={chart} />
          </div>
          <p className="mt-5 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
            Считаем по одной методике: все цифры даты складываются в сумму, сумма сворачивается до одной цифры, и
            свёртка останавливается на 11 или 22 — это мастер-числа. Времени и места рождения нумерологии не нужно
          </p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Коротко о каждом числе
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Четыре числа этой даты. Подробный разбор каждого и девять ячеек квадрата — ниже
        </p>
        <BriefList items={items} />
      </section>

      <section className="mt-14">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Полный разбор
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Тринадцать вопросов: четыре числа подробно и каждая ячейка квадрата. Открывает подписка
        </p>

        <div className="mt-6 flex flex-col" style={{ gap: 28 }}>
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
                  const isOpen = open === slot.id;
                  return (
                    <div key={slot.id} className="rounded-[14px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const next = isOpen ? null : slot.id;
                          setOpen(next);
                          if (next) load([slot.id]);
                          if (next && value && "locked" in value) setPaywall(true);
                        }}
                        className="flex w-full items-center justify-between gap-4 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.4 }}>
                          {slot.label}
                          {slot.hint && (
                            <span className="ml-2 text-text-secondary" style={{ fontSize: 13 }}>
                              · {slot.hint}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-text-accent" style={{ fontSize: 13 }}>
                          {locked ? "замок" : isOpen ? "свернуть" : "открыть"}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mt-3">
                          {busy.has(slot.id) ? (
                            <p className="text-text-secondary" style={{ fontSize: 15 }}>
                              Пишем разбор…
                            </p>
                          ) : locked ? (
                            <p className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                              Этот вопрос открывается по подписке.{" "}
                              <button
                                type="button"
                                onClick={() => setPaywall(true)}
                                className="text-text-accent underline-offset-4 hover:underline"
                              >
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
      </section>

      <Paywall
        open={paywall}
        onClose={() => setPaywall(false)}
        date={chart.date}
        freeCount={brief.length}
        totalCount={brief.length + sections.reduce((n, s) => n + s.slots.length, 0)}
      />
    </div>
  );
}
