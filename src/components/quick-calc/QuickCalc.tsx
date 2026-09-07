"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { toIsoDate } from "@/lib/pendingBirth";
import { arcana, MONTHS, centralArcanum, isFutureDate, isValidDate } from "@/lib/arcana";
import { arcanaIntro, readingPath } from "@/lib/matrix";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useAuth } from "@/lib/useAuth";
import { backend, RELATION_LABELS, type Person } from "@/lib/backend";
import { useGoToReading } from "@/components/reading/CalcTheater";
import { Orbits } from "./Orbits";
import { ARC_H, arcTransitionStyle } from "@/components/common/ArcTransition";

/**
 * БЫСТРЫЙ РАСЧЁТ ЦЕНТРАЛЬНОГО АРКАНА — главная и витрины направлений.
 *
 * МОМЕНТ РЕЗУЛЬТАТА — СОБЫТИЕ, а не подмена картинки: карта лежит
 * рубашкой вверх и переворачивается, когда число посчитано. Рядом крупно
 * номер и название аркана и две фразы из готового бесплатного текста —
 * чтобы человек узнал себя сразу. Ниже одна главная кнопка «Открыть всю
 * матрицу», под ней честная строка про сферы и вопросы, рядом четыре
 * подсказки, что внутри, — каждая ведёт в свою сферу разбора по этой
 * дате. «Другая дата» — тихой ссылкой.
 *
 * На телефоне карта стоит между заголовком и результатом, и после
 * расчёта страница сама подъезжает к ней: карта и кнопка на экране.
 *
 * Вошедшему считается сразу по его дате, без ввода, с выбором другого
 * человека из своих — форма остаётся за «Другой датой».
 */

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CARD_BACK = "/images/card-back.jpg";

const selectClass =
  "qc-focus h-14 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 pr-10 text-[17px] text-text-primary transition-colors focus:border-text-accent";

/** Что внутри полного разбора — четыре сферы, в которые ведут подсказки. */
const INSIDE: Array<{ id: string; label: string }> = [
  { id: "money", label: "Деньги" },
  { id: "relations", label: "Отношения" },
  { id: "purpose", label: "Предназначение" },
  { id: "health", label: "Здоровье" },
];

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

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

type Stage = "form" | "loading" | "result";

type QuickCalcProps = {
  id?: string;
  title?: string;
  subtitle?: string;
  /** сколько сфер и вопросов в полной матрице — считает сервер по карте позиций */
  spheres?: number;
  questions?: number;
};

