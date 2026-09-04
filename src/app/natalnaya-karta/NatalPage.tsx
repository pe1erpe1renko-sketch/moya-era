"use client";

import { useMemo, useState } from "react";
import {
  DirectionPage,
  type CalculatorApi,
  type FaqItem,
  type ResultCtx,
} from "@/components/direction/DirectionPage";
const natalAsset = "/images/natal.png";
import { buildNatalChart } from "@/lib/natal";
import { NATAL_LINES } from "@/lib/directionLines";
import { BirthForm, type BirthValue } from "@/components/natal/BirthForm";
import {
  NatalHeadline,
  NatalReading,
  NatalVariationNote,
  PreliminaryBadge,
  useNatalVariation,
} from "@/components/natal/NatalReading";
import { NatalWheel } from "@/components/natal/NatalWheel";
import { moscowClock } from "@/lib/geo/dayScan";

const ABOUT_PARAGRAPHS = [
  "Натальная карта — это положение планет в момент рождения, рассчитанное для конкретной точки на Земле. Не символическая схема, а реальное небо: те же астрономические таблицы, по которым работают обсерватории.",
  "По одной дате видно немало: знаки Солнца, Луны и всех планет, аспекты между ними. Это уже настоящая карта, и мы считаем её бесплатно для всех.",
  "Чего по одной дате не бывает — домов и асцендента. Асцендент меняется примерно каждые два часа, поэтому нужны время и место рождения. Никакой сервис этого не обойдёт, и мы не будем делать вид, что обошли.",
  "Поэтому карта строится по тому, что вы знаете: дата — обязательно, время и место — если известны. Что не посчитано, там прямо и написано, что не посчитано.",
];

const LINES = NATAL_LINES;

const SAMPLE_PARAGRAPHS = [
  "Солнце во Льве даёт потребность в отклике — не в аплодисментах, а в подтверждении, что сделанное замечено. Ты плохо переносишь работу в стол и молчание в ответ. Это не тщеславие: без обратной связи у тебя буквально падает мотивация, и никакая дисциплина этого не компенсирует.",
  "Луна в Деве при этом устроена противоположно. Она успокаивается порядком, деталями и предсказуемостью — тем, что Солнцу во Льве кажется мелким и скучным. Внутри тебя постоянно спорят двое: один хочет размаха, другой сначала проверит расчёты.",
  "Именно на этом сочетании стоит задержаться. Оно объясняет, почему ты берёшься за крупное, а застреваешь на мелочах, и почему отдых у тебя выглядит странно для окружающих. Обычно люди с такой парой светил приходят к одному и тому же решению, и оно связано с тем,",
];

const FAQ: FaqItem[] = [
  {
    q: "Что считается без времени рождения",
    a: "Положения всех планет по знакам и аспекты между ними — это уже настоящая карта. Не считаются дома, асцендент и середина неба: они зависят от часа и места. Если в день рождения Луна меняет знак, мы об этом честно напишем, а не выберем наугад.",
  },
  {
    q: "Я не знаю точное время рождения",
    a: "Его часто можно найти в выписке из роддома или уточнить у родных. Карту построим и без него — просто в разделе домов будет сказано, что они не определены, вместо выдуманных цифр.",
  },
  {
    q: "Зачем нужно место рождения",
    a: "По нему определяются координаты и часовой пояс. Пояс важен не меньше координат: в СССР действовало декретное время, а с 1981 по 1991 год ещё и летнее, поэтому час на часах и час по Гринвичу расходились на два-три часа. Мы учитываем историю поясов по годам.",
  },
  {
    q: "Откуда берутся положения планет",
    a: "Из астрономических эфемерид. Расчёт сверен со Swiss Ephemeris — той же библиотекой, на которой считает astro.com, — на двадцати контрольных датах: расхождение не превышает нескольких угловых секунд при том, что один знак зодиака это тридцать градусов.",
  },
  {
    q: "Мой знак на границе с соседним",
    a: "Солнце входит в знак в конкретный момент, и в разные годы это разные сутки. Мы считаем реальное положение Солнца, а не смотрим по таблице дат, поэтому на стыке ответ будет верным.",
  },
  {
    q: "Я родился за полярным кругом",
    a: "Мурманск, Норильск, Воркута: там система домов Плацидуса математически не определена, и честные программы это признают. Мы считаем дома по Порфирию и пишем об этом прямо в карте. Асцендент и середина неба верны в любом случае.",
  },
];

/** Пример карты для витрины: 26 июля 1990, Москва, 09:00. */
const SAMPLE_BIRTH = {
  date: "1990-07-26",
  time: "09:00",
  tz: "Europe/Moscow",
  latitude: 55.75222,
  longitude: 37.61556,
  placeName: "Москва",
};

function NatalCalculator({ stage, submit }: CalculatorApi<BirthValue>) {
  return <BirthForm busy={stage === "loading"} submitLabel="Построить карту" onSubmit={(v) => submit(v)} />;
}

function chartOf(birth: BirthValue) {
  return buildNatalChart({
    date: birth.date,
    time: birth.time,
    tz: birth.place?.tz ?? null,
    latitude: birth.place?.lat ?? null,
    longitude: birth.place?.lon ?? null,
    placeName: birth.place?.label ?? null,
  });
}

/** Круг карты в правой колонке результата. */
function NatalStage({ result }: ResultCtx<BirthValue>) {
  const chart = useMemo(() => chartOf(result), [result]);
  return <NatalWheel chart={chart} className="mx-auto w-full max-w-[520px]" />;
}

