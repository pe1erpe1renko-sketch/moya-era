"use client";

import { useEffect, useRef, useState } from "react";
import {
  DirectionPage,
  type CalculatorApi,
  type FaqItem,
  type ResultCtx,
} from "@/components/direction/DirectionPage";
import { DateCalculator } from "@/components/direction/DateCalculator";
import { Orbits } from "@/components/quick-calc/Orbits";
const natalAsset = "/images/natal.png";
import { sunSign, type SunSignResult } from "@/lib/natal";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { toIsoDate } from "@/lib/pendingBirth";
import { NATAL_LINES } from "@/lib/directionLines";

type NatalResult = SunSignResult & { date: { day: number; month: number; year: number } };

const ABOUT_PARAGRAPHS = [
  "Натальная карта — это положение планет в момент рождения, рассчитанное для конкретной точки на Земле. Не символическая схема, а реальное небо: те же астрономические таблицы, по которым работают обсерватории.",
  "Из одной даты выводится только знак Солнца — где Солнце стояло в тот день. Это одна позиция из десяти, и по ней видно немного: общий способ проявляться, не больше.",
  "Всё остальное требует времени и места. Луна меняет знак каждые два с половиной дня, асцендент — примерно каждые два часа. Без времени рождения половина карты остаётся неизвестной, и никакой сервис этого не обойдёт.",
  "Поэтому натальная карта — самое требовательное к данным направление из шести. Зато и самое подробное: в полной карте больше сорока позиций.",
];

const LINES = NATAL_LINES;

const SAMPLE_PARAGRAPHS = [
  "Солнце во Льве даёт потребность в отклике — не в аплодисментах, а в подтверждении, что сделанное замечено. Ты плохо переносишь работу в стол и молчание в ответ. Это не тщеславие: без обратной связи у тебя буквально падает мотивация, и никакая дисциплина этого не компенсирует.",
  "Луна в Деве при этом устроена противоположно. Она успокаивается порядком, деталями и предсказуемостью — тем, что Солнцу во Льве кажется мелким и скучным. Внутри тебя постоянно спорят двое: один хочет размаха, другой сначала проверит расчёты.",
  "Именно на этом сочетании стоит задержаться. Оно объясняет, почему ты берёшься за крупное, а застреваешь на мелочах, и почему отдых у тебя выглядит странно для окружающих. Обычно люди с такой парой светил приходят к одному и тому же решению, и оно связано с тем,",
];

const FAQ: FaqItem[] = [
  {
    q: "Почему по дате видно только знак Солнца",
    a: "Потому что остальные позиции меняются быстрее суток. Луна проходит знак за два с половиной дня, асцендент — за два часа. Без времени рождения их посчитать невозможно, и сервисы, которые обещают полную карту по одной дате, показывают не карту, а гороскоп по знаку.",
  },
  {
    q: "Я не знаю точное время рождения",
    a: "Его часто можно найти в выписке из роддома или уточнить у родных. Если время известно приблизительно, карта всё равно считается — просто позиции асцендента и домов будут указаны с оговоркой.",
  },
  {
    q: "Зачем нужно место рождения",
    a: "Положение планет на небе зависит от точки наблюдения. Для одного и того же момента карта в Москве и во Владивостоке будет разной — прежде всего в части домов и асцендента.",
  },
  {
    q: "Откуда берутся положения планет",
    a: "Из астрономических эфемерид — таблиц, по которым рассчитывают движение небесных тел. Это те же данные, которыми пользуются обсерватории, и они не зависят от того, верите вы в астрологию или нет.",
  },
  {
    q: "Мой знак на границе с соседним",
    a: "Солнце входит в знак в конкретный момент, и в разные годы это разные сутки. Если ваша дата попадает на стык, точный ответ даст только расчёт по времени рождения — мы честно об этом предупредим.",
  },
];

const FULL_CHART_ITEMS = [
  "Луна",
  "Асцендент",
  "Меркурий",
  "Венера",
  "Марс",
  "Юпитер",
  "Сатурн",
  "Двенадцать домов",
  "Аспекты между позициями",
];

function NatalCalculator({ stage, submit }: CalculatorApi<NatalResult>) {
  return (
    <DateCalculator
      idPrefix="natal"
      stage={stage}
      onSubmit={(date) => submit({ ...sunSign(date.day, date.month), date })}
    />
  );
}

