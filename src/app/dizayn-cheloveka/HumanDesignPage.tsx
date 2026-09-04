"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DirectionPage,
  type CalculatorApi,
  type FaqItem,
  type ResultCtx,
} from "@/components/direction/DirectionPage";
const hdAsset = "/images/humandesign2.png";
import { HUMANDESIGN_LINES } from "@/lib/directionLines";
import { BirthForm, type BirthValue } from "@/components/natal/BirthForm";
import { Bodygraph } from "@/components/humandesign/Bodygraph";
import { moscowClock } from "@/lib/geo/dayScan";
import {
  HdReading,
  HdVariationNote,
  PreliminaryBadge,
  chartFromBirth,
  useHdVariation,
} from "@/components/humandesign/HdReading";

const ABOUT_PARAGRAPHS = [
  "Дизайн человека появился в конце восьмидесятых и соединил четыре старые системы: астрологию, китайскую Книгу перемен, каббалу и учение о чакрах. Из них собрана одна схема — бодиграф, где девять центров соединены каналами.",
  "Каждый центр отвечает за свою функцию: один за то, как ты думаешь, другой за то, как проявляешься вовне, третий за жизненную энергию. Часть центров у человека определена, часть нет — и это главное, что читается по схеме.",
  "Определённый центр работает одинаково всегда, независимо от окружения: это то, на что можно опереться. Неопределённый усиливает то, что приходит от людей рядом, — отсюда ощущение, что в одной компании ты один человек, а в другой совсем другой.",
  "Из сочетания определённых центров выводится тип, а из типа — стратегия: способ принимать решения, при котором тратится меньше сил. Типов четыре, и они распределены между людьми очень неравномерно.",
];

const LINES = HUMANDESIGN_LINES;

const SAMPLE_PARAGRAPHS = [
  "Проектор устроен так, что не производит энергию сам, а направляет чужую. Отсюда главная сложность: работать наравне с генераторами ты можешь, но недолго, и расплата приходит не в тот же день, а через неделю усталости, которую не с чем связать.",
  "Стратегия проектора — ждать приглашения. Звучит пассивно, а на деле означает другое: твоя работа видна и востребована ровно тогда, когда о ней попросили. Инициатива без запроса чаще всего упирается в вежливое согласие и ничем не заканчивается.",
  "Эмоциональный авторитет добавляет к этому вторую задачу. Решение, принятое на подъёме, и решение, принятое на спаде, у тебя будут разными — и оба покажутся верными в момент. Отсюда единственное правило, которое действительно меняет качество выбора, и оно про то,",
];

const FAQ: FaqItem[] = [
  {
    q: "Обязательно ли знать время рождения",
    a: "Для настоящего результата — да. Луна проходит одни ворота примерно за десять часов, а от неё может зависеть целый канал и, значит, тип. Без времени мы посчитаем на полдень и честно напишем, что это прикидка. Время часто есть в выписке из роддома или его помнят родные.",
  },
  {
    q: "Насколько точен расчёт",
    a: "Положения планет сверены с NASA JPL и со Swiss Ephemeris, а весь бодиграф целиком — с открытым калькулятором на двадцати контрольных датах: ворота и линии всех двадцати шести активаций, полные каналы, определённые центры, тип, авторитет, профиль и определение совпали полностью.",
  },
  {
    q: "Почему две карты и почему не ровно 88 дней",
    a: "Вторая карта строится на момент, когда Солнце стояло на 88 градусов долготы раньше. Солнце идёт по эклиптике неравномерно, поэтому в сутках это от 87 до 92 дней. Сервисы, которые просто отнимают 88 дней, ошибаются на несколько ворот.",
  },
  {
    q: "Чем дизайн человека отличается от натальной карты",
    a: "Обе системы работают с положением планет, но отвечают на разные вопросы. Натальная карта описывает характер и обстоятельства. Дизайн человека — способ принимать решения и обмениваться энергией с людьми.",
  },
  {
    q: "Что делать, если тип не совпадает с ощущением себя",
    a: "Это частая ситуация, особенно у проекторов и рефлекторов: многие годами живут по чужой стратегии и привыкают считать её своей. Бодиграф описывает не привычку, а устройство, и расхождение между ними обычно и есть самое полезное в разборе.",
  },
  {
    q: "Дизайн человека предсказывает события",
    a: "Нет. Он описывает механику решений и энергии, а не то, что произойдёт.",
  },
];

