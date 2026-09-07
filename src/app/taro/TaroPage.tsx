"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpreadCard } from "@/components/tarot/SpreadCard";
import { DateField } from "@/components/reading/DateField";
import { NextSteps } from "@/components/next/NextSteps";
import { useGoToReading } from "@/components/reading/CalcTheater";
import { track } from "@/components/analytics/track";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useAuth } from "@/lib/useAuth";
import { arcanaImage } from "@/lib/arcanaImage";
import { isoToUrlDate } from "@/lib/matrix";
import { SPREADS, type DrawnCard, type SpreadId } from "@/lib/tarot";
import { ASK_MAX, ASK_STORAGE_KEY, askReturnPath, bridgeText, cleanQuestion, parseAsk, spreadIdOf } from "@/lib/tarot/ask";
import type { NextShowcase } from "@/lib/nextSteps";

/**
 * ТАРО — /taro. Расклад на вопрос — флагман, карта дня — бесплатный вход.
 *
 * ПЕРВЫЙ ЭКРАН — ВОПРОС, а не дата: заголовок про то, что не даёт покоя,
 * большое поле с живой подсказкой внутри и четыре расклада карточками.
 * Человек начинает печатать до того, как узнал про деньги; цена стоит
 * мелко у каждого расклада — не прячем и не кричим.
 *
 * МОСТ К РЕГИСТРАЦИИ. Гость нажимает «Разложить карты» — это не замок,
 * а предложение: новым при регистрации начисляются пять приветственных
 * кредитов, первого расклада хватает. Вопрос и выбранный вид на время
 * входа лежат в sessionStorage, а после возвращения снова в поле —
 * человек ничего не теряет. Сам вопрос через адрес входа не ходит: это
 * личный текст.
 *
 * Карты тянет сервер криптостойким источником, кредиты списываются там
 * же (см. `api/taro/spread`). Подписка не нужна — только кредиты.
 *
 * Ниже — пример настоящего расклада (честно подписан), три шага, карта
 * дня по дате рождения и витрина «Дальше». Постоянные адреса карты дня
 * `/taro/<дата>` этой страницы не касаются и работают как раньше.
 */

type Kind = { id: SpreadId; title: string; hint: string; cards: number; credits: number };
type State = {
  kinds: Kind[];
  enabled: boolean;
  authorized: boolean;
  plan: boolean;
  credits: number | null;
  demo?: boolean;
};
type Result = { code: string | null; path: string | null; cards: DrawnCard[]; body: string; credits: number };

const FALLBACK: Kind[] = SPREADS.map((s) => ({
  id: s.id,
  title: s.title,
  hint: s.hint,
  cards: s.positions.length,
  credits: s.credits,
}));

/** Иллюстрация и строка «для чего» у каждого вида. */
const KIND_FACE: Record<SpreadId, { art: number; line: string }> = {
  one: { art: 19, line: "быстрый ответ на один вопрос" },
  three: { art: 17, line: "ситуация, помеха, совет" },
  love: { art: 6, line: "пять карт о том, что между двумя" },
  big: { art: 21, line: "десять карт, подробный разбор" },
};

/** Живая подсказка в поле: примеры печатаются сами, по одному. */
const EXAMPLES = [
  "Стоит ли мне менять работу этой осенью?",
  "Почему мы с ним ходим по кругу?",
  "Что я не замечаю в этой ситуации?",
  "Как подойти к разговору с мамой?",
];

/* ─── пример настоящего расклада ────────────────────────────────── */

const EXAMPLE_QUESTION = "Стоит ли мне менять работу этой осенью?";

const EXAMPLE_CARDS: DrawnCard[] = [
  { arcanum: 8, reversed: false, position: { id: "situation", label: "Ситуация" } },
  { arcanum: 12, reversed: true, position: { id: "obstacle", label: "Препятствие" } },
  { arcanum: 1, reversed: false, position: { id: "advice", label: "Совет" } },
];

