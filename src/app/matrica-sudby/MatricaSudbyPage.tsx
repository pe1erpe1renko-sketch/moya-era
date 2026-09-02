"use client";

import { useMemo, useState } from "react";
import { ExampleScheme } from "@/components/landing/ExampleScheme";
import { OrbitStage } from "@/components/quick-calc/Orbits";
import {
  DirectionPage,
  type CalculatorApi,
  type ResultCtx,
} from "@/components/direction/DirectionPage";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { toIsoDate } from "@/lib/pendingBirth";
import { arcana, MONTHS, digitSum, reduceTo22, isValidDate } from "@/lib/arcana";
const matrixAsset = "/images/matrix.png";
import { MATRIX_LINES } from "@/lib/directionLines";


const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const selectClass =
  "qc-focus h-14 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 pr-10 text-[17px] text-text-primary transition-colors focus:border-text-accent";

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

export type MatrixNumbers = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
};

type MatrixResult = {
  numbers: MatrixNumbers;
  date: { day: number; month: number; year: number };
};

const LINES = MATRIX_LINES;

const ABOUT_PARAGRAPHS = [
  "Матрица судьбы раскладывает дату рождения на 22 позиции — по числу старших арканов. Каждая позиция отвечает за свою область: характер, отношения, деньги, здоровье, связь с родом.",
  "Центральный аркан стоит в середине этой схемы. Через него проходят все остальные линии, поэтому с него и начинают: он описывает, к чему человек возвращается снова и снова, что даётся ему легче всего и что становится главным уроком.",
  "Матрица не говорит, что случится. Она описывает устройство: какие качества заложены сильнее, какие слабее, где твоя опора, а где место, которое стоит замечать.",
  "Расчёт целиком арифметический. Одна и та же дата всегда даёт одну и ту же матрицу — это не интерпретация, а сложение.",
];

const SAMPLE_PARAGRAPHS = [
  "Центральный аркан 5 ставит тебя в положение человека, которому нужна не подсказка, а устройство. Ты плохо переносишь ответы без объяснения: даже верный совет, поданный как готовый вывод, вызывает сопротивление. Зато любая система, в которой видно, как одно следует из другого, схватывается быстро и надолго.",
  "В отношениях это проявляется мягче, чем можно ожидать. Тебе важно не согласие, а понятность: почему человек поступает так, откуда у него это взялось, по каким правилам он живёт. Партнёр, который не может объяснить себя, утомляет сильнее, чем партнёр, который открыто не согласен.",
  "В работе пятый аркан почти всегда выводит к роли объясняющего. Это не обязательно преподавание — чаще это позиция человека, к которому приходят разобраться. Со временем возникает побочный эффект, о котором редко предупреждают: чем лучше ты объясняешь чужие системы, тем",
];

const FAQ = [
  {
    q: "Что такое матрица судьбы и откуда она взялась",
    a: "Метод появился в конце XX века и соединяет два старых языка: 22 старших аркана Таро и числовую свёртку из нумерологии. Дата рождения раскладывается по схеме из восьмиконечной звезды, и каждая позиция получает своё число от 1 до 22.",
  },
  {
    q: "Чем матрица отличается от натальной карты",
    a: "Матрица считается только из даты и описывает устройство характера и повторяющиеся сценарии. Натальная карта считается из даты, времени и места, использует реальные положения планет и говорит больше о ритме и обстоятельствах. Они не спорят между собой, а смотрят с разных сторон.",
  },
  {
    q: "Нужно ли время рождения",
    a: "Нет. Для матрицы достаточно даты. Время и место понадобятся, если захочешь посмотреть натальную карту или Дизайн человека.",
  },
  {
    q: "Почему у меня и у знакомого одинаковый центральный аркан",
    a: "Центральный аркан — одно число из двадцати двух, поэтому совпадения встречаются часто. Различает людей не он один, а вся схема целиком: шесть линий и связи между ними у двух человек с одинаковым центром будут разными.",
  },
  {
    q: "Матрица предсказывает события",
    a: "Нет. Она описывает качества, склонности и повторяющиеся сценарии. Что с этим делать — остаётся за тобой, и именно поэтому в сервисе есть дневник наблюдений.",
  },
];