/** Орбиты + название знака вместо цифры. */
function NatalStage({ result, fast, reduced }: ResultCtx<NatalResult>) {
  return (
    <div className="relative mx-auto aspect-square w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(122, 93, 168, 0.22) 0%, rgba(122, 93, 168, 0) 55%)",
        }}
      />

      <Orbits speedFactor={fast ? 4 : 1} dim still={reduced} />

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display text-text-accent"
          aria-hidden="true"
          style={{
            fontSize: "clamp(44px, 4.6vw, 96px)",
            lineHeight: 1,
            animation: reduced ? "none" : "qc-result-in 800ms ease-out both",
          }}
        >
          {result.sign.name}
        </span>
      </div>
    </div>
  );
}

function NatalResultContent({ result }: ResultCtx<NatalResult>) {
  const text = result.sign.detail;
  return (
    <>
      <h2
        className="font-display text-text-primary"
        style={{ marginTop: 8, fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
      >
        {result.sign.name}
      </h2>

      <p
        className="text-text-primary"
        style={{ marginTop: 20, fontSize: "clamp(16px, 1.25vw, 21px)", lineHeight: 1.7 }}
      >
        {text}
      </p>

      {result.onCusp ? (
        <p className="text-text-secondary" style={{ marginTop: 10, fontSize: 13 }}>
          Дата на границе знаков. Солнце входит в знак в конкретный момент, и в разные годы это
          разные сутки — точный ответ даст расчёт по времени рождения
        </p>
      ) : null}

      <p
        className="text-text-secondary"
        style={{ marginTop: 20, fontSize: "clamp(14px, 1.05vw, 16px)" }}
      >
        Это одна позиция из сорока. Для остальных понадобятся время и место рождения
      </p>

      <FullReadingButton
        pending={{
          date: toIsoDate(result.date.day, result.date.month, result.date.year),
          direction: "natal",
        }}
      />
    </>
  );
}

/** Короткие подписи знаков по кругу, начиная с Овна сверху, по часовой. */
const SIGN_LABELS = ["Овен", "Телец", "Близ", "Рак", "Лев", "Дева", "Весы", "Скорп", "Стрел", "Козер", "Водол", "Рыбы"];
const SIGN_KEYS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const SIGN_GLYPHS = [
  "\u2648\uFE0E", "\u2649\uFE0E", "\u264A\uFE0E", "\u264B\uFE0E",
  "\u264C\uFE0E", "\u264D\uFE0E", "\u264E\uFE0E", "\u264F\uFE0E",
  "\u2650\uFE0E", "\u2651\uFE0E", "\u2652\uFE0E", "\u2653\uFE0E",
];

/** Фиксированные погашенные позиции: [сектор, радиус в % от стороны области]. */
const DIM_DOTS: [number, number][] = [
  [1, 30], [2, 36], [3, 28], [5, 32], [6, 29], [7, 37], [8, 34], [10, 28], [11, 36],
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Колесо натальной карты с одной горящей позицией — Солнцем. */
function NatalWheel({ signKey }: { signKey: string }) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      const vbWidth = 124; // viewBox -12..112
      setScale(rect.width / vbWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const S = 100; // viewBox 100x100, 1 единица = 1% стороны
  const cx = S / 2;
  const cy = S / 2;
  const activeIdx = Math.max(0, SIGN_KEYS.indexOf(signKey));

  // Угол от вертикали по часовой, в радианах
  const point = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
  };

  // Кольцевой сектор активного знака между радиусами 26 и 42
  const a0 = activeIdx * 30 - 15;
  const a1 = activeIdx * 30 + 15;
  const [ox0, oy0] = point(a0, 42);
  const [ox1, oy1] = point(a1, 42);
  const [ix0, iy0] = point(a0, 26);
  const [ix1, iy1] = point(a1, 26);
  const sectorPath = `M ${ox0} ${oy0} A 42 42 0 0 1 ${ox1} ${oy1} L ${ix1} ${iy1} A 26 26 0 0 0 ${ix0} ${iy0} Z`;

  const mid = activeIdx * 30;
  const [sunX, sunY] = point(mid, 33);
  const [lblX, lblY] = point(mid, 26.5); // подпись «Солнце» смещена к центру от точки

  const symbolPx = "clamp(18px, 1.6vw, 26px)";
  const labelPx = "clamp(11px, 1vw, 15px)";

  return (
    <svg
      ref={svgRef}
      viewBox={`-12 -12 ${S + 24} ${S + 24}`}
      role="img"
      aria-label="Колесо натальной карты: рассчитана одна позиция из десяти"
      className="h-auto w-full overflow-visible"
      style={{
        ["--symbol-size" as string]: symbolPx,
        ["--label-size" as string]: labelPx,
        ["--scale" as string]: String(scale),
        ["--symbol-uu" as string]: `calc(${symbolPx} / ${scale})`,
        ["--label-uu" as string]: `calc(${labelPx} / ${scale})`,
      }}
    >
      {/* активный сектор — кольцевой, под спицами и окружностями */}
      <path d={sectorPath} fill="rgba(122, 93, 168, 0.14)" />

      {/* окружности: внутренняя, внешняя и дополнительная (двойное кольцо) */}
      <circle cx={cx} cy={cy} r={26} fill="none" stroke="var(--border)" strokeWidth={0.25} strokeOpacity={0.5} />
      <circle cx={cx} cy={cy} r={40} fill="none" stroke="var(--border)" strokeWidth={0.25} />
      <circle cx={cx} cy={cy} r={42} fill="none" stroke="var(--border)" strokeWidth={0.25} strokeOpacity={0.4} />

      {/* спицы */}
      {SIGN_LABELS.map((_, i) => {
        const [sx1, sy1] = point(i * 30 + 15, 26);
        const [sx2, sy2] = point(i * 30 + 15, 42);
        return (
          <line
            key={i}
            x1={sx1}
            y1={sy1}
            x2={sx2}
            y2={sy2}
            stroke="var(--border)"
            strokeWidth={0.25}
            strokeOpacity={0.45}
          />
        );
      })}

      {/* символы знаков на радиусе 40, подписи — на радиусе 47, горизонтально */}
      {SIGN_LABELS.map((label, i) => {
        const angle = i * 30;
        const [sx, sy] = point(angle, 40);
        const [lx, ly] = point(angle, 47);
        const active = i === activeIdx;
        const fill = active ? "var(--text-accent)" : "var(--text-secondary)";
        const opacity = active ? 1 : 0.6;
        return (
          <g key={label}>
            <text
              x={sx}
              y={sy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={fill}
              fillOpacity={opacity}
              fontFamily="'Noto Sans Symbols 2', sans-serif"
              style={{
                fontSize: active
                  ? "calc(var(--symbol-uu) + calc(4px / var(--scale)))"
                  : "var(--symbol-uu)",
                fontVariantEmoji: "text",
                lineHeight: 1,
                transition: reduced ? "none" : "fill 600ms ease-out, fill-opacity 600ms ease-out",
              }}
            >
              {SIGN_GLYPHS[i]}
            </text>
            <text
              className="natal-sign-name"
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={fill}
              fillOpacity={opacity}
              fontFamily="var(--font-sans)"
              style={{
                fontSize: active
                  ? "calc(var(--label-uu) + calc(3px / var(--scale)))"
                  : "var(--label-uu)",
                lineHeight: 1,
                transition: reduced ? "none" : "fill 600ms ease-out, fill-opacity 600ms ease-out",
              }}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* погашенные позиции */}
      {DIM_DOTS.map(([sector, r], i) => {
        const [dx, dy] = point(sector * 30, r);
        return (
          <circle key={i} cx={dx} cy={dy} r={0.9} fill="var(--border)" fillOpacity={0.35} />
        );
      })}

      {/* Солнце */}
      <g
        style={{
          transform: `translate(${sunX - cx}px, ${sunY - cy}px)`,
          transition: reduced ? "none" : "transform 600ms ease-out",
        }}
      >
        <g transform={`translate(${cx}, ${cy})`}>
          <circle
            r={1.8}
            fill="var(--text-accent)"
            style={{ filter: "drop-shadow(0 0 4.4px rgba(122, 93, 168, 0.5))" }}
          />
        </g>
      </g>
      <g
        style={{
          transform: `translate(${lblX - cx}px, ${lblY - cy}px)`,
          transition: reduced ? "none" : "transform 600ms ease-out",
        }}
        aria-hidden="true"
      >
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary)"
          fontSize={2.4}
          fontFamily="var(--font-sans)"
        >
          Солнце
        </text>
      </g>
    </svg>
  );
}

/** Блок «как считается»: колесо с одной позицией + список. */
function DataVsTimeBlock({ ctx }: { ctx: ResultCtx<NatalResult> | null }) {
  const signKey = ctx?.result.sign.key ?? "leo";
  return (
    <section
      className="relative w-full"
      style={{
        paddingTop: "clamp(64px, 8vh, 120px)",
        paddingBottom: "clamp(64px, 8vh, 120px)",
      }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2
          className="font-display text-text-primary"
          style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
        >
          Что даёт дата и что даёт время
        </h2>
        <p
          className="text-text-secondary"
          style={{ marginTop: 14, fontSize: "clamp(15px, 1.15vw, 19px)", lineHeight: 1.6 }}
        >
          Половина карты зависит от часа и места рождения. Это не ограничение сервиса, а свойство
          расчёта
        </p>

        <div
          className="mt-10 grid grid-cols-1 items-center md:grid-cols-[52fr_44fr]"
          style={{ columnGap: "4%", rowGap: "clamp(40px, 5vw, 90px)" }}
        >
          <div
            className="natal-wheel-area mx-auto aspect-square w-full"
            style={{ width: "min(46vw, 70vh)", minWidth: 380 }}
          >
            <NatalWheel signKey={signKey} />
          </div>

          <div className="w-full" style={{ maxWidth: 480 }}>
            <div className="flex flex-col" style={{ gap: 14 }}>
              <div className="flex items-center">
                <span
                  aria-hidden="true"
                  className="shrink-0 rounded-full bg-text-accent"
                  style={{
                    width: 10,
                    height: 10,
                    marginRight: 14,
                    boxShadow: "0 0 10px rgba(122, 93, 168, 0.5)",
                  }}
                />
                <span
                  className="text-text-primary"
                  style={{ fontSize: "clamp(15px, 1.2vw, 18px)", lineHeight: 1.4 }}
                >
                  Солнце
                </span>
                <span className="ml-auto text-text-accent" style={{ fontSize: 12 }}>
                  есть
                </span>
              </div>
              {FULL_CHART_ITEMS.map((item) => (
                <div key={item} className="flex items-center">
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded-full border border-border"
                    style={{ width: 10, height: 10, marginRight: 14 }}
                  />
                  <span
                    className="text-text-secondary"
                    style={{ fontSize: "clamp(15px, 1.2vw, 18px)", lineHeight: 1.4, opacity: 0.5 }}
                  >
                    {item}
                  </span>
                  <span
                    className="ml-auto text-text-secondary"
                    style={{ fontSize: 12, opacity: 0.5 }}
                  >
                    нужно время
                  </span>
                </div>
              ))}
            </div>
            <p
              className="text-text-secondary"
              style={{ marginTop: 28, fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}
            >
              Девять позиций из десяти появятся, когда добавишь время и место рождения
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function NatalPage() {
  return (
    <DirectionPage<NatalResult>
      id="natal"
      h1="Натальная карта онлайн"
      heroDescription="Знак Солнца — бесплатно по дате. Полная карта — по дате, времени и месту"
      heroImage={natalAsset}
      heroImageAlt="Натальная карта — расчёт по дате рождения"
      aboutTitle="Что показывает натальная карта"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Твой знак Солнца"
      linesTitle="Что входит в разбор"
      linesSubtitle="Знак Солнца — одна позиция. В полной карте их больше сорока"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Солнце во Льве, Луна в Деве"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полная карта — больше сорока позиций и связи между ними"
      faqTitle="Вопросы о натальной карте"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Натальная карта работает с реальным небом. Остальные пять считаются иначе и складываются с ней в один профиль"
      finalTitle="Узнай свой знак Солнца"
      finalSubtitle="Бесплатно, по одной дате рождения"
      calculator={(api) => <NatalCalculator {...api} />}
      resultVisual={(ctx) => <NatalStage {...ctx} />}
      resultContent={(ctx) => <NatalResultContent {...ctx} />}
      explainBlock={(ctx) => <DataVsTimeBlock ctx={ctx} />}
    />
  );
}
