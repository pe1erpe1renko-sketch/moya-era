"use client";

import { useState } from "react";
import { OrbitStage } from "@/components/quick-calc/Orbits";
import {
  DirectionPage,
  type CalculatorApi,
  type ResultCtx,
} from "@/components/direction/DirectionPage";
import { DateSelects, type DateParts } from "@/components/direction/DateCalculator";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { toIsoDate } from "@/lib/pendingBirth";
import { arcana, centralArcanum, reduceTo22, isValidDate } from "@/lib/arcana";
const synastryAsset = "/images/synastry2.png";
import { SYNASTRY_LINES } from "@/lib/directionLines";


type SynastryResult = {
  yourDate: { day: number; month: number; year: number };
  you: number;
  partner: number;
  sum: number;
  pair: number;
};

const ABOUT_PARAGRAPHS = [
  "Совместимость по матрице считается не процентом, а третьим арканом. У каждого из двоих есть свой центральный аркан, а у пары появляется собственный: он складывается из обоих и описывает не людей, а то, что между ними происходит.",
  "Это важное отличие. Аркан пары не оценивает, подходите вы друг другу или нет. Он называет задачу, которая возникает именно в этом сочетании и не возникла бы ни с кем другим.",
  "Поэтому пар с плохой совместимостью в этом методе не бывает. Бывают пары, где задача лёгкая, и пары, где она требует работы — и вторые нередко оказываются прочнее.",
  "Расчёт арифметический, и порядок не важен: если поменять вас местами, аркан пары получится тот же.",
];

const LINES = SYNASTRY_LINES;

const SAMPLE_PARAGRAPHS = [
  "Пятнадцатый аркан пары почти всегда означает высокую взаимную притягательность и высокую же вовлечённость. Между вами много энергии, и это не метафора: рядом друг с другом вы оба заметно активнее, чем поодиночке. Такие пары редко бывают вялыми.",
  "Задача, которая появляется именно в этом сочетании, — научиться отличать желание быть вместе от привычки быть вместе. Пятнадцатый аркан хорошо удерживает и плохо отпускает, поэтому связь может продолжаться дольше, чем в ней осталось смысла.",
  "Отдельно стоит посмотреть на разницу ваших личных арканов. Пятый ищет систему и объяснение, десятый доверяет моменту и меняется вместе с обстоятельствами. В спокойные периоды это дополняет, а в кризисные каждый начинает требовать от другого",
];

const FAQ = [
  {
    q: "Почему нет процента совместимости",
    a: "Потому что процент — это оценка, а оценивать чужие отношения мы не беремся. Аркан пары называет задачу, которая есть именно у вас, а насколько она вам по силам, знаете только вы двое.",
  },
  {
    q: "Имеет ли значение, кого вводить первым",
    a: "Нет. Аркан пары получается сложением, а от перестановки слагаемых сумма не меняется. Проверьте сами — результат будет тот же.",
  },
  {
    q: "Можно ли посчитать не романтическую пару",
    a: "Да. Метод работает для любой пары, где есть регулярное взаимодействие: родитель и ребёнок, деловые партнёры, коллеги. Меняется не расчёт, а то, что вы будете в нём искать.",
  },
  {
    q: "Что если аркан пары кажется неприятным",
    a: "Тяжёлых арканов в этом методе нет — есть арканы, где задача очевиднее. Пятнадцатый или шестнадцатый в паре чаще означают силу связи, а не угрозу ей.",
  },
  {
    q: "Нужно ли время рождения обоих",
    a: "Для аркана пары — нет, хватит двух дат. Время понадобится, если захотите сравнить натальные карты: это уже другой расчёт.",
  },
];

const EMPTY: DateParts = { day: "", month: "", year: "" };

const blockLabel = "text-text-secondary uppercase";
const blockLabelStyle = { fontSize: 13, letterSpacing: "0.08em" } as const;

function filled(d: DateParts) {
  return (
    d.day !== "" &&
    d.month !== "" &&
    d.year !== "" &&
    isValidDate(Number(d.day), Number(d.month), Number(d.year))
  );
}

function SynastryCalculator({ stage, submit }: CalculatorApi<SynastryResult>) {
  const [you, setYou] = useState<DateParts>(EMPTY);
  const [partner, setPartner] = useState<DateParts>(EMPTY);

  const ready = filled(you) && filled(partner);
  const disabled = !ready || stage === "loading";

  const handleSubmit = () => {
    if (disabled) return;
    const a = centralArcanum(Number(you.day), Number(you.month), Number(you.year));
    const b = centralArcanum(
      Number(partner.day),
      Number(partner.month),
      Number(partner.year),
    );
    const sum = a + b;
    submit({
      yourDate: { day: Number(you.day), month: Number(you.month), year: Number(you.year) },
      you: a,
      partner: b,
      sum,
      pair: reduceTo22(sum),
    });
  };

  return (
    <>
      <div style={{ marginTop: 32 }}>
        <p className={blockLabel} style={blockLabelStyle}>
          Ты
        </p>
        <div style={{ marginTop: 10 }}>
          <DateSelects idPrefix="syn-you" value={you} onChange={setYou} gap={10} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <p className={blockLabel} style={blockLabelStyle}>
          Партнёр
        </p>
        <div style={{ marginTop: 10 }}>
          <DateSelects
            idPrefix="syn-partner"
            value={partner}
            onChange={setPartner}
            gap={10}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        className="qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity"
        style={{ marginTop: 24, height: 54, paddingInline: 40, opacity: disabled ? 0.4 : 1 }}
      >
        {stage === "loading" ? "Считаем" : stage === "result" ? "Пересчитать" : "Рассчитать"}
      </button>
    </>
  );
}

