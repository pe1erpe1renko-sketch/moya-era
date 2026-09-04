"use client";

import { OrbitStage } from "@/components/quick-calc/Orbits";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { toIsoDate } from "@/lib/pendingBirth";
import {
  DirectionPage,
  type CalculatorApi,
  type ResultCtx,
} from "@/components/direction/DirectionPage";
import { DateCalculator } from "@/components/direction/DateCalculator";
import { useState } from "react";
import {
  isCountableName,
  lifePath,
  lifePathNumber,
  pythagoras,
  squareLabels,
  type PythagorasResult,
} from "@/lib/numerology";
import { buildNameQuery } from "@/lib/chartUrl";
import { MONTHS } from "@/lib/arcana";
const numerologyAsset = "/images/numerology.png";
import { NUMEROLOGY_LINES } from "@/lib/directionLines";


type NumerologyResult = {
  path: number;
  square: PythagorasResult;
  date: { day: number; month: number; year: number };
  /** необязательное имя: с ним считается ещё и число судьбы */
  name: string | null;
};

const ABOUT_PARAGRAPHS = [
  "Нумерология работает с датой рождения как с числовой записью. Цифры складываются по одним и тем же правилам, и из них получаются два разных инструмента.",
  "Число жизненного пути — одна цифра, которая описывает основной способ действовать: с чего человек начинает, к чему возвращается, что даётся легче остального.",
  "Квадрат Пифагора устроен иначе. В нём считается, сколько раз каждая цифра от 1 до 9 встречается в дате и производных числах. Пустая ячейка и ячейка с четырьмя повторами говорят о разном.",
  "Никакой интерпретации на этом шаге нет — только сложение. Одна и та же дата всегда даёт один и тот же результат.",
];

const LINES = NUMEROLOGY_LINES;

const SAMPLE_PARAGRAPHS = [
  "Седьмое число пути ставит человека в положение наблюдателя раньше, чем участника. Ты сначала разбираешься, как устроено, и только потом входишь — и это не осторожность, а способ, которым ты вообще способен действовать. Попытки заставить себя «просто начать» обычно заканчиваются откатом.",
  "В квадрате при этом важна не сама семёрка, а её плотность. Две семёрки в твоей дате означают, что интерес к устройству вещей достаточно силён, чтобы быть профессией, но не настолько, чтобы вытеснять всё остальное.",
  "Отдельного внимания заслуживает пустая ячейка на пятёрке. Отсутствующая цифра не означает нехватки — она означает, что это качество не встроено по умолчанию и набирается опытом. В твоём случае это касается того,",
];

const FAQ = [
  {
    q: "Чем число пути отличается от числа судьбы",
    a: "Число пути считается из полной даты рождения и описывает способ действовать — оно не меняется всю жизнь. Число судьбы считается по полному имени: каждой букве соответствует цифра. Поэтому имя в форме необязательно: без него посчитается всё, кроме числа судьбы. И если имя меняется, меняется и это число — в отличие от всех остальных.",
  },
  {
    q: "Какая таблица букв используется",
    a: "Пифагорейская: буква получает номер своей позиции в алфавите, свёрнутый до одной цифры. Для латиницы это классическое A=1, B=2 и так далее до Z=8; для кириллицы то же правило по русскому алфавиту. Букву Ё приводим к Е, чтобы «Фёдор» и «Федор» давали одно число: это одно имя, как бы его ни написали. Халдейскую таблицу не используем — смешивать две школы в одном разборе нельзя.",
  },
  {
    q: "Почему 11 и 22 не сворачиваются",
    a: "Это мастер-числа. В классической нумерологии считается, что они несут собственное значение, которое теряется при свёртке до 2 и 4. Мы следуем этому правилу.",
  },
  {
    q: "Что означает пустая ячейка в квадрате",
    a: "Не недостаток, а отсутствие врождённой опоры: качество не даётся по умолчанию и набирается опытом. Пустых ячеек у всех несколько — квадрат без пробелов не встречается.",
  },
  {
    q: "Влияет ли смена имени или фамилии",
    a: "На расчёт по дате — нет. Дата рождения не меняется, поэтому и число пути, и квадрат остаются прежними всю жизнь.",
  },
  {
    q: "Нумерология предсказывает события",
    a: "Нет. Она описывает способ действовать и плотность качеств. Личный год говорит о фазе цикла, а не о том, что в этой фазе произойдёт.",
  },
];