function NatalResultContent({ result, update }: ResultCtx<BirthValue>) {
  const chart = useMemo(() => chartOf(result), [result]);
  const variation = useNatalVariation(result, chart);
  return (
    <>
      {variation.preliminary && (
        <div className="mb-3">
          <PreliminaryBadge />
        </div>
      )}
      <NatalHeadline chart={chart} />

      {variation.preliminary ? (
        <NatalVariationNote
          birth={result}
          facts={variation.facts}
          precision={chart.moment.precision}
          moscowNoon={moscowClock(chart.moment.utc)}
          onRefine={update}
        />
      ) : (
        <p className="text-text-secondary" style={{ marginTop: 20, fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Разбор карты — ниже. Солнце, Луна и асцендент читаются бесплатно, остальные позиции и аспекты открывает
          подписка
        </p>
      )}
    </>
  );
}

/** До расчёта — объяснение, после — сам разбор. */
function NatalExplain({ ctx }: { ctx: ResultCtx<BirthValue> | null }) {
  if (ctx) {
    return (
      <section
        className="relative w-full"
        style={{ paddingTop: "clamp(48px, 6vh, 90px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}
      >
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <NatalReading birth={ctx.result} variant="questions" onRefine={ctx.update} />
        </div>
      </section>
    );
  }
  return <DataVsTimeBlock />;
}

const WITH_TIME = [
  "Асцендент: каким вас видят до того, как узнают",
  "Середина неба: к чему вы идёте на виду у других",
  "Двенадцать домов: в каких областях жизни всё разворачивается",
  "Планеты по домам: где именно проявляется каждая",
];

const WITHOUT_TIME = [
  "Солнце, Луна и восемь планет по знакам",
  "Ретроградные планеты",
  "Аспекты между планетами",
  "Лунные узлы",
];

/** Блок «что даёт дата и что даёт время» — с настоящим примером карты. */
function DataVsTimeBlock() {
  const chart = useMemo(() => buildNatalChart(SAMPLE_BIRTH), []);
  const [active, setActive] = useState<string | null>(null);

  return (
    <section
      className="relative w-full"
      style={{ paddingTop: "clamp(64px, 8vh, 120px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}>
          Что даёт дата и что даёт время
        </h2>
        <p
          className="text-text-secondary"
          style={{ marginTop: 14, fontSize: "clamp(15px, 1.15vw, 19px)", lineHeight: 1.6 }}
        >
          По дате считается почти вся карта. Время и место добавляют то, что от них зависит, — и ничего сверх того
        </p>

        <div
          className="mt-10 grid grid-cols-1 items-center md:grid-cols-[52fr_44fr]"
          style={{ columnGap: "4%", rowGap: "clamp(40px, 5vw, 90px)" }}
        >
          <NatalWheel chart={chart} active={active} onActivate={setActive} className="mx-auto w-full max-w-[520px]" />

          <div className="w-full" style={{ maxWidth: 480 }}>
            <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Достаточно даты
            </div>
            <div className="mt-3 flex flex-col" style={{ gap: 12 }}>
              {WITHOUT_TIME.map((item) => (
                <div key={item} className="flex items-center">
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded-full bg-text-accent"
                    style={{ width: 8, height: 8, marginRight: 14, boxShadow: "0 0 10px rgba(122, 93, 168, 0.5)" }}
                  />
                  <span className="text-text-primary" style={{ fontSize: "clamp(14px, 1.1vw, 17px)", lineHeight: 1.4 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="mt-7 text-text-secondary"
              style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Нужны время и место
            </div>
            <div className="mt-3 flex flex-col" style={{ gap: 12 }}>
              {WITH_TIME.map((item) => (
                <div key={item} className="flex items-center">
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded-full border border-border"
                    style={{ width: 8, height: 8, marginRight: 14 }}
                  />
                  <span
                    className="text-text-secondary"
                    style={{ fontSize: "clamp(14px, 1.1vw, 17px)", lineHeight: 1.4, opacity: 0.65 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="text-text-secondary"
              style={{ marginTop: 26, fontSize: "clamp(13px, 1vw, 15px)", lineHeight: 1.6 }}
            >
              На круге — настоящая карта на 26 июля 1990 года, Москва, 09:00. Наведите на планету, чтобы увидеть её
              аспекты
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function NatalPage() {
  return (
    <DirectionPage<BirthValue>
      id="natal"
      h1="Натальная карта онлайн"
      heroDescription="Настоящий расчёт по эфемеридам. Дата обязательна, время и место — если знаете"
      heroImage={natalAsset}
      heroImageAlt="Натальная карта — расчёт по дате рождения"
      aboutTitle="Что показывает натальная карта"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Ваша карта"
      linesTitle="Что входит в разбор"
      linesSubtitle="Планеты по знакам и домам, углы карты и аспекты между позициями"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Солнце во Льве, Луна в Деве"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полная карта — больше сорока позиций и связи между ними"
      faqTitle="Вопросы о натальной карте"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Натальная карта работает с реальным небом. Остальные пять считаются иначе и складываются с ней в один профиль"
      finalTitle="Построить свою карту"
      finalSubtitle="Бесплатно: круг карты, положения планет и аспекты"
      calculator={(api) => <NatalCalculator {...api} />}
      resultVisual={(ctx) => <NatalStage {...ctx} />}
      resultContent={(ctx) => <NatalResultContent {...ctx} />}
      explainBlock={(ctx) => <NatalExplain ctx={ctx} />}
    />
  );
}
