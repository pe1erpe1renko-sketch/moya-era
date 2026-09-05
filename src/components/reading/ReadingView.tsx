"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import type { Matrix, PairMatrix } from "@/lib/matrix/matrixEngine";
import { POINT_CODES, buildToday } from "@/lib/matrix/matrixEngine";
import type { SectionData } from "@/lib/matrix/contentPositions";
import { CALC_TYPES } from "@/lib/matrix/contentPositions";
import { arcanaLine, arcanaName, formatDateLong, formatDateDots, readingPath } from "@/lib/matrix";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { useAuth } from "@/lib/useAuth";
import { backend } from "@/lib/backend";
import { Octagram } from "./Octagram";
import { Spheres, plural, ArcanaCard } from "./Spheres";
import { Paywall } from "./Paywall";
import { ExploreNext } from "./ExploreNext";
import { useReadingTexts, type SlotText } from "./useReadingTexts";
import { useGoToReading } from "./CalcTheater";
import type { ResearchCardProps } from "./ResearchCard";
import { track } from "@/components/analytics/track";

export type LockReason = "no_subscription" | "person_not_added" | "not_logged_in";

export type ReadingViewProps = {
  type: { id: string; slug: string; title: string; lead: string; note?: string; pair: boolean; full?: boolean };
  urlDates: string[];
  isoDates: string[];
  matrix: Matrix | PairMatrix;
  /** разделы в «закрытом» виде — страница статическая, доступ узнаём на клиенте */
  sections: SectionData[];
  /** те же разделы без замков — подставляются, когда доступ подтверждён */
  sectionsOpen: SectionData[];
  initialTexts: Record<string, SlotText>;
  freeCount: number;
  totalCount: number;
};