const EXAMPLE_TEXT = [
  "Вопрос «стоит ли» карты переформулируют: не «уходить или нет», а «что сейчас происходит с работой и от чего зависит решение» — и отвечают на него. В раскладе главное не сама смена места, а то, что решение давно созрело и ждёт не аргументов, а первого шага.",
  "На месте ситуации — Справедливость. Вы уже давно ведёте внутренний счёт: что даёт эта работа и что забирает. Вопрос про осень появился не из-за одного плохого дня, а потому что баланс перестал сходиться, и вы это видите яснее, чем готовы признать. Справедливость здесь про честную оценку, а не про обиду.",
  "На месте препятствия — Повешенный, перевёрнутый. Прямой Повешенный — это пауза, из которой видно больше. Перевёрнутый — пауза, которая затянулась и стала способом не решать. Вы взвешиваете «за» и «против» месяцами, и само взвешивание уже кажется работой над вопросом. Мешает не риск и не осень, а привычка откладывать ясность на потом.",
  "На месте совета — Маг. Всё, что нужно для первого шага, уже под рукой: опыт, знакомства, понимание, чего вы хотите. Маг не советует увольняться завтра — он советует перестать готовиться и сделать одно конкретное действие, по которому станет видно, куда всё идёт.",
  "Назначьте себе срок, а не решение: две недели, за которые вы сделаете три вещи — обновите резюме, поговорите с одним человеком из той области, куда думаете уйти, и честно запишете, чего вам не хватает на нынешнем месте. После этого вопрос «стоит ли» превратится либо в «как», либо в «пока нет» — и оба ответа лучше, чем ещё одна осень взвешивания.",
];

const STEPS = [
  {
    title: "Вопрос",
    text: "Своими словами, как спросили бы близкого. Чем конкретнее вопрос, тем конкретнее ответ",
  },
  {
    title: "Карты",
    text: "Выпадают на сервере один раз, перетянуть нельзя. Перевёрнутые читаются иначе — и показываются перевёрнутыми",
  },
  {
    title: "Трактовка",
    text: "Пишется под ваш вопрос: что происходит, что мешает и в конце — что делать",
  },
];

const FAQ = [
  {
    q: "Сколько стоит расклад",
    a: "Цена в кредитах стоит у каждого расклада. Новому аккаунту при регистрации начисляются пять кредитов — первого расклада хватает. Дальше кредиты приходят с подпиской или покупаются пакетами.",
  },
  {
    q: "Карты правда случайные?",
    a: "Да. Их тянет сервер криптостойким генератором, тем же, каким создают пароли. Перетянуть нельзя: ответ один. Если тянуть до тех пор, пока не выпадет приятное, ответом будет не карта, а нежелание слышать первый вариант.",
  },
  {
    q: "Что если карты выпали тяжёлые",
    a: "Тяжёлая карта — не приговор. Трактовка объясняет, как на неё смотреть, и заканчивается тем, что можно сделать. Если вам сейчас плохо, расклад перестанет говорить про арканы и поможет найти живого человека.",
  },
  {
    q: "Расклад сохраняется?",
    a: "Да, у каждого свой постоянный адрес и место в кабинете. Он остаётся вашим навсегда, в том числе после отмены подписки. В поиск такие страницы не попадают: вопрос — личный.",
  },
  {
    q: "Почему тринадцатый аркан называется Перерождение",
    a: "Так он называется у нас во всех разборах — как и пятнадцатый Искушение и шестнадцатый Обновление. С привычными книжными названиями человек читает не текст, а свой испуг, и до разбора не доходит. Смысл арканов при этом не меняется: тяжёлые остаются тяжёлыми, мы просто не пугаем заголовком.",
  },
];

/* ─── страница ──────────────────────────────────────────────────── */