function MatrixCalculator({ stage, submit }: CalculatorApi<MatrixResult>) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const complete = day !== "" && month !== "" && year !== "";
  const dateInvalid = complete && !isValidDate(Number(day), Number(month), Number(year));

  const handleSubmit = () => {
    if (!complete || dateInvalid) return;
    const a = reduceTo22(Number(day));
    const b = Number(month);
    const c = reduceTo22(digitSum(Number(year)));
    const d = reduceTo22(a + b + c);
    const e = reduceTo22(a + b + c + d);
    submit({
      numbers: { a, b, c, d, e },
      date: { day: Number(day), month: Number(month), year: Number(year) },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row" style={{ marginTop: 32 }}>
        <div className="relative flex-1">
          <label className="sr-only" htmlFor="ms-day">
            День
          </label>
          <select
            id="ms-day"
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
          <label className="sr-only" htmlFor="ms-month">
            Месяц
          </label>
          <select
            id="ms-month"
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
          <label className="sr-only" htmlFor="ms-year">
            Год
          </label>
          <select
            id="ms-year"
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
        className="qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed"
        style={{
          marginTop: 20,
          height: 54,
          paddingInline: 40,
          opacity: !complete || dateInvalid || stage === "loading" ? 0.4 : 1,
        }}
      >
        {stage === "loading" ? "Считаем" : stage === "result" ? "Пересчитать" : "Рассчитать"}
      </button>
    </>
  );
}

function MatrixResultContent({ result }: ResultCtx<MatrixResult>) {
  const card = arcana.find((x) => x.n === result.numbers.e);
  return (
    <>
      <h2
        className="font-display text-text-primary"
        style={{ marginTop: 8, fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
      >
        {card?.n} · {card?.name}
      </h2>

      <div className="relative overflow-hidden" style={{ marginTop: 20, height: 240 }}>
        <p
          className="text-text-primary"
          style={{ fontSize: "clamp(16px, 1.25vw, 21px)", lineHeight: 1.7 }}
        >
          {card?.detail}
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: 120,
            background: "linear-gradient(to bottom, rgba(0,0,0,0), #000000)",
          }}
        />
      </div>

      <p
        className="text-text-secondary"
        style={{ marginTop: 4, fontSize: "clamp(15px, 1.15vw, 18px)" }}
      >
        Дальше — в полном разборе
      </p>

      <FullReadingButton
        pending={{
          date: toIsoDate(result.date.day, result.date.month, result.date.year),
          direction: "matrix",
        }}
      />
    </>
  );
}

export default function MatricaSudbyPage() {
  return (
    <DirectionPage<MatrixResult>
      id="matrix"
      h1={
        <>
          РАССЧИТАТЬ <span className="whitespace-nowrap">МАТРИЦУ СУДЬБЫ</span>{" "}
          <span className="whitespace-nowrap">по дате рождения</span>
        </>
      }
      heroDescription="Бесплатно и без регистрации. Покажем центральный аркан и четыре числа, из которых он собирается"
      heroImage={matrixAsset}
      heroImageAlt="Матрица судьбы — расчёт по дате рождения"
      aboutTitle="Что показывает матрица судьбы"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Твой центральный аркан"
      linesTitle="Что входит в разбор"
      linesSubtitle="22 позиции матрицы разложены по шести линиям"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Дата 26 июля 1990, центральный аркан 5"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный разбор — около 20 страниц по шести линиям"
      faqTitle="Вопросы о матрице"
      faq={FAQ}
      finalTitle="Посчитай свою матрицу"
      finalSubtitle="Центральный аркан бесплатно, прямо сейчас"
      calculator={(api) => <MatrixCalculator {...api} />}
      resultVisual={({ result, fast, reduced }) => (
        <OrbitStage value={result.numbers.e} speedFactor={fast ? 4 : 1} still={reduced} />
      )}
      resultContent={(ctx) => <MatrixResultContent {...ctx} />}
      explainBlock={(ctx) => (
        <ExampleScheme
          date={ctx?.result.date}
          showButton={false}
          title={ctx ? "Откуда взялось твоё число" : "Каждое число можно проверить"}
          subtitle={
            ctx
              ? "Твоя дата, разложенная по шагам. Наведи на любое число, чтобы увидеть, из чего оно посчитано"
              : "Матрица — это арифметика. Наведи на любое число, чтобы увидеть, из чего оно посчитано"
          }
        />
      )}
    />
  );
}
