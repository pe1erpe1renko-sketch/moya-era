"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import { OtherDirections } from "@/components/landing/OtherDirections";
import { QuickCalc } from "@/components/quick-calc/QuickCalc";
import { CursorStarField } from "@/components/common/CursorStarField";
import { Grain } from "@/components/hero/Grain";
import { OrbitStage } from "@/components/quick-calc/Orbits";
import { ARC_H, arcTransitionStyle } from "@/components/common/ArcTransition";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Direction } from "@/lib/directions";
import type { Person } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import { loadPeople, personLabel } from "@/lib/people";
import { PersonSwitch } from "./PersonSwitch";
import { DirectionLines, type DirectionLine } from "./DirectionLines";
import { DirectionSample } from "./DirectionSample";
import { DirectionFaq, type FaqItem } from "./DirectionFaq";

export type { DirectionLine, FaqItem };

export type CalculatorApi<R> = {
  /** "form" | "loading" | "result" */
  stage: "form" | "loading" | "result";
  /** Запускает переход к результату: пауза 700 мс + прокрутка ко второму экрану. */
  submit: (result: R) => void;
  /**
   * Чей результат показан: человек из профиля вошедшего. Форма
   * подставляет его дату, время, место и имя, чтобы ничего не вводить
   * заново. Гостю — null.
   */
  person: Person | null;
  /** все люди вошедшего, владелец первым — паре нужен и второй */
  people: Person[];
};

export type ResultCtx<R> = {
  result: R;
  /** Заменить результат, не возвращаясь к форме: уточнение времени и места. */
  update: (next: R) => void;
  /** true, пока орбиты разогнаны сразу после расчёта */
  fast: boolean;
  reduced: boolean;
};

export type DirectionPageProps<R> = {
  id: Direction["id"];

  h1: ReactNode;
  heroDescription: ReactNode;
  heroImage: string;
  heroImageAlt: string;
  /** Ширина текстовой колонки первого экрана (например, "min(54%, 760px)"). */
  heroTextWidth?: string;

  aboutTitle: string;
  aboutParagraphs: string[];
  resultLabel: string;

  linesTitle: string;
  linesSubtitle: string;
  lines: DirectionLine[];

  exampleTitle: string;
  exampleSubtitle: string;
  exampleParagraphs: string[];
  exampleFooter: string;

  faqTitle: string;
  faq: FaqItem[];

  otherTitle?: string;
  otherSubtitle?: string;

  finalTitle: string;
  finalSubtitle: string;
  /** Если задан, заменяет стандартный финальный блок QuickCalc. */
  finalBlock?: ReactNode;

  calculator: (api: CalculatorApi<R>) => ReactNode;
  /**
   * ВОШЕДШЕМУ — РЕЗУЛЬТАТ СРАЗУ. Результат по человеку из профиля: страница
   * показывает его без формы и ожидания, а при нескольких людях ставит
   * рядом переключатель. null — по этому человеку посчитать нельзя
   * (например, паре нужен второй).
   */
  fromPerson?: (person: Person, people: Person[]) => R | null;
  /** Подпись переключателя: «Кого посмотрим» или «Второй человек». */
  personLabel?: string;
  /** Кого предлагать в переключателе (пара — всех, кроме владельца). */
  personOptions?: (people: Person[]) => Person[];
  resultVisual: (ctx: ResultCtx<R>) => ReactNode;
  /** Что показывать в правой колонке до расчёта (по умолчанию — орбиты). */
  placeholderVisual?: ReactNode;
  resultContent: (ctx: ResultCtx<R>) => ReactNode;
  explainBlock?: ReactNode | ((ctx: ResultCtx<R> | null) => ReactNode);
};