export function ReadingView(props: ReadingViewProps) {
  const { type, urlDates, isoDates, matrix, initialTexts, freeCount, totalCount } = props;
  const { texts, busy, load, reset } = useReadingTexts(type.slug, urlDates, initialTexts);
  const [paywall, setPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason | null>(null);
  const [demo, setDemo] = useState(false);
  const sections = unlocked ? props.sectionsOpen : props.sections;

  // Доступ узнаём после загрузки: страница одна для всех, замки — по пользователю.
  useEffect(() => {
    let alive = true;
    fetch(`/api/me/access?dates=${urlDates.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { unlocked: boolean; reason: LockReason | null; demo: boolean } | null) => {
        if (!alive || !d) return;
        setDemo(Boolean(d.demo));
        setLockReason(d.reason);
        if (d.unlocked) {
          setUnlocked(true);
          reset(); // закрытые ответы перезапросятся уже открытыми
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [urlDates, reset]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const go = useGoToReading();
  const touched = useRef(false);

  const isPair = type.pair;
  const single = !isPair ? (matrix as Matrix) : null;
  const pair = isPair ? (matrix as PairMatrix) : null;
  const core = matrix.core;
  const myDate = isoDates[0];

  // История разборов в кабинете + событие аналитики
  useEffect(() => {
    if (touched.current) return;
    touched.current = true;
    track("reading_view", { type: type.slug, pair: isPair, unlocked });
    if (user?.id && !demo) backend.readings.touch(user.id, type.slug, isoDates).catch(() => {});
  }, [user?.id, type.slug, isoDates, isPair, unlocked, demo]);

  const openLocked = useCallback(() => {
    track("paywall_open", { type: type.slug });
    setPaywall(true);
  }, [type.slug]);

  const onSelectPoint = useCallback((pointId: string) => void load([pointId]), [load]);
  const hints = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(texts)) if (k.startsWith("point_") && !("locked" in v)) out[k] = v.text;
    return out;
  }, [texts]);

  const goToSection = useCallback((sectionId: string) => {
    setOpenSection(sectionId);
    document.getElementById(`sphere-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const research = useMemo(() => buildResearch(type.slug, myDate, go), [type.slug, myDate, go]);

  const otherTypes = CALC_TYPES.filter((t) => t.slug !== type.slug && t.pair === isPair);

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[90px] w-full md:h-[110px]">
        <Header />
      </div>

      {/* Первый экран */}
      <section className="mx-auto w-full max-w-[1200px] px-[5vw] pb-10 pt-4 md:px-6 md:pt-8">
        <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">
          {type.title} · {isoDates.map(formatDateDots).join(" + ")}
        </div>
        {/* Иллюстрация центрального аркана — на первом экране, поэтому
            грузится сразу, а не по прокрутке. На телефоне встаёт над
            заголовком, на широком экране — слева от него. */}
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start">
          <ArcanaImage n={core.C} width={132} rounded={14} priority />
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(32px,5vw,64px)] leading-[1.05] text-text-primary">
              {isPair ? "Ядро пары" : "Центральный аркан"} — {core.C}, {arcanaName(core.C)}
            </h1>
            <p className="mt-3 max-w-[720px] text-[clamp(16px,1.3vw,20px)] leading-[1.55] text-text-secondary">{arcanaLine(core.C)}</p>
          </div>
        </div>
        {type.note && <p className="mt-3 max-w-[720px] text-[14px] text-text-secondary/80">{type.note}</p>}
        {single && (
          <p className="mt-4 text-[15px] text-text-secondary">
            Дата рождения — {formatDateLong(single.birthDate)}. Расчёт арифметический: одна и та же дата всегда даёт одну и ту же матрицу.
          </p>
        )}
        {pair && (
          <p className="mt-4 text-[15px] text-text-secondary">
            Матрица пары строится сложением двух личных: {formatDateLong(pair.dates[0])} и {formatDateLong(pair.dates[1])}.
          </p>
        )}

        {/* Ключевые числа */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {(["W", "N", "E", "S", "C"] as const).map((k) => (
            // На узком экране картинка встаёт над текстом: в ряд рядом с
            // ней «Перерождение» не помещается и упирается в край карточки.
            <div key={k} className={`flex flex-col gap-3 rounded-[14px] border border-border/60 bg-surface-1/40 p-4 sm:flex-row sm:items-center ${k === "C" ? "col-span-2 border-text-accent/40 sm:col-span-1" : ""}`}>
              <ArcanaImage n={core[k]} width={44} rounded={8} />
              <div className="min-w-0">
                <div className="text-[12px] uppercase tracking-[0.08em] text-text-secondary">{POINT_CODES[k].title}</div>
                <div className="mt-1 font-display text-[28px] leading-none text-text-primary">{core[k]}</div>
                <div className="mt-1 text-[13px] text-text-accent">{arcanaName(core[k])}</div>
              </div>
            </div>
          ))}
        </div>

        {!unlocked && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={openLocked} className="inline-flex h-12 items-center justify-center rounded-[12px] bg-accent px-6 text-[16px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Открыть все {totalCount} {plural(totalCount, "вопрос", "вопроса", "вопросов")}
            </button>
            <span className="text-[14px] text-text-secondary">Бесплатно открыто {freeCount} — по одному в каждой сфере</span>
          </div>
        )}
        {demo && <p className="mt-4 text-[13px] text-text-danger">Демо-режим: база не подключена, все разборы открыты, тексты — заглушки.</p>}
      </section>

      {/* Схема */}
      <section className="mx-auto w-full max-w-[1200px] px-[5vw] pb-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
          <div>
            <h2 className="font-display text-[clamp(24px,2.6vw,36px)] text-text-primary">Схема матрицы</h2>
            <p className="mt-2 text-[15px] text-text-secondary">25 точек, каждая — своё число. Внешние восемь и центр — основа, промежуточные считаются из них. Нажмите на точку — увидите, что она значит.</p>
            <div className="mt-5">
              <Octagram matrix={matrix} showTimeline={!isPair} age={single?.today.age ?? null} onSelect={onSelectPoint} hints={hints} loading={busy} onGoToSection={goToSection} />
            </div>
          </div>
          <div className="space-y-4">
            {single && <TodayCard matrix={single} texts={texts} onLoad={() => load(["day_energy"])} />}
            <ChakraTable matrix={matrix} />
          </div>
        </div>
      </section>

      {/* Сферы */}
      <section className="mx-auto w-full max-w-[1200px] px-[5vw] pb-12 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[clamp(24px,2.6vw,36px)] text-text-primary">{type.full ? "Двенадцать сфер" : type.title}</h2>
            <p className="mt-2 max-w-[640px] text-[15px] text-text-secondary">{type.lead}</p>
          </div>
          {!type.full && (
            <button type="button" onClick={() => go(readingPath("matrica", isPair ? [isoDates[0]] : isoDates))} className="inline-flex h-11 items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary hover:bg-accent/10">
              Показать всю матрицу{isPair ? ` · ${formatDateDots(isoDates[0])}` : ""}
            </button>
          )}
          {isPair && !type.full && (
            <button type="button" onClick={() => go(readingPath("matrica", [isoDates[1]]))} className="inline-flex h-11 items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary hover:bg-accent/10">
              Вся матрица · {formatDateDots(isoDates[1])}
            </button>
          )}
        </div>
        <div className="mt-6">
          <Spheres sections={sections} texts={texts} busy={busy} onOpenSlot={(id) => load([id])} onLocked={openLocked} research={research} openSectionId={openSection} />
        </div>
      </section>

      {/* Дальше */}
      <section className="mx-auto w-full max-w-[1200px] px-[5vw] pb-16 md:px-6">
        {!isPair && <ExploreNext myDate={myDate} />}
        <div className="mt-8">
          <h3 className="text-[13px] uppercase tracking-[0.1em] text-text-secondary">Другие разборы по {isPair ? "этим датам" : "этой дате"}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {otherTypes.map((t) => (
              <Link key={t.slug} href={readingPath(t.slug, isoDates)} className="rounded-full border border-border px-4 py-2 text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary">
                {t.title}
              </Link>
            ))}
            {!isPair && (
              <Link href={readingPath("prognoz", isoDates)} className="rounded-full border border-border px-4 py-2 text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary">
                Прогноз
              </Link>
            )}
          </div>
        </div>
        {!isAuthenticated && (
          <p className="mt-8 text-[14px] text-text-secondary">
            Ссылка на эту страницу постоянная — её можно сохранить или переслать. Чтобы разбор жил в кабинете вместе с арканом дня,{" "}
            <Link href="/register" className="text-text-accent underline-offset-4 hover:underline">
              создайте аккаунт
            </Link>
            .
          </p>
        )}
      </section>

      <Footer />

      <Paywall open={paywall} onClose={() => setPaywall(false)} date={myDate} freeCount={freeCount} totalCount={totalCount} reason={lockReason ?? undefined} />
    </main>
  );
}

/* ─── Сегодня ───────────────────────────────────────────────────── */

function TodayCard({ matrix, texts, onLoad }: { matrix: Matrix; texts: Record<string, SlotText>; onLoad: () => void }) {
  // Страница кэшируется, поэтому «сегодня» пересчитываем в браузере.
  const [t, setT] = useState(matrix.today);
  useEffect(() => {
    setT(buildToday(matrix.timeline, matrix.birthDate, new Date()));
  }, [matrix.timeline, matrix.birthDate]);
  const state = texts["day_energy"];
  useEffect(() => {
    if (!state) onLoad();
  }, [state, onLoad]);
  return (
    <div className="rounded-[20px] border border-border/60 bg-surface-1/40 p-5 md:p-6">
      <div className="text-[13px] uppercase tracking-[0.08em] text-text-secondary">Сегодня · {formatDateDots(t.date)}</div>
      <div className="mt-3 flex items-start gap-4">
        <ArcanaCard n={t.dayArcana} size={84} />
        <div className="min-w-0">
          <div className="font-display text-[clamp(26px,2.6vw,36px)] leading-none text-text-primary">
            {t.dayArcana} · {arcanaName(t.dayArcana)}
          </div>
          <p className="mt-2 text-[15px] leading-[1.6] text-text-secondary">
            {state && !("locked" in state) ? state.text : "Подбираю слова…"}
          </p>
          <p className="mt-3 text-[13px] text-text-secondary/80">
            Завтра — аркан {t.tomorrowArcana}, {arcanaName(t.tomorrowArcana)}. Период жизни {t.from}–{t.to} лет: аркан {t.arcana}, {arcanaName(t.arcana)}.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Чакральная таблица ────────────────────────────────────────── */

function ChakraTable({ matrix }: { matrix: Matrix | PairMatrix }) {
  const ch = matrix.chakras;
  return (
    <div className="rounded-[20px] border border-border/60 bg-surface-1/40 p-5 md:p-6">
      <div className="text-[13px] uppercase tracking-[0.08em] text-text-secondary">Карта здоровья по чакрам</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[340px] text-[14px]">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-[0.06em] text-text-secondary">
              <th className="py-2 pr-2 font-normal">Чакра</th>
              <th className="py-2 pr-2 text-center font-normal">Физика</th>
              <th className="py-2 pr-2 text-center font-normal">Энергия</th>
              <th className="py-2 text-center font-normal">Эмоции</th>
            </tr>
          </thead>
          <tbody>
            {ch.rows.map((r) => (
              <tr key={r.key} className="border-t border-border/30">
                <td className="py-2 pr-2">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: r.color }} aria-hidden="true" />
                  <span className="text-text-primary">{r.name}</span>
                  <span className="ml-1 hidden text-text-secondary sm:inline">· {r.sphere}</span>
                </td>
                <td className="py-2 pr-2 text-center text-text-primary">{r.physics}</td>
                <td className="py-2 pr-2 text-center text-text-primary">{r.energy}</td>
                <td className="py-2 text-center text-text-primary">{r.emotions}</td>
              </tr>
            ))}
            <tr className="border-t border-text-accent/40">
              <td className="py-2 pr-2 text-text-accent">Итог</td>
              <td className="py-2 pr-2 text-center font-medium text-text-accent">{ch.total.physics}</td>
              <td className="py-2 pr-2 text-center font-medium text-text-accent">{ch.total.energy}</td>
              <td className="py-2 text-center font-medium text-text-accent">{ch.total.emotions}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Исследовательские блоки (механика, раздел 12) ─────────────── */

function buildResearch(typeSlug: string, myDate: string, go: (path: string) => void): (sectionId: string) => ResearchCardProps | null {
  const pairTo = (slug: string, title: string, text: string, label: string): ResearchCardProps => ({
    title,
    text,
    dateLabel: label,
    onDate: (iso) => go(readingPath(slug, [myDate, iso])),
  });
  const singleTo = (slug: string, title: string, text: string, label: string): ResearchCardProps => ({
    title,
    text,
    dateLabel: label,
    onDate: (iso) => go(readingPath(slug, [iso])),
  });
  const linkTo = (href: string, title: string, text: string, linkLabel: string): ResearchCardProps => ({ title, text, href, linkLabel });

  return (sectionId) => {
    switch (sectionId) {
      case "relations":
        return pairTo("sovmestimost", "Посмотреть эту линию в паре", "Сценарий в любви виден по-настоящему только рядом с конкретным человеком. Введите дату партнёра — совместимость посчитается с вашей матрицей.", "Дата рождения партнёра");
      case "family":
        return singleTo("detskaya", "Матрица ребёнка", "Что вы передаёте — видно с вашей стороны. С чем ребёнок пришёл сам — с его.", "Дата рождения ребёнка");
      case "karma":
        return singleTo("matrica", "Матрица родителей", "Урок, который повторяется, часто виден в матрице мамы или папы раньше, чем в вашей.", "Дата рождения родителя");
      case "money":
        return typeSlug === "dengi"
          ? null
          : linkTo(readingPath("dengi", [myDate]), "Полный финансовый разбор", "Денежный канал, способ заработка, отношение к тратам и программа рода — в одном разборе по той же дате.", "Открыть финансовый разбор");
      case "work":
        return pairTo("biznes", "Бизнес-совместимость", "Кто двигает дело, кто удерживает и где начнётся борьба — считается по двум датам.", "Дата рождения делового партнёра");
      case "personality":
      case "health":
        return linkTo("/nastavnik", "Спросить наставника", "Наставник видит ваши числа и отвечает на вопрос, а не на аркан. Первые сообщения бесплатно.", "Задать вопрос");
      case "purpose":
        return linkTo(readingPath("prognoz", [myDate]), "Личный год", "Предназначение раскрывается по частям. Что за задача у ближайших двенадцати месяцев — в прогнозе.", "Открыть личный год");
      case "resource":
        return linkTo(readingPath("prognoz", [myDate]), "Прогноз", "Аркан дня, энергия периода и когда он сменится.", "Открыть прогноз");
      case "year":
      case "forecast":
        return linkTo("/cabinet", "Аркан дня каждый вечер", "В кабинете аркан на завтра приходит сам — на сайте и в Telegram. Утренний экран и вечернее сообщение совпадают.", "В кабинет");
      default:
        return null;
    }
  };
}