function card(n: number) {
  return arcana.find((x) => x.n === n);
}

function SynastryResultContent({ result }: ResultCtx<SynastryResult>) {
  const pair = card(result.pair);
  const you = card(result.you);
  const partner = card(result.partner);
  const text = pair?.pair;

  return (
    <>
      <h2
        className="font-display text-text-primary"
        style={{ marginTop: 8, fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
      >
        {pair?.n} · {pair?.name}
      </h2>

      <p
        className="text-text-secondary"
        style={{ marginTop: 12, fontSize: "clamp(14px, 1.05vw, 17px)" }}
      >
        Ты — {you?.n} · {you?.name} · Партнёр — {partner?.n} · {partner?.name}
      </p>

      <div className="relative overflow-hidden" style={{ marginTop: 20, height: 240 }}>
        <p
          className="text-text-primary"
          style={{ fontSize: "clamp(16px, 1.25vw, 21px)", lineHeight: 1.7 }}
        >
          {text}
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
          date: toIsoDate(result.yourDate.day, result.yourDate.month, result.yourDate.year),
          direction: "synastry",
        }}
      />
    </>
  );
}

function Node({
  value,
  label,
  size,
  accent,
}: {
  value: number;
  label: string;
  size: number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 10 }}>
      <div
        className="flex items-center justify-center rounded-full bg-surface-1"
        style={{
          width: size,
          height: size,
          border: accent ? "1px solid var(--text-accent)" : "1px solid var(--border)",
          boxShadow: accent ? "0 0 24px rgba(122, 93, 168, 0.3)" : undefined,
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: accent ? "clamp(26px, 2.2vw, 36px)" : "clamp(22px, 1.9vw, 30px)",
            color: accent ? "var(--text-accent)" : "var(--text-primary)",
          }}
        >
          {value}
        </span>
      </div>
      <span className="text-text-secondary" style={{ fontSize: 13 }}>
        {label}
      </span>
    </div>
  );
}

function Sign({ children }: { children: string }) {
  return (
    <span
      className="font-mono text-text-secondary"
      style={{ fontSize: "clamp(20px, 1.8vw, 30px)" }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function PairChain({ ctx }: { ctx: ResultCtx<SynastryResult> | null }) {
  const you = ctx ? ctx.result.you : 5;
  const partner = ctx ? ctx.result.partner : 10;
  const sum = ctx ? ctx.result.sum : 15;
  const pair = ctx ? ctx.result.pair : 15;
  const reducedSum = sum !== pair;

  return (
    <section className="relative w-full bg-bg-page py-[clamp(60px,7vw,120px)]">
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2
          className="font-display text-text-primary"
          style={{ fontSize: "clamp(28px, 3vw, 54px)", lineHeight: 1.1 }}
        >
          {ctx ? "Как получился ваш аркан" : "Как считается аркан пары"}
        </h2>
        <p
          className="text-text-secondary"
          style={{ marginTop: 12, fontSize: "clamp(15px, 1.15vw, 19px)" }}
        >
          Два центральных аркана складываются в третий. Порядок не важен
        </p>

        <div
          className="flex flex-col items-center md:flex-row md:items-center"
          style={{ marginTop: 40, gap: "clamp(18px, 2.4vw, 40px)" }}
        >
          <Node value={you} label="ты" size={88} />
          <Sign>+</Sign>
          <Node value={partner} label="партнёр" size={88} />
          <Sign>=</Sign>
          <Node value={pair} label="пара" size={104} accent />
        </div>

        <p
          className="font-mono"
          style={{
            marginTop: 32,
            fontSize: "clamp(14px, 1.1vw, 18px)",
            color: "var(--text-accent)",
          }}
        >
          {reducedSum
            ? `${you} + ${partner} = ${sum} → ${String(sum)
                .split("")
                .join(" + ")} = ${pair}`
            : `${you} + ${partner} = ${pair}`}
        </p>
      </div>
    </section>
  );
}

export default function SovmestimostPage() {
  return (
    <DirectionPage<SynastryResult>
      id="synastry"
      h1={<>Совместимость<br />по дате рождения</>}
      heroTextWidth="min(54%, 760px)"
      heroDescription="Два расчёта и общий аркан пары. Бесплатно, без регистрации"
      heroImage={synastryAsset}
      heroImageAlt="Совместимость по дате рождения — аркан пары"
      aboutTitle="Что показывает совместимость"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Аркан вашей пары"
      linesTitle="Что входит в разбор"
      linesSubtitle="Аркан пары — только начало. В полном разборе шесть линий"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Арканы 5 и 10, аркан пары 15"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный разбор — шесть линий и связь с натальными картами обоих"
      faqTitle="Вопросы о совместимости"
      faq={FAQ}
      finalTitle="Посчитайте свою пару"
      finalSubtitle="Аркан пары бесплатно, прямо сейчас"
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Совместимость смотрит на двоих. Остальные пять описывают тебя одного и складываются с ней в один профиль"
      calculator={(api) => <SynastryCalculator {...api} />}
      resultVisual={({ result, fast, reduced }) => (
        <OrbitStage value={result.pair} speedFactor={fast ? 4 : 1} still={reduced} />
      )}
      resultContent={(ctx) => <SynastryResultContent {...ctx} />}
      explainBlock={(ctx) => <PairChain ctx={ctx} />}
    />
  );
}