export function DirectionPage<R>({
  id,
  h1,
  heroDescription,
  heroImage,
  heroImageAlt,
  heroTextWidth,
  aboutTitle,
  aboutParagraphs,
  resultLabel,
  linesTitle,
  linesSubtitle,
  lines,
  exampleTitle,
  exampleSubtitle,
  exampleParagraphs,
  exampleFooter,
  faqTitle,
  faq,
  otherTitle,
  otherSubtitle,
  finalTitle,
  finalSubtitle,
  finalBlock,
  calculator,
  fromPerson,
  personLabel: switchLabel = "Кого посмотрим",
  personOptions,
  resultVisual,
  placeholderVisual,
  resultContent,
  explainBlock,
}: DirectionPageProps<R>) {
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const [stage, setStage] = useState<"form" | "loading" | "result">("form");
  const [result, setResult] = useState<R | null>(null);
  const [fast, setFast] = useState(false);
  // Люди вошедшего (владелец первым) и тот, чей результат показан.
  const [people, setPeople] = useState<Person[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [auto, setAuto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aboutRef = useRef<HTMLElement | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (slowTimer.current) clearTimeout(slowTimer.current);
    },
    [],
  );

  // Вошедшему — сразу по его данным, без формы и ожидания. Страницу не
  // прокручиваем: человек ничего не нажимал. Вместо этого под формой
  // строка «Посчитано для …» с кнопкой к результату.
  useEffect(() => {
    if (!user?.id || !fromPerson) return;
    let alive = true;
    loadPeople(user.id).then((list) => {
      if (!alive || list.length === 0) return;
      const options = personOptions ? personOptions(list) : list;
      const first = options[0];
      const value = first ? fromPerson(first, list) : null;
      setPeople(list);
      if (!first || value === null) return;
      setPerson(first);
      setResult(value);
      setStage("result");
      setAuto(true);
    });
    return () => {
      alive = false;
    };
    // fromPerson и personOptions — чистые функции уровня модуля.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const switchTo = (next: Person) => {
    if (!fromPerson) return;
    const value = fromPerson(next, people);
    if (value === null) return;
    if (timer.current) clearTimeout(timer.current);
    setPerson(next);
    setResult(value);
    setStage("result");
    setAuto(true);
  };

  const submit = (value: R) => {
    setAuto(false);
    setStage("loading");
    if (!reduced) setFast(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setResult(value);
        setStage("result");
        if (slowTimer.current) clearTimeout(slowTimer.current);
        slowTimer.current = setTimeout(() => setFast(false), 100);
        aboutRef.current?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      },
      reduced ? 200 : 700,
    );
  };

  const showResult = stage === "result" && result !== null;
  const ctx: ResultCtx<R> | null = showResult
    ? { result: result as R, update: setResult, fast, reduced }
    : null;

  return (
    <main className="relative w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>

      <section className="ms-hero -mt-[110px] w-full">
        {/* 1 — photo */}
        <img
          src={heroImage}
          alt={heroImageAlt}
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        />

        {/* 2/4 — shade (responsive) */}
        <div aria-hidden="true" className="ms-hero-shade z-[1]" />

        {/* 3 — подсветка у горизонта */}
        <div
          aria-hidden="true"
          className="hero-glow pointer-events-none absolute bottom-0 left-0 right-0 z-[2]"
        />

        {/* 4 — stars */}
        <CursorStarField count={70} opacity={0.6} className="z-[3]" />

        {/* 5 — grain */}
        <Grain />

        {/* 6 — content */}
        <div className="ms-hero-content">
          <div className="ms-hero-text" style={heroTextWidth ? { width: heroTextWidth } : undefined}>
            <h1
              className="font-display text-text-primary"
              style={{ fontSize: "clamp(34px, 3.8vw, 68px)", lineHeight: 1.1 }}
            >
              {h1}
            </h1>

            <p
              className="text-text-secondary"
              style={{ marginTop: 18, fontSize: "clamp(15px, 1.2vw, 20px)" }}
            >
              {heroDescription}
            </p>

            {/* key — чтобы форма пересобралась с данными другого человека */}
            <div key={person?.id ?? "manual"}>{calculator({ stage, submit, person, people })}</div>
            {auto && person && (
              <p className="text-text-secondary" style={{ marginTop: 14, fontSize: 14, lineHeight: 1.5 }}>
                Посчитано для {personLabel(person)}.{" "}
                <button
                  type="button"
                  onClick={() => aboutRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
                  className="qc-focus text-text-accent underline-offset-4 hover:underline"
                >
                  К результату
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        id="about"
        ref={aboutRef}
        className="relative z-[30] w-full overflow-hidden"
        style={{
          ...arcTransitionStyle,
          minHeight: "90vh",
          paddingTop: `calc(${ARC_H} + 40px + clamp(64px, 8vh, 120px))`,
          paddingBottom: "clamp(64px, 8vh, 120px)",
        }}
      >
        {/* растворение чёрного в фон страницы */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[200px]"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0), var(--bg-page))" }}
        />
        <div
          className="relative z-[2] mx-auto flex w-full max-w-[1320px] flex-col-reverse items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-[6%]"
          style={{ paddingLeft: "clamp(24px, 5vw, 80px)", paddingRight: "clamp(24px, 5vw, 80px)" }}
        >
          {/* left column */}
          <div className="w-full md:w-[50%]">
            {!ctx ? (
              <div>
                <h2
                  className="font-display text-text-primary"
                  style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
                >
                  {aboutTitle}
                </h2>
                <div
                  className="flex flex-col text-text-secondary"
                  style={{
                    marginTop: 24,
                    gap: 16,
                    fontSize: "clamp(15px, 1.15vw, 19px)",
                    lineHeight: 1.65,
                  }}
                >
                  {aboutParagraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ animation: reduced ? "none" : "ms-detail-in 600ms ease-out both" }}>
                {fromPerson && (
                  <PersonSwitch
                    id={`${id}-person`}
                    label={switchLabel}
                    people={personOptions ? personOptions(people) : people}
                    value={person?.id ?? null}
                    onChange={switchTo}
                  />
                )}
                <div
                  className="uppercase text-text-secondary"
                  style={{ fontSize: 13, letterSpacing: "0.08em" }}
                >
                  {resultLabel}
                </div>
                {resultContent(ctx)}
              </div>
            )}
          </div>

          {/* right column — orbits / result visual */}
          <div className="w-full md:w-[44%]">
            {ctx ? (
              resultVisual(ctx)
            ) : (
              (placeholderVisual ?? (
                <OrbitStage value={null} speedFactor={fast ? 4 : 1} still={reduced} />
              ))
            )}
          </div>
        </div>
      </section>

      <DirectionLines title={linesTitle} subtitle={linesSubtitle} lines={lines} />

      {typeof explainBlock === "function" ? explainBlock(ctx) : explainBlock}

      <DirectionSample
        title={exampleTitle}
        subtitle={exampleSubtitle}
        paragraphs={exampleParagraphs}
        footer={exampleFooter}
      />

      <DirectionFaq title={faqTitle} items={faq} />

      <Pricing />

      <OtherDirections
        currentId={id}
        {...(otherTitle ? { title: otherTitle } : {})}
        {...(otherSubtitle ? { subtitle: otherSubtitle } : {})}
      />

      {finalBlock ?? <QuickCalc id="start" title={finalTitle} subtitle={finalSubtitle} />}

      <Footer />
    </main>
  );
}