const DEMO_DATE = { day: 26, month: 7, year: 1990 };

/** Порядок ячеек по столбцам: 1-4-7, 2-5-8, 3-6-9. */
const CELL_ORDER = [1, 4, 7, 2, 5, 8, 3, 6, 9];

function formatDate(d: { day: number; month: number; year: number }) {
  return `${d.day} ${MONTHS[d.month - 1]?.toLowerCase() ?? ""} ${d.year}`;
}

/**
 * Дата обязательна, имя — нет. Имя нужно только числу судьбы: оно
 * считается по буквам, а не по цифрам, и без имени его просто не бывает.
 */
function NumerologyCalculator({ stage, submit }: CalculatorApi<NumerologyResult>) {
  const [name, setName] = useState("");

  return (
    <>
      <DateCalculator
        idPrefix="num"
        stage={stage}
        onSubmit={(date) =>
          submit({
            path: lifePathNumber(date.day, date.month, date.year),
            square: pythagoras(date.day, date.month, date.year),
            date,
            name: isCountableName(name) ? name.trim() : null,
          })
        }
      />

      <div style={{ marginTop: 16 }}>
        <label className="sr-only" htmlFor="num-name">
          Полное имя
        </label>
        <input
          id="num-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Полное имя, если хотите число судьбы"
          className="qc-focus w-full text-[17px] text-text-primary transition-colors placeholder:text-text-secondary focus:border-text-accent"
          style={{
            height: 56,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            paddingInline: 16,
          }}
        />
        <p className="text-text-secondary" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
          Полное имя — для числа судьбы. Без него посчитаем всё, что считается по дате
        </p>
      </div>
    </>
  );
}

function NumerologyResultContent({ result }: ResultCtx<NumerologyResult>) {
  const card = lifePath.find((x) => x.n === result.path);
  return (
    <>
      <h2
        className="font-display text-text-primary"
        style={{ marginTop: 8, fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
      >
        {card?.n} · {card?.title}
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
          direction: "numerology",
        }}
        query={buildNameQuery(result.name)}
      />
    </>
  );
}

function workingFormulas(
  date: { day: number; month: number; year: number },
  square: PythagorasResult
) {
  const pad = (n: number, len: number) => String(n).padStart(len, "0");
  const dayStr = pad(date.day, 2);
  const monthStr = pad(date.month, 2);
  const yearStr = pad(date.year, 4);
  const dateDigits = [...dayStr, ...monthStr, ...yearStr].map(Number);

  const firstFormula = `${dateDigits.join("+")} = ${square.first}`;
  const secondFormula = `${String(square.first).split("").join("+")} = ${square.second}`;
  const firstDayDigit = Number(String(date.day)[0]);
  const thirdFormula = `${square.first} − 2×${firstDayDigit} = ${square.third}`;
  const fourthFormula = `${String(Math.abs(square.third))
    .split("")
    .join("+")} = ${square.fourth}`;

  return [
    { formula: firstFormula, text: "первое — сумма всех цифр даты" },
    { formula: secondFormula, text: "второе — сумма цифр первого" },
    { formula: thirdFormula, text: "третье — первое минус удвоенная первая цифра дня" },
    { formula: fourthFormula, text: "четвёртое — сумма цифр третьего" },
  ];
}