export function QuickCalc({
  id = "quick-calc",
  title = "Посмотри свой центральный аркан",
  subtitle = "Одно число, вокруг которого собирается вся матрица. Считается из даты рождения, без регистрации",
  spheres = 12,
  questions = 92,
}: QuickCalcProps = {}) {
  const isHeroOverlap = id === "quick-calc";
  const reduced = useReducedMotion();
  const go = useGoToReading();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [result, setResult] = useState<number | null>(null);
  const [iso, setIso] = useState<string | null>(null);
  const [fast, setFast] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileStage = useRef<HTMLDivElement | null>(null);
  // Прокручиваем к результату только после действия человека: сам по
  // себе расчёт по дате вошедшего страницу дёргать не должен.
  const byHand = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    },
    [],
  );

  /** Показать результат по готовой дате — без формы и ожидания. */
  function show(isoDate: string) {
    const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return;
    if (timer.current) clearTimeout(timer.current);
    setDay(String(d));
    setMonth(String(m));
    setYear(String(y));
    setIso(toIsoDate(d, m, y));
    setResult(centralArcanum(d, m, y));
    setFast(false);
    setStage("result");
  }

  // Вошедшему — сразу по его дате, с выбором других своих людей.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    backend.people.list(user.id).then(({ data }) => {
      if (!alive || !data || data.length === 0) return;
      const sorted = [...data].sort((a, b) => (a.relation === "self" ? -1 : b.relation === "self" ? 1 : 0));
      setPeople(sorted);
      setPersonId(sorted[0].id);
      show(sorted[0].birth_date);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // На телефоне после расчёта — к карте и кнопке.
  useEffect(() => {
    if (stage !== "result" || !byHand.current) return;
    byHand.current = false;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const el = mobileStage.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() =>
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }),
    );
    return () => window.cancelAnimationFrame(raf);
  }, [stage, reduced]);

  const complete = day !== "" && month !== "" && year !== "";
  const dateInvalid = complete && !isValidDate(Number(day), Number(month), Number(year));
  const dateFuture = complete && !dateInvalid && isFutureDate(Number(day), Number(month), Number(year));

  const handleSubmit = () => {
    if (!complete || dateInvalid || dateFuture) return;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    byHand.current = true;
    setPersonId(null);
    setStage("loading");
    if (!reduced) setFast(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setIso(toIsoDate(d, m, y));
        setResult(centralArcanum(d, m, y));
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
    setIso(null);
    setFast(false);
    setPersonId(null);
    setStage("form");
  };

  const card = result ? arcana.find((a) => a.n === result) : null;
  const person = people.find((p) => p.id === personId) ?? null;
  const who = person ? (person.relation === "self" ? "Вы" : person.name) : null;
  const path = iso ? readingPath("matrica", [iso]) : null;

  const stageProps = { stage, card: card ?? null, fast, reduced };

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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" style={{ opacity: 0.04 }}>
        <svg className="h-full w-full">
          <filter id={`qc-grain-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
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
            style={{ fontSize: "clamp(32px, 3.4vw, 64px)", letterSpacing: "0.01em", lineHeight: 1.08 }}
          >
            {title}
          </h2>
          <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(16px, 1.2vw, 20px)" }}>
            {subtitle}
          </p>

          {/* На телефоне карта — между заголовком и результатом, чтобы
              после расчёта карта и кнопка оказались на одном экране. */}
          {stage === "result" && (
            <div className="mt-8 md:hidden">
              <CardStage {...stageProps} innerRef={mobileStage} />
            </div>
          )}

          {stage !== "result" ? (
            <div className="mt-10">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <label className="sr-only" htmlFor={`${id}-day`}>
                    День
                  </label>
                  <select id={`${id}-day`} className={selectClass} value={day} onChange={(e) => setDay(e.target.value)}>
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
                  <select id={`${id}-month`} className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)}>
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
                  <select id={`${id}-year`} className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
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

              {dateInvalid && <p className="mt-3 text-[15px] text-text-danger">Такой даты не существует — проверь день и месяц</p>}
              {dateFuture && <p className="mt-3 text-[15px] text-text-danger">Эта дата ещё не наступила</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!complete || dateInvalid || dateFuture || stage === "loading"}
                className="qc-focus mt-5 h-14 rounded-[12px] bg-accent px-10 text-[17px] font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed"
                style={{ opacity: !complete || dateInvalid || dateFuture || stage === "loading" ? 0.4 : 1 }}
              >
                {stage === "loading" ? "Считаем" : "Показать"}
              </button>
            </div>
          ) : (
            card &&
            iso &&
            path && (
              <div className="mt-8 md:mt-10" style={{ animation: reduced ? "none" : "qc-result-in 800ms ease-out both" }}>
                {people.length > 1 && (
                  <div className="mb-6 md:max-w-[380px]">
                    <label htmlFor={`${id}-person`} className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Кого посмотрим
                    </label>
                    <div className="relative mt-2">
                      <select
                        id={`${id}-person`}
                        className={`${selectClass} h-12 text-[16px]`}
                        value={personId ?? ""}
                        onChange={(e) => {
                          const next = people.find((p) => p.id === e.target.value);
                          if (!next) return;
                          byHand.current = true;
                          setPersonId(next.id);
                          show(next.birth_date);
                        }}
                      >
                        {people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.relation === "self" ? "Вы" : `${p.name} · ${RELATION_LABELS[p.relation]}`}
                          </option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                  </div>
                )}

                <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">
                  {who ? `Центральный аркан · ${who}` : "Ваш центральный аркан"}
                </div>
                <div className="mt-2 font-display text-text-primary" style={{ fontSize: "clamp(34px, 3.4vw, 60px)", letterSpacing: "0.01em", lineHeight: 1.05 }}>
                  {card.n} · {card.name}
                </div>
                <p className="mt-3 max-w-[560px] text-text-primary" style={{ fontSize: "clamp(16px, 1.2vw, 19px)", lineHeight: 1.55 }}>
                  {arcanaIntro(card.n)}
                </p>

                <FullReadingButton
                  pending={{ date: iso, direction: "matrix" }}
                  label="Открыть всю матрицу"
                  className="qc-focus qc-cta"
                  style={{}}
                />
                <p className="mt-3 max-w-[560px] text-text-secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {spheres} {plural(spheres, "сфера", "сферы", "сфер")} и {questions} {plural(questions, "вопрос", "вопроса", "вопросов")} по
                  этой дате — первый вопрос в каждой сфере бесплатно
                </p>

                <div className="mt-5">
                  <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Что внутри
                  </div>
                  <div className="mt-2 flex flex-wrap" style={{ gap: 8 }}>
                    {INSIDE.map((s) => (
                      <button key={s.id} type="button" onClick={() => go(`${path}#sphere-${s.id}`)} className="qc-focus qc-chip">
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={reset}
                  className="mt-6 bg-transparent text-[15px] text-text-accent underline-offset-4 hover:underline"
                >
                  Другая дата
                </button>
              </div>
            )
          )}
        </div>

        {/* right column — на телефоне в состоянии результата карта уже стоит выше */}
        <div className={`w-full md:w-[50%] ${stage === "result" ? "hidden md:block" : ""}`}>
          <CardStage {...stageProps} />
        </div>
      </div>
    </section>
  );
}

/**
 * Орбиты и карта. Пока результата нет, карта лежит рубашкой вверх со
 * знаком вопроса; посчитали — переворачивается лицом.
 */
function CardStage({
  stage,
  card,
  fast,
  reduced,
  innerRef,
}: {
  stage: Stage;
  card: { n: number; name: string } | null;
  fast: boolean;
  reduced: boolean;
  innerRef?: RefObject<HTMLDivElement | null>;
}) {
  const flipped = stage === "result" && card !== null;
  return (
    <div ref={innerRef} className="relative mx-auto aspect-square w-full" style={{ scrollMarginTop: "calc(var(--header-h) + 8px)" }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(122, 93, 168, 0.22) 0%, rgba(122, 93, 168, 0) 55%)" }}
      />
      <Orbits speedFactor={fast ? 4 : 1} dim={stage === "result"} still={reduced} />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="qc-card" style={{ width: "min(52%, 240px)" }}>
          <div className={`qc-card-inner ${flipped ? "is-flipped" : ""} ${reduced ? "is-still" : ""}`}>
            <div className="qc-face qc-face-back">
              <img src={CARD_BACK} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              <span
                className="qc-card-mark font-mono text-text-accent"
                aria-hidden="true"
                style={{ opacity: stage === "loading" ? 0 : 1, transition: reduced ? "none" : "opacity 400ms ease-out" }}
              >
                ?
              </span>
            </div>
            <div className="qc-face qc-face-front" aria-hidden={!flipped}>
              {card && <ArcanaImage n={card.n} width="100%" size="lg" rounded={14} priority />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
