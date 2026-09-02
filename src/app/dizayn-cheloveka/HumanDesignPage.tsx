"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DirectionPage,
  type FaqItem,
} from "@/components/direction/DirectionPage";
const hdAsset = "/images/humandesign2.png";
import { HUMANDESIGN_LINES } from "@/lib/directionLines";

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
    q: "Почему расчёт не бесплатный",
    a: "Бодиграф считается по двум картам сразу: на момент рождения и на точку примерно за 88 дней до него. Обе требуют астрономических эфемерид, и в браузере такой расчёт не делается. Это единственное из шести направлений с таким ограничением, и мы предпочли сказать об этом прямо, а не показывать приблизительный результат.",
  },
  {
    q: "Обязательно ли знать время рождения",
    a: "Да. Тип и авторитет зависят от положения планет в конкретный час, и без времени расчёт даст неверный результат. Время часто есть в выписке из роддома или его помнят родные.",
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

const CENTERS: { points: string; label: string }[] = [
  { points: "35,26 65,26 50,8", label: "Голова" },
  { points: "35,34 65,34 50,52", label: "Аджна" },
  { points: "38,60 62,60 62,80 38,80", label: "Горло" },
  { points: "50,84 64,98 50,112 36,98", label: "Самость" },
  { points: "68,90 80,90 74,100", label: "Воля" },
  { points: "38,120 62,120 62,138 38,138", label: "Сакральный" },
  { points: "14,108 32,116 14,124", label: "Селезёнка" },
  { points: "86,108 68,116 86,124", label: "Солнечное сплетение" },
  { points: "38,148 62,148 62,166 38,166", label: "Корневой" },
];

const HUB = {
  head: [50, 26] as const,
  ajna: [50, 34] as const,
  throatTop: [50, 60] as const,
  throatBottom: [50, 80] as const,
  throatRight: [62, 70] as const,
  throatLeft: [38, 70] as const,
  selfTop: [50, 84] as const,
  selfBottom: [50, 112] as const,
  selfLeft: [36, 98] as const,
  selfRight: [64, 98] as const,
  willLeft: [68, 95] as const,
  sacralTop: [50, 120] as const,
  sacralBottom: [50, 138] as const,
  sacralLeft: [38, 129] as const,
  sacralRight: [62, 129] as const,
  spleen: [26, 116] as const,
  solar: [74, 116] as const,
  rootTop: [50, 148] as const,
  rootLeft: [38, 152] as const,
  rootRight: [62, 152] as const,
};

const CHANNELS: readonly [readonly [number, number], readonly [number, number]][] = [
  [HUB.head, HUB.ajna],
  [HUB.ajna, HUB.throatTop],
  [HUB.throatBottom, HUB.selfTop],
  [HUB.throatRight, HUB.willLeft],
  [HUB.throatLeft, HUB.spleen],
  [HUB.throatRight, HUB.solar],
  [HUB.selfBottom, HUB.sacralTop],
  [HUB.selfLeft, HUB.spleen],
  [HUB.selfRight, HUB.willLeft],
  [HUB.sacralBottom, HUB.rootTop],
  [HUB.spleen, HUB.rootLeft],
  [HUB.solar, HUB.rootRight],
  [HUB.sacralLeft, HUB.spleen],
  [HUB.sacralRight, HUB.solar],
];

/** Пустой бодиграф: девять контурных центров и каналы. */
function EmptyBodygraph() {
  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="aspect-square"
        style={{ width: "min(30vw, 46vh)", minWidth: 260, maxWidth: "100%" }}
      >
        <svg
          viewBox="0 0 100 170"
          role="img"
          aria-label="Пустой бодиграф: девять центров без заполнения"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {CHANNELS.map(([a, b], i) => (
            <line
              key={i}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="var(--border)"
              strokeOpacity={0.3}
              strokeWidth={1}
            />
          ))}
          {CENTERS.map((c) => (
            <polygon
              key={c.label}
              points={c.points}
              fill="none"
              stroke="var(--border)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
          ))}
        </svg>
      </div>
      <p
        className="text-center text-text-secondary"
        style={{ marginTop: 18, fontSize: 13, lineHeight: 1.5 }}
      >
        Девять центров. У каждого человека часть из них закрашена, часть пуста
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
const CENTER_CHANNELS: Record<string, number[]> = {
  head: [0],
  ajna: [0, 1],
  throat: [1, 2, 3, 4, 5],
  g: [2, 6, 7, 8],
  heart: [3, 8],
  sacral: [6, 9, 12, 13],
  spleen: [4, 7, 10, 12],
  solar: [5, 11, 13],
  root: [9, 10, 11],
};

/** Интерактивный бодиграф: центры подсвечиваются, каналы к активному центру загораются. */
function InteractiveBodygraph({
  active,
  onActivate,
}: {
  active: string;
  onActivate: (id: string) => void;
}) {
  const lit = new Set(CENTER_CHANNELS[active] ?? []);
  return (
    <div
      className="mx-auto w-[80vw] md:w-[min(34vw,50vh)]"
      style={{ minWidth: 300, maxWidth: "100%" }}
    >
      <svg
        viewBox="0 0 100 170"
        role="group"
        aria-label="Схема девяти центров бодиграфа"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {CHANNELS.map(([a, b], i) => (
          <line
            key={i}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke={lit.has(i) ? "var(--text-accent)" : "var(--border)"}
            strokeOpacity={lit.has(i) ? 0.5 : 0.3}
            strokeWidth={lit.has(i) ? 1.5 : 1}
            style={{ transition: "stroke 250ms, stroke-opacity 250ms" }}
          />
        ))}
        {CENTERS.map((c, i) => {
          const id = HD_CENTERS[i]!.id;
          const isActive = id === active;
          return (
            <polygon
              key={id}
              points={c.points}
              role="button"
              tabIndex={0}
              aria-label={HD_CENTERS[i]!.title}
              aria-pressed={isActive}
              onMouseEnter={() => onActivate(id)}
              onClick={() => onActivate(id)}
              onFocus={() => onActivate(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onActivate(id);
                }
              }}
              fill={isActive ? "rgba(122, 93, 168, 0.14)" : "transparent"}
              stroke={isActive ? "var(--text-accent)" : "var(--border)"}
              strokeOpacity={isActive ? 1 : 0.55}
              strokeWidth={isActive ? 1.5 : 1}
              style={{
                cursor: "pointer",
                outline: "none",
                transition: "fill 250ms, stroke 250ms, stroke-opacity 250ms, filter 250ms",
                filter: isActive ? "drop-shadow(0 0 6px rgba(122, 93, 168, 0.35))" : "none",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

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
            <InteractiveBodygraph active={active} onActivate={activate} />
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

/** Первый экран: объяснение + прямой переход на пробный доступ. */
function HdHeroCta() {
  return (
    <div style={{ marginTop: 32 }}>
      <Link
        href="/register"
        className="qc-focus inline-flex items-center justify-center rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        style={{ height: 54, paddingInline: 40 }}
      >
        Открыть пробный доступ
      </Link>

      <div className="mt-4">
        <a
          href="#about"
          className="text-text-accent transition-opacity hover:opacity-80"
          style={{ fontSize: "clamp(15px, 1.15vw, 18px)" }}
        >
          Сначала разобраться, что это
        </a>
      </div>

      <p className="text-text-secondary" style={{ marginTop: 20, fontSize: 13, lineHeight: 1.5 }}>
        Бодиграф считается по двум картам и требует точного времени рождения. Входит в пробный доступ
        на три дня
      </p>
    </div>
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
    <DirectionPage<unknown>
      id="humandesign"
      h1="Дизайн человека: тип, стратегия и авторитет"
      heroDescription="Схема из девяти центров, рассчитанная по положению планет. Разбираем, что это такое и как читается"
      heroImage={hdAsset}
      heroImageAlt="Дизайн человека — расчёт бодиграфа"
      aboutTitle="Что показывает дизайн человека"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="Почему нужен расчёт"
      linesTitle="Что входит в разбор"
      linesSubtitle="Полный бодиграф: девять центров, каналы и ворота"
      lines={LINES}
      exampleTitle="Как выглядит разбор"
      exampleSubtitle="Фрагмент настоящего текста. Проектор, эмоциональный авторитет"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный разбор — тип, стратегия, авторитет, профиль, все центры и каналы"
      faqTitle="Вопросы о дизайне человека"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Дизайн человека описывает обмен энергией. Остальные пять смотрят с других сторон и складываются с ним в один профиль"
      finalTitle="Рассчитать свой бодиграф"
      finalSubtitle="Тип, стратегия и авторитет входят в пробный доступ на три дня"
      finalBlock={
        <section
          id="start"
          className="qc-plate relative w-full overflow-hidden z-[2]"
          style={{
            paddingTop: "clamp(120px, 14vh, 220px)",
            paddingBottom: "clamp(120px, 14vh, 220px)",
          }}
        >
          <div
            className="relative z-[4] mx-auto flex w-full max-w-[1600px] flex-col items-center text-center"
            style={{ paddingLeft: "clamp(24px, 6vw, 120px)", paddingRight: "clamp(24px, 6vw, 120px)" }}
          >
            <h2
              className="font-display text-text-primary"
              style={{
                fontSize: "clamp(32px, 3.4vw, 64px)",
                letterSpacing: "0.01em",
                lineHeight: 1.08,
              }}
            >
              Рассчитать свой бодиграф
            </h2>
            <p
              className="mt-4 max-w-[520px] text-text-secondary"
              style={{ fontSize: "clamp(16px, 1.2vw, 20px)" }}
            >
              Тип, стратегия и авторитет входят в пробный доступ на три дня
            </p>
            <Link
              href="/register"
              className="qc-focus mt-8 inline-flex items-center justify-center rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              style={{ height: 54, paddingInline: 40 }}
            >
              Открыть пробный доступ
            </Link>
          </div>
        </section>
      }
      calculator={() => <HdHeroCta />}
      placeholderVisual={<EmptyBodygraph />}
      resultVisual={() => <EmptyBodygraph />}
      resultContent={() => null}
      explainBlock={
        <>
          <HdStructureBlock />
          <TwoChartsBlock />
        </>
      }
    />
  );
}