export default function TaroPage({ showcase }: { showcase: NextShowcase }) {
  const go = useGoToReading();
  // Гость или нет — решает браузер, а не сервер: в демо-режиме сервер
  // не знает, кто вошёл (аккаунты живут в localStorage), а на живом
  // сайте оба источника совпадают.
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<State | null>(null);
  const [kindId, setKindId] = useState<SpreadId>("three");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [bridge, setBridge] = useState(false);
  const [error, setError] = useState<{ text: string; href?: string; link?: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const placeholder = useTypedPlaceholder(question === "");

  // Вопрос и вид — из адреса (наставник, витрина пары, главная) или из
  // запасной копии на время входа. Из адресной строки вопрос стирается
  // сразу: это личный текст, и в Referer ему ходить незачем.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fromUrl = parseAsk(window.location.search);
      let stored: { vid?: string | null; q?: string } | null = null;
      try {
        stored = JSON.parse(window.sessionStorage.getItem(ASK_STORAGE_KEY) ?? "null");
        window.sessionStorage.removeItem(ASK_STORAGE_KEY);
      } catch {
        stored = null;
      }
      const q = fromUrl.q || cleanQuestion(stored?.q);
      const vid = fromUrl.vid ?? spreadIdOf(stored?.vid);
      if (q) setQuestion(q);
      if (vid) setKindId(vid);
      if (window.location.search) window.history.replaceState(null, "", `/taro${window.location.hash}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    loadState().then((d) => {
      if (alive && d) setState(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Расклад появляется ниже кнопки, а на телефоне — за краем экрана.
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const kinds = state?.kinds?.length ? state.kinds : FALLBACK;
  const kind = kinds.find((k) => k.id === kindId) ?? kinds[0];
  const credits = state?.credits ?? null;

  function remember() {
    try {
      window.sessionStorage.setItem(ASK_STORAGE_KEY, JSON.stringify({ vid: kindId, q: cleanQuestion(question) }));
    } catch {
      /* приватный режим — вопрос вернётся хотя бы из адреса */
    }
  }

  async function ask() {
    if (busy) return;
    const q = cleanQuestion(question);
    if (q.length < 3) {
      setError({ text: "Напишите вопрос — хотя бы одной фразой" });
      fieldRef.current?.focus();
      return;
    }
    setError(null);

    const current = state ?? (await loadState());
    const guest = authLoading ? !current?.authorized : !isAuthenticated;
    if (guest) {
      // Гость: не замок, а предложение — и вопрос никуда не денется.
      remember();
      setBridge(true);
      track("spread_bridge", { kind: kindId });
      return;
    }
    setBridge(false);
    setBusy(true);
    setResult(null);
    track("spread_draw", { kind: kindId });

    try {
      const res = await fetch("/api/taro/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kindId, question: q }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) {
        setResult(data as unknown as Result);
        if (typeof data.left === "number") setState((s) => (s ? { ...s, credits: data.left as number } : s));
        return;
      }
      setError(messageFor(res.status, String(data.error ?? ""), Number(data.price ?? 0)));
    } catch {
      setError({ text: "Не удалось связаться с сервером. Попробуйте ещё раз" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ── первый экран: вопрос и четыре расклада ── */}
      <section className="ask-hero relative w-full">
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <div className="mx-auto max-w-[880px] text-center">
            <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(34px, 4.2vw, 64px)", lineHeight: 1.06 }}>
              Спросите карты о том, что не даёт покоя
            </h1>
            <p className="mx-auto mt-4 max-w-[720px] text-text-secondary" style={{ fontSize: "clamp(15px, 1.2vw, 19px)", lineHeight: 1.55 }}>
              Своими словами, как спросили бы близкого. Карты выпадут прямо сейчас, а трактовка будет написана под ваш
              вопрос — не что случится, а как на это посмотреть
            </p>
          </div>

          <form
            className="mx-auto mt-8 w-full max-w-[880px]"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <label htmlFor="ask" className="sr-only">
              Ваш вопрос
            </label>
            <textarea
              id="ask"
              ref={fieldRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, ASK_MAX))}
              placeholder={placeholder}
              rows={3}
              maxLength={ASK_MAX}
              className="qc-focus ask-field"
              aria-describedby="ask-note"
            />
            <p id="ask-note" className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Вопросы вида «что будет» расклад переформулирует в «что происходит и от чего это зависит» — и отвечает на
              переформулированный
            </p>

            <div className="mt-8 flex flex-wrap items-end justify-between" style={{ gap: 12 }}>
              <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Какой расклад
              </div>
              {isAuthenticated && state?.authorized && (
                <div className="text-[14px] text-text-secondary">
                  {credits === null ? "демо · без списаний" : `у вас ${credits} ${creditWord(credits)}`}
                  {credits !== null && (
                    <Link href="/tarify#credits" className="ml-2 text-text-accent underline-offset-4 hover:underline">
                      докупить
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="ask-kinds mt-3" role="radiogroup" aria-label="Какой расклад">
              {kinds.map((k) => {
                const face = KIND_FACE[k.id];
                const on = k.id === kindId;
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setKindId(k.id)}
                    className="qc-focus ask-kind"
                  >
                    <span className="ask-kind-art" aria-hidden="true">
                      <img src={arcanaImage(face.art, "sm")} alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className="min-w-0">
                      <span className="ask-kind-title">{k.title}</span>
                      <span className="ask-kind-line">{face.line}</span>
                      <span className="ask-kind-price">
                        {k.credits} {creditWord(k.credits)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-center" style={{ gap: 12 }}>
              <button type="submit" className="qc-focus ask-btn" disabled={busy}>
                {busy ? "Тянем карты…" : "Разложить карты"}
              </button>
              <p className="text-center text-text-secondary" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                {kind ? `${kind.title} · ${kind.credits} ${creditWord(kind.credits)}. ` : ""}
                Карты выпадают один раз, перетянуть нельзя
              </p>
              {busy && (
                <p className="text-center text-text-secondary" style={{ fontSize: 13 }}>
                  Текст пишется под ваш вопрос — это занимает до полуминуты
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-5 text-center text-[14px] text-text-danger">
                {error.text}
                {error.href && (
                  <Link href={error.href} className="ml-2 text-text-accent underline-offset-4 hover:underline">
                    {error.link}
                  </Link>
                )}
              </p>
            )}

            {bridge && !result && kind && (
              <div className="ask-bridge mx-auto mt-6 max-w-[640px]" role="status">
                <p className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.8vw, 26px)", lineHeight: 1.2 }}>
                  {bridgeText(kind.credits)}
                </p>
                <p className="mt-2 text-text-secondary" style={{ fontSize: 14.5, lineHeight: 1.55 }}>
                  Вопрос и выбранный расклад сохранятся — после входа вы вернётесь сюда же
                </p>
                <div className="mt-4 flex flex-col sm:flex-row" style={{ gap: 10 }}>
                  <Link href={askReturnPath(kindId, "register")} onClick={remember} className="qc-focus next-btn sm:w-auto">
                    Создать профиль
                  </Link>
                  <Link href={askReturnPath(kindId, "login")} onClick={remember} className="qc-focus next-btn next-btn--ghost sm:w-auto">
                    Войти
                  </Link>
                </div>
              </div>
            )}
          </form>

          {/* ── расклад ── */}
          {result && (
            <section
              ref={resultRef}
              className="mx-auto mt-10 max-w-[880px] scroll-mt-28 rounded-[18px] border border-border bg-surface-1"
              style={{ padding: "clamp(18px, 3vw, 28px)" }}
            >
              <div className="flex flex-wrap justify-center" style={{ gap: 18 }}>
                {result.cards.map((card, i) => (
                  <SpreadCard key={`${card.position.id}-${i}`} card={card} width={112} />
                ))}
              </div>
              <Interpretation body={result.body} />
              {result.path && (
                <p className="mt-8 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Расклад сохранён.{" "}
                  <Link href={result.path} className="text-text-accent underline-offset-4 hover:underline">
                    Его постоянный адрес
                  </Link>{" "}
                  и место в{" "}
                  <Link href="/cabinet#spreads" className="text-text-accent underline-offset-4 hover:underline">
                    кабинете
                  </Link>{" "}
                  — вернуться и перечитать можно в любой момент, в том числе после отмены подписки
                </p>
              )}
            </section>
          )}
        </div>
      </section>

      {/* ── пример настоящего расклада ── */}
      <section className="ask-band">
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <div className="mx-auto max-w-[880px]">
            <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
              <span className="next-tag" style={{ marginBottom: 0 }}>
                пример
              </span>
              <span className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Три карты · настоящий вопрос
              </span>
            </div>
            <h2 className="mt-3 font-display text-text-primary" style={{ fontSize: "clamp(26px, 2.8vw, 44px)", lineHeight: 1.1 }}>
              «{EXAMPLE_QUESTION}»
            </h2>
            <div className="mt-8 flex flex-wrap justify-center" style={{ gap: 22 }}>
              {EXAMPLE_CARDS.map((card) => (
                <SpreadCard key={card.position.id} card={card} width={132} />
              ))}
            </div>
            <Interpretation body={EXAMPLE_TEXT.join("\n")} />
            <p className="mt-6 text-text-secondary" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              Это пример: вопрос и карты настоящие, а текст написан так же, как пишется для вас — под вопрос и без
              предсказаний. Ваш расклад будет про вашу ситуацию
            </p>
          </div>
        </div>
      </section>

      {/* ── как это работает ── */}
      <section className="ask-how">
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <h2 className="text-center font-display text-text-primary" style={{ fontSize: "clamp(28px, 3vw, 48px)", lineHeight: 1.08 }}>
            Как это работает
          </h2>
          <div className="ask-steps mt-10">
            {STEPS.map((s, i) => (
              <div key={s.title} className="ask-step">
                <div className="font-mono text-text-accent" style={{ fontSize: "clamp(26px, 2.2vw, 40px)", lineHeight: 1 }}>
                  0{i + 1}
                </div>
                <h3 className="mt-3 font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 28px)", lineHeight: 1.15 }}>
                  {s.title}
                </h3>
                <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.55 }}>
                  {s.text}
                </p>
              </div>
            ))}
          </div>
          <p
            className="mx-auto mt-12 max-w-[760px] text-center font-display text-text-primary"
            style={{ fontSize: "clamp(21px, 2.1vw, 32px)", lineHeight: 1.25 }}
          >
            Карты не предсказывают события — они помогают увидеть ситуацию целиком
          </p>
          <p className="mx-auto mt-4 max-w-[680px] text-center text-text-secondary/80" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            Расклад не заменяет врача, юриста и психолога. Если вам сейчас тяжело — он перестанет говорить про арканы и
            поможет найти живого человека
          </p>
        </div>
      </section>

      {/* ── карта дня: бесплатный вход ── */}
      <section className="ask-day">
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <div className="ask-day-card">
            <div className="min-w-0">
              <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">Бесплатный вход</div>
              <h2 className="mt-2 font-display text-text-primary" style={{ fontSize: "clamp(26px, 2.6vw, 40px)", lineHeight: 1.1 }}>
                Не готовы к вопросу?
              </h2>
              <p className="mt-3 text-text-secondary" style={{ fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.55 }}>
                Ваша карта дня по дате рождения — бесплатно. Один аркан на сегодня с трактовкой; меняется в полночь по
                Москве, адрес у страницы постоянный
              </p>
            </div>
            <div className="w-full">
              <DateField
                label="Дата рождения"
                submitLabel="Показать карту дня"
                onSubmit={(iso) => {
                  track("calc_submit", { direction: "tarot" });
                  go(`/taro/${isoToUrlDate(iso)}`);
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── вопросы ── */}
      <section className="ask-faq">
        <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
          <h2 className="text-center font-display text-text-primary" style={{ fontSize: "clamp(28px, 3vw, 48px)", lineHeight: 1.08 }}>
            Вопросы о раскладе
          </h2>
          <div className="mx-auto mt-10 w-full max-w-[860px]">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-border/35">
                <summary className="qc-focus flex cursor-pointer list-none items-start justify-between gap-6 py-[20px] text-text-primary">
                  <span style={{ fontSize: 17 }}>{item.q}</span>
                  <span className="relative mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center text-text-accent" aria-hidden="true">
                    <span className="absolute transition-opacity duration-200 ease-out group-open:opacity-0">+</span>
                    <span className="absolute opacity-0 transition-opacity duration-200 ease-out group-open:opacity-100">−</span>
                  </span>
                </summary>
                <div className="pb-[20px]">
                  <p className="text-text-secondary" style={{ fontSize: 16, lineHeight: 1.6 }}>
                    {item.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6" style={{ paddingBottom: "clamp(56px, 8vh, 110px)" }}>
        <NextSteps showcase={showcase} />
      </div>
    </>
  );
}

/* ─── части ─────────────────────────────────────────────────────── */

/**
 * Текст расклада абзацами. Последний абзац по промпту — то, что можно
 * сделать: он выделен блоком «Что делать», чтобы его не пролистали.
 */
function Interpretation({ body }: { body: string }) {
  const paragraphs = body
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const todo = paragraphs.length >= 2 ? paragraphs[paragraphs.length - 1] : null;
  const rest = todo ? paragraphs.slice(0, -1) : paragraphs;
  return (
    <div className="mt-8 flex flex-col" style={{ gap: 14 }}>
      {rest.map((p, i) => (
        <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
          {p}
        </p>
      ))}
      {todo && (
        <div className="ask-todo">
          <div className="text-text-accent" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Что делать
          </div>
          <p className="mt-2 text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
            {todo}
          </p>
        </div>
      )}
    </div>
  );
}

async function loadState(): Promise<State | null> {
  try {
    const r = await fetch("/api/taro/spread", { cache: "no-store" });
    return r.ok ? ((await r.json()) as State) : null;
  } catch {
    return null;
  }
}

/**
 * Подсказка в поле печатается сама: пример вопроса набирается по букве,
 * держится, стирается, и на его место приходит следующий. Только пока
 * поле пустое; при отключённой анимации — первый пример без движения.
 */
function useTypedPlaceholder(active: boolean): string {
  const reduced = useReducedMotion();
  const [text, setText] = useState(EXAMPLES[0]);

  useEffect(() => {
    if (!active || reduced) return;
    let index = 0;
    let pos = EXAMPLES[0].length;
    let phase: "type" | "hold" | "erase" = "hold";
    let timer = 0;

    const tick = () => {
      const full = EXAMPLES[index];
      if (phase === "type") {
        pos += 1;
        setText(full.slice(0, pos));
        if (pos >= full.length) {
          phase = "hold";
          timer = window.setTimeout(tick, 2400);
        } else {
          timer = window.setTimeout(tick, 48);
        }
      } else if (phase === "hold") {
        phase = "erase";
        timer = window.setTimeout(tick, 40);
      } else {
        pos -= 1;
        setText(full.slice(0, pos));
        if (pos <= 0) {
          index = (index + 1) % EXAMPLES.length;
          phase = "type";
          timer = window.setTimeout(tick, 500);
        } else {
          timer = window.setTimeout(tick, 18);
        }
      }
    };
    timer = window.setTimeout(tick, 1800);
    return () => window.clearTimeout(timer);
  }, [active, reduced]);

  return text;
}

/** Что показать вместо кода ошибки. Каждый случай — с выходом, а не тупиком. */
function messageFor(status: number, error: string, price: number): { text: string; href?: string; link?: string } {
  if (status === 401) return { text: "Войдите, чтобы сделать расклад", href: "/login?next=%2Ftaro", link: "Войти" };
  if (error === "no_credits") {
    return {
      text: `Не хватает кредитов: нужно ${price} ${creditWord(price)}`,
      href: "/tarify#credits",
      link: "Докупить",
    };
  }
  if (error === "llm_off") return { text: "Нейросеть пока не подключена, расклад написать нечем. Кредиты не списаны" };
  if (error === "unavailable") return { text: "Этот расклад сейчас недоступен. Выберите другой" };
  if (error === "empty_question") return { text: "Напишите вопрос — хотя бы одной фразой" };
  if (error === "generation") return { text: "Не удалось написать расклад. Кредиты вернулись на счёт, попробуйте ещё раз" };
  return { text: "Что-то пошло не так. Кредиты за неудачный расклад не списываются" };
}

function creditWord(n: number): string {
  const last = n % 10;
  const tens = n % 100;
  if (tens >= 11 && tens <= 14) return "кредитов";
  if (last === 1) return "кредит";
  if (last >= 2 && last <= 4) return "кредита";
  return "кредитов";
}