/** Пустой бодиграф: девять контурных центров и все тридцать шесть каналов. */
function EmptyBodygraph() {
  return (
    <div className="flex w-full flex-col items-center">
      <Bodygraph chart={null} className="w-full max-w-[340px]" />
      <p className="text-center text-text-secondary" style={{ marginTop: 18, fontSize: 13, lineHeight: 1.5 }}>
        Девять центров и тридцать шесть каналов. У каждого человека часть из них закрашена, часть пуста
      </p>
    </div>
  );
}

const HD_TYPES = [
  {
    share: "~70%",
    title: "Генератор",
    text: "Есть постоянный доступ к энергии, но включается она откликом, а не решением. Работает то, на что отзывается тело, и буксует то, что выбрано головой",
  },
  {
    share: "~20%",
    title: "Проектор",
    text: "Не производит энергию, а направляет чужую. Видит людей и системы точнее остальных, но выдыхается, если работает наравне с генераторами",
  },
  {
    share: "~9%",
    title: "Манифестор",
    text: "Начинает сам, не дожидаясь отклика и приглашения. Чаще других встречает сопротивление, и оно снимается, если предупреждать о своих действиях заранее",
  },
  {
    share: "~1%",
    title: "Рефлектор",
    text: "Все центры открыты. Отражает состояние окружения и потому особенно зависит от того, среди кого находится. Решения требуют времени — около лунного цикла",
  },
];

const HD_CENTERS = [
  {
    id: "head",
    title: "Голова",
    text: "Давление думать: вопросы, идеи и то, что не даёт покоя. Определённая голова рождает свои вопросы, неопределённая подхватывает чужие и может думать о том, что её вовсе не касается",
  },
  {
    id: "ajna",
    title: "Аджна",
    text: "Как ты обрабатываешь информацию и приходишь к выводам. Определённая аджна держится за свой способ думать, неопределённая гибко примеряет чужие и потому кажется себе непоследовательной",
  },
  {
    id: "throat",
    title: "Горло",
    text: "Выражение и действие: как ты проявляешься вовне. Самый загруженный центр в схеме — сюда стекается почти всё остальное, и здесь замысел превращается в слово или поступок",
  },
  {
    id: "g",
    title: "Самость",
    text: "Направление и ощущение себя: кто ты и куда идёшь. Определённая самость держит курс изнутри, неопределённая находит его через место и людей, среди которых оказывается",
  },
  {
    id: "heart",
    title: "Воля",
    text: "Воля, обещания и самооценка через доказанное. Определённая воля умеет обещать и выполнять, неопределённой не стоит доказывать свою ценность — это самый частый источник усталости",
  },
  {
    id: "sacral",
    title: "Сакральный",
    text: "Жизненная энергия и отклик. Определённый сакральный даёт устойчивый доступ к силе, но она включается ответом на вопрос, а не решением. Есть только у генераторов",
  },
  {
    id: "spleen",
    title: "Селезёнка",
    text: "Интуиция, здоровье и мгновенное чувство безопасности. Говорит один раз и тихо, повторять не будет. Определённая селезёнка предупреждает надёжно, неопределённая склонна цепляться за то, что пора отпустить",
  },
  {
    id: "solar",
    title: "Солнечное сплетение",
    text: "Эмоции и их волна. Определённое сплетение означает, что ясности в моменте не бывает: решение становится верным только после того, как волна прошла",
  },
  {
    id: "root",
    title: "Корневой",
    text: "Давление и топливо для действия. Определённый корень даёт ровный напор, неопределённый усиливает чужую спешку — отсюда ощущение, что надо срочно всё доделать и освободиться",
  },
];