function SquareBlock({ ctx }: { ctx: ResultCtx<NumerologyResult> | null }) {
  const date = ctx?.result.date ?? DEMO_DATE;
  const square = ctx?.result.square ?? pythagoras(DEMO_DATE.day, DEMO_DATE.month, DEMO_DATE.year);
  const formulas = workingFormulas(date, square);

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
          {ctx ? "Твой квадрат Пифагора" : "Квадрат Пифагора"}
        </h2>
        <p
          className="text-text-secondary"
          style={{ marginTop: 14, fontSize: "clamp(15px, 1.15vw, 19px)", lineHeight: 1.6 }}
        >
          Девять ячеек и плотность каждой цифры. Пустая ячейка говорит не меньше, чем заполненная
        </p>

        <div
          className="grid grid-cols-1 items-start md:grid-cols-[auto_1fr]"
          style={{ marginTop: 40, gap: "clamp(40px, 5vw, 90px)" }}
        >
          <div className="grid grid-cols-3" style={{ gap: "clamp(10px, 1.2vw, 18px)" }}>
            {CELL_ORDER.map((n) => {
              const count = square.counts[n] ?? 0;
              return (
                <div key={n} className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center rounded-[12px] border border-border bg-surface-1"
                    style={{
                      width: "clamp(72px, 7vw, 110px)",
                      height: "clamp(72px, 7vw, 110px)",
                    }}
                  >
                    {count > 0 ? (
                      <span
                        className="font-mono text-text-primary"
                        style={{ fontSize: "clamp(18px, 1.6vw, 26px)" }}
                      >
                        {String(n).repeat(count)}
                      </span>
                    ) : (
                      <span
                        className="font-mono text-text-secondary"
                        style={{ fontSize: "clamp(18px, 1.6vw, 26px)", opacity: 0.4 }}
                      >
                        —
                      </span>
                    )}
                  </div>
                  <span className="text-text-secondary" style={{ marginTop: 8, fontSize: 11 }}>
                    {squareLabels[n - 1]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="max-w-[560px]">
            <div
              className="text-text-primary"
              style={{ marginBottom: 20, fontSize: "clamp(15px, 1.2vw, 18px)" }}
            >
              {formatDate(date)}
            </div>

            <div className="flex flex-col" style={{ gap: 28 }}>
              <div>
                <div
                  className="text-text-secondary"
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Рабочие числа
                </div>
                <div className="flex flex-col" style={{ gap: 14 }}>
                  {formulas.map((f) => (
                    <div
                      key={f.text}
                      className="flex flex-wrap items-baseline"
                      style={{ gap: "10px 18px" }}
                    >
                      <span
                        className="font-mono text-text-accent"
                        style={{ fontSize: "clamp(13px, 1.05vw, 16px)" }}
                      >
                        {f.formula}
                      </span>
                      <span
                        className="text-text-secondary"
                        style={{ fontSize: "clamp(13px, 1vw, 15px)" }}
                      >
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div
                  className="text-text-secondary"
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Что попадает в квадрат
                </div>
                <p
                  className="text-text-secondary"
                  style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}
                >
                  В ячейки складываются все цифры даты и все цифры четырёх рабочих чисел. Нули не
                  учитываются — нулевой ячейки в квадрате нет.
                </p>
              </div>

              <div>
                <div
                  className="text-text-secondary"
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Как читать
                </div>
                <div className="flex flex-col" style={{ gap: 12 }}>
                  {[
                    { mark: "1", text: "качество есть и работает" },
                    { mark: "333", text: "выражено сильно, иногда с избытком" },
                    { mark: "—", text: "не встроено по умолчанию: набирается опытом, а не даётся от рождения" },
                  ].map((row) => (
                    <div
                      key={row.text}
                      className="grid items-start"
                      style={{ gridTemplateColumns: "56px 1fr", gap: 12 }}
                    >
                      <span
                        className="font-mono text-text-accent"
                        style={{ fontSize: "clamp(14px, 1.1vw, 17px)" }}
                      >
                        {row.mark}
                      </span>
                      <span
                        className="text-text-secondary"
                        style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.5 }}
                      >
                        {row.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function NumerologyPage() {
  return (
    <DirectionPage<NumerologyResult>
      id="numerology"
      h1="Нумерология по дате рождения"
      heroDescription="Число жизненного пути и квадрат Пифагора. Бесплатно, без регистрации"
      heroImage={numerologyAsset}
      heroImageAlt="Нумерология — расчёт по дате рождения"
      aboutTitle="Что показывает нумерология"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Твоё число пути"
      linesTitle="Что входит в разбор"
      linesSubtitle="Число пути — только начало. В полном разборе считаются шесть позиций"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Дата 26 июля 1990, число пути 7"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный разбор — шесть позиций и связь с остальными системами"
      faqTitle="Вопросы о нумерологии"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Нумерология работает с цифрами даты. Остальные пять смотрят с других сторон и складываются с ней в один профиль"
      finalTitle="Посчитай свои числа"
      finalSubtitle="Число пути и квадрат Пифагора бесплатно"
      calculator={(api) => <NumerologyCalculator {...api} />}
      resultVisual={({ result, fast, reduced }) => (
        <OrbitStage value={result.path} speedFactor={fast ? 4 : 1} still={reduced} />
      )}
      resultContent={(ctx) => <NumerologyResultContent {...ctx} />}
      explainBlock={(ctx) => <SquareBlock ctx={ctx} />}
    />
  );
}
