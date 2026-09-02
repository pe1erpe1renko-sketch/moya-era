"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { toIsoDate } from "@/lib/pendingBirth";
import { arcana, MONTHS, centralArcanum, isValidDate } from "@/lib/arcana";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Orbits } from "./Orbits";
import { ARC_H, arcTransitionStyle } from "@/components/common/ArcTransition";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const selectClass =
  "qc-focus h-14 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 pr-10 text-[17px] text-text-primary transition-colors focus:border-text-accent";


/* глубина/форма перехода — общий компонент */

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 8"
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2 text-text-secondary"
    >
      <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}


type QuickCalcProps = {
  id?: string;
  title?: string;
  subtitle?: string;
};

export function QuickCalc({
  id = "quick-calc",
  title = "Посмотри свой центральный аркан",
  subtitle = "Одно число, вокруг которого собирается вся матрица. Считается из даты рождения, без регистрации",
}: QuickCalcProps = {}) {
  const isHeroOverlap = id === "quick-calc";
  const reduced = useReducedMotion();
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [stage, setStage] = useState<"form" | "loading" | "result">("form");
  const [result, setResult] = useState<number | null>(null);
  const [fast, setFast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    },
    [],
  );

  const complete = day !== "" && month !== "" && year !== "";
  const dateInvalid = complete && !isValidDate(Number(day), Number(month), Number(year));

  const handleSubmit = () => {
    if (!complete || dateInvalid) return;
    const value = centralArcanum(Number(day), Number(month), Number(year));
    setStage("loading");
    if (!reduced) setFast(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setResult(value);
        setStage("result");
        if (slowTimer.current) clearTimeout(slowTimer.current);
        slowTimer.current = setTimeout(() => setFast(false), 100);
      },
      reduced ? 200 : 1200,
    );
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setResult(null);
    setFast(false);
    setStage("form");
  };

  const card = result ? arcana.find((a) => a.n === result) : null;

  return (
    <section
      id={id}
      className={`qc-plate relative w-full overflow-hidden ${isHeroOverlap ? "z-[30]" : "z-[2]"}`}
      style={{
        ...arcTransitionStyle,
        paddingTop: `calc(${ARC_H} + 60px)`,
        paddingBottom: "clamp(120px, 14vh, 220px)",
      }}
    >


      {/* grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{ opacity: 0.04 }}
      >
        <svg className="h-full w-full">
          <filter id={`qc-grain-${id}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#qc-grain-${id})`} />
        </svg>
      </div>

      <div
        className="relative z-[4] mx-auto flex w-full max-w-[1600px] flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-[6%]"
        style={{ paddingLeft: "clamp(24px, 6vw, 120px)", paddingRight: "clamp(24px, 6vw, 120px)" }}
      >
        {/* left column */}
        <div className="w-full text-left md:w-[44%]">

          <h2
            className="font-display text-text-primary"
            style={{
              fontSize: "clamp(32px, 3.4vw, 64px)",
              letterSpacing: "0.01em",
              lineHeight: 1.08,
            }}
          >
            {title}
          </h2>
          <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(16px, 1.2vw, 20px)" }}>
            {subtitle}
          </p>

          {stage !== "result" ? (
            <div className="mt-10">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <label className="sr-only" htmlFor={`${id}-day`}>
                    День
                  </label>
                  <select
                    id={`${id}-day`}
                    className={selectClass}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    <option value="">День</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>

                <div className="relative flex-1">
                  <label className="sr-only" htmlFor={`${id}-month`}>
                    Месяц
                  </label>
                  <select
                    id={`${id}-month`}
                    className={selectClass}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="">Месяц</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>

                <div className="relative flex-1">
                  <label className="sr-only" htmlFor={`${id}-year`}>
                    Год
                  </label>
                  <select
                    id={`${id}-year`}
                    className={selectClass}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="">Год</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              {dateInvalid && (
                <p className="mt-3 text-[15px] text-text-danger">
                  Такой даты не существует — проверь день и месяц
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!complete || dateInvalid || stage === "loading"}
                className="qc-focus mt-5 h-14 rounded-[12px] bg-accent px-10 text-[17px] font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed"
                style={{ opacity: !complete || dateInvalid || stage === "loading" ? 0.4 : 1 }}
              >
                {stage === "loading" ? "Считаем" : "Показать"}
              </button>
            </div>
          ) : (
            <div
              className="mt-10"
              style={{ animation: reduced ? "none" : "qc-result-in 800ms ease-out both" }}
            >
              <FullReadingButton
                pending={{
                  date: toIsoDate(Number(day), Number(month), Number(year)),
                  direction: "matrix",
                }}
                className="qc-focus h-14 rounded-[12px] bg-accent px-10 text-[17px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                style={{}}
              />
              <p className="mt-3 text-[14px] text-text-secondary">
                Для полного разбора понадобятся ещё время и место рождения
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 bg-transparent text-[15px] text-text-accent underline-offset-4 hover:underline"
              >
                Другая дата
              </button>
            </div>
          )}
        </div>

        {/* right column — result area */}
        <div className="w-full md:w-[50%]">
          <div className="relative mx-auto aspect-square w-full">
            {/* glow behind the sign */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(122, 93, 168, 0.22) 0%, rgba(122, 93, 168, 0) 55%)",
              }}
            />

            <Orbits speedFactor={fast ? 4 : 1} dim={stage === "result"} still={reduced} />

            {stage !== "result" ? (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  opacity: stage === "loading" ? 0 : 1,
                  transform: stage === "loading" ? "scale(0.85)" : "scale(1)",
                  transition: reduced ? "none" : "opacity 500ms ease-out, transform 500ms ease-out",
                }}
              >
                <span
                  className="qc-numeral font-mono text-text-accent"
                  aria-hidden="true"
                >
                  ?
                </span>
              </div>
            ) : (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
                style={{ animation: reduced ? "none" : "qc-result-in 800ms ease-out both" }}
              >
                <div className="qc-numeral font-mono text-text-accent">{card?.n}</div>
                <div
                  className="mt-2 font-display text-text-primary"
                  style={{
                    fontSize: "clamp(32px, 3.6vw, 68px)",
                    letterSpacing: "0.01em",
                    lineHeight: 1.08,
                  }}
                >
                  {card?.name}
                </div>
                <p
                  className="mt-4 max-w-[420px] text-text-secondary"
                  style={{ fontSize: "clamp(17px, 1.3vw, 22px)" }}
                >
                  {card?.line}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