/** Каналы (по индексам CHANNELS), ведущие к каждому центру. */
/** Блок «Как устроен дизайн человека»: четыре типа + интерактивная схема девяти центров. */
function HdStructureBlock() {
  const [active, setActive] = useState("throat");
  const interactedRef = useRef(false);

  const activate = (id: string) => {
    interactedRef.current = true;
    setActive(id);
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      if (interactedRef.current) {
        window.clearInterval(t);
        return;
      }
      setActive((prev) => {
        const i = HD_CENTERS.findIndex((c) => c.id === prev);
        return HD_CENTERS[(i + 1) % HD_CENTERS.length]!.id;
      });
    }, 3000);
    return () => window.clearInterval(t);
  }, []);

  const current = HD_CENTERS.find((c) => c.id === active) ?? HD_CENTERS[2]!;

  return (
    <section
      className="relative w-full"
      style={{ paddingTop: "clamp(64px, 8vh, 120px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2
          className="font-display text-text-primary"
          style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
        >
          Как устроен дизайн человека
        </h2>
        <p
          className="text-text-secondary"
          style={{ marginTop: 14, fontSize: "clamp(15px, 1.15vw, 19px)", lineHeight: 1.6 }}
        >
          Девять центров складываются в четыре типа. От типа зависит стратегия — способ принимать
          решения
        </p>

        {/* Часть 1: четыре типа */}
        <p
          className="uppercase text-text-secondary"
          style={{
            marginTop: 48,
            fontSize: 13,
            letterSpacing: "0.08em",
          }}
        >
          Четыре типа
        </p>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          style={{ gap: 20, marginTop: 28 }}
        >
          {HD_TYPES.map((t) => (
            <div
              key={t.title}
              className="rounded-[18px] border border-border bg-surface-1"
              style={{ padding: 26 }}
            >
              <span
                className="font-mono text-text-accent"
                style={{ fontSize: "clamp(22px, 2vw, 34px)", lineHeight: 1.1 }}
              >
                {t.share}
              </span>
              <h3
                className="font-display text-text-primary"
                style={{ marginTop: 8, fontSize: "clamp(18px, 1.5vw, 25px)", lineHeight: 1.2 }}
              >
                {t.title}
              </h3>
              <p
                className="text-text-secondary"
                style={{ marginTop: 10, fontSize: "clamp(13px, 1.05vw, 16px)", lineHeight: 1.55 }}
              >
                {t.text}
              </p>
            </div>
          ))}
        </div>
        <p
          className="text-text-secondary"
          style={{ marginTop: 20, fontSize: 12, opacity: 0.7 }}
        >
          Доли приблизительные, приняты внутри самой системы
        </p>

        {/* Разделитель */}
        <div
          aria-hidden="true"
          className="bg-border"
          style={{ height: 1, opacity: 0.35, marginTop: 56, marginBottom: 56 }}
        />

        {/* Часть 2: девять центров */}
        <p
          className="uppercase text-text-secondary"
          style={{ fontSize: 13, letterSpacing: "0.08em" }}
        >
          Девять центров
        </p>
        <div
          className="flex flex-col items-center md:flex-row md:items-center"
          style={{ gap: "clamp(32px, 4vw, 72px)", marginTop: 28 }}
        >
          <div className="w-full md:w-[46%]">
            <Bodygraph
              chart={null}
              active={`center:${active === "g" ? "self" : active}`}
              onActivate={(id) => {
                if (!id?.startsWith("center:")) return;
                const center = id.slice("center:".length);
                activate(center === "self" ? "g" : center);
              }}
              className="mx-auto w-full max-w-[320px]"
            />
          </div>
          <div className="w-full md:w-[48%]">
            <div key={current.id} className="animate-[fade-in_200ms_ease-out]" style={{ minHeight: 220 }}>
              <h3
                className="font-display text-text-primary"
                style={{ fontSize: "clamp(22px, 1.9vw, 32px)", lineHeight: 1.15 }}
              >
                {current.title}
              </h3>
              <p
                className="text-text-secondary"
                style={{ marginTop: 14, fontSize: "clamp(15px, 1.15vw, 19px)", lineHeight: 1.65 }}
              >
                {current.text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Первый экран: настоящий расчёт по дате, времени и месту. */
function HdCalculator({ stage, submit }: CalculatorApi<BirthValue>) {
  return <BirthForm busy={stage === "loading"} submitLabel="Построить бодиграф" onSubmit={(v) => submit(v)} />;
}

/** Схема в правой колонке: до расчёта пустая, после — с определёнными центрами. */
function HdStage({ result }: ResultCtx<BirthValue>) {
  const chart = useMemo(() => chartFromBirth(result), [result]);
  return (
    <div className="flex w-full flex-col items-center">
      <Bodygraph chart={chart} className="mx-auto w-full max-w-[300px]" />
      <p className="mt-4 text-center text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Закрашены центры, которые у вас определены: {chart.definedCenters.length} из девяти
      </p>
    </div>
  );
}

function HdResultContent({ result, update }: ResultCtx<BirthValue>) {
  const chart = useMemo(() => chartFromBirth(result), [result]);
  const variation = useHdVariation(result, chart);
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <div className="font-display text-text-primary" style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}>
          {chart.type.name}
        </div>
        {variation.preliminary && <PreliminaryBadge />}
      </div>
      <div className="mt-2 text-text-secondary" style={{ fontSize: "clamp(15px, 1.15vw, 18px)" }}>
        Стратегия: {chart.type.strategy.toLowerCase()}
      </div>
      <p className="mt-4 text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.6 }}>
        {chart.type.strategyLine}
      </p>

      {variation.preliminary ? (
        <HdVariationNote
          birth={result}
          facts={variation.facts}
          precision={chart.moment.precision}
          moscowNoon={moscowClock(chart.moment.utc)}
          onRefine={update}
        />
      ) : (
        <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Разбор — ниже. Тип и стратегия читаются бесплатно, авторитет, профиль, каналы и ворота открывает подписка
        </p>
      )}
    </>
  );
}

/** До расчёта — объяснение системы, после — сам разбор. */
function HdExplain({ ctx }: { ctx: ResultCtx<BirthValue> | null }) {
  if (ctx) {
    return (
      <section
        className="relative w-full"
        style={{ paddingTop: "clamp(48px, 6vh, 90px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}
      >
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <HdReading birth={ctx.result} variant="questions" onRefine={ctx.update} />
        </div>
      </section>
    );
  }
  return (
    <>
      <HdStructureBlock />
      <TwoChartsBlock />
    </>
  );
}

/** Блок «как считается»: шкала двух карт с интервалом 88 дней. */
function TwoChartsBlock() {
  const dot = {
    width: 14,
    height: 14,
    boxShadow: "0 0 16px rgba(122, 93, 168, 0.45)",
  } as const;

  return (
    <section
      className="relative w-full"
      style={{ paddingTop: "clamp(64px, 8vh, 120px)", paddingBottom: "clamp(64px, 8vh, 120px)" }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2
          className="font-display text-text-primary"
          style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
        >
          Почему карт две
        </h2>
        <p
          className="text-text-secondary"
          style={{ marginTop: 14, fontSize: "clamp(15px, 1.15vw, 19px)", lineHeight: 1.6 }}
        >
          Дизайн человека считает не один момент, а два
        </p>

        <div className="mx-auto w-full" style={{ maxWidth: 720, marginTop: "clamp(48px, 6vw, 80px)" }}>
          <div className="relative w-full" style={{ height: 96 }}>
            {/* линия */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 bg-border"
              style={{ top: 48, height: 1 }}
            />

            {/* 88 дней */}
            <span
              className="absolute -translate-x-1/2 font-mono text-text-secondary"
              style={{ left: "50%", top: 26, fontSize: "clamp(13px, 1.05vw, 16px)" }}
            >
              88 дней
            </span>

            {[
              { left: "12%", top: "Дизайн", bottom: "примерно за 88 дней до рождения" },
              { left: "88%", top: "Личность", bottom: "момент рождения" },
            ].map((p) => (
              <div key={p.left} className="absolute" style={{ left: p.left, top: 0 }}>
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap text-text-primary"
                  style={{ top: 0, fontSize: "clamp(14px, 1.1vw, 17px)" }}
                >
                  {p.top}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute -translate-x-1/2 rounded-full bg-text-accent"
                  style={{ ...dot, top: 42 }}
                />
                <span
                  className="absolute -translate-x-1/2 text-center text-text-secondary"
                  style={{ top: 66, fontSize: 12, lineHeight: 1.35, width: "min(150px, 26vw)" }}
                >
                  {p.bottom}
                </span>
              </div>
            ))}
          </div>

          <p
            className="text-text-secondary"
            style={{ marginTop: 32, fontSize: "clamp(14px, 1.05vw, 17px)", lineHeight: 1.65 }}
          >
            Первая карта отвечает за то, что ты осознаёшь в себе, вторая — за то, что работает без
            твоего участия и обычно заметнее со стороны. Бодиграф получается наложением обеих,
            поэтому одной даты для него недостаточно.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function HumanDesignPage() {
  return (
    <DirectionPage<BirthValue>
      id="humandesign"
      h1="Дизайн человека: тип, стратегия и авторитет"
      heroDescription="Схема из девяти центров по реальному положению планет. Дата обязательна, время и место — если знаете"
      heroImage={hdAsset}
      heroImageAlt="Дизайн человека — расчёт бодиграфа"
      aboutTitle="Что показывает дизайн человека"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Ваш тип"
      linesTitle="Что входит в разбор"
      linesSubtitle="Полный бодиграф: девять центров, тридцать шесть каналов и шестьдесят четыре ворот"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Проектор, эмоциональный авторитет"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный разбор — тип, стратегия, авторитет, профиль, все центры и каналы"
      faqTitle="Вопросы о дизайне человека"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Дизайн человека описывает обмен энергией. Остальные пять смотрят с других сторон и складываются с ним в один профиль"
      finalTitle="Построить свой бодиграф"
      finalSubtitle="Бесплатно: схема с определёнными центрами, тип и стратегия"
      calculator={(api) => <HdCalculator {...api} />}
      placeholderVisual={<EmptyBodygraph />}
      resultVisual={(ctx) => <HdStage {...ctx} />}
      resultContent={(ctx) => <HdResultContent {...ctx} />}
      explainBlock={(ctx) => <HdExplain ctx={ctx} />}
    />
  );
}
