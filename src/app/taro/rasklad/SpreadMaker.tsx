"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { SpreadCard } from "@/components/tarot/SpreadCard";
import { track } from "@/components/analytics/track";
import { SPREADS, type DrawnCard, type SpreadId } from "@/lib/tarot";

/**
 * ВЫБОР ВИДА, ВОПРОС И КАРТЫ.
 *
 * Карты тянет сервер: криптостойкий источник и списание кредитов там,
 * где их нельзя подделать. Здесь — только выбор, вопрос и показ.
 *
 * Цены приходят с сервера, а не берутся из кода: они лежат в базе рядом
 * с тарифами. Пока ответ не пришёл, показываются запасные — цифра на
 * кнопке не должна мигать пустотой.
 *
 * БЕЗ ПОДПИСКИ РАСКЛАДА НЕ БУДЕТ, и страница говорит об этом сразу, до
 * вопроса, а не после нажатия. Обещать и отнимать — худшее, что можно
 * сделать с человеком, который уже сформулировал тяжёлый вопрос.
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

const MAX_QUESTION = 500;

export default function SpreadMaker() {
  const [state, setState] = useState<State | null>(null);
  const [kindId, setKindId] = useState<SpreadId>("three");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; href?: string; link?: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Расклад появляется ниже кнопки, а на телефоне — за краем экрана.
  // Без прокрутки человек нажимает и видит, что «ничего не произошло».
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  // Витрина на странице пары ведёт сразу к раскладу об отношениях:
  // /taro/rasklad?vid=love. Параметр читается один раз, при открытии.
  useEffect(() => {
    const vid = new URLSearchParams(window.location.search).get("vid");
    if (vid && SPREADS.some((s) => s.id === vid)) setKindId(vid as SpreadId);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/taro/spread", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setState(d as State);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const kinds = state?.kinds?.length ? state.kinds : FALLBACK;
  const kind = kinds.find((k) => k.id === kindId) ?? kinds[0];
  const credits = state?.credits ?? null;
  const notEnough = credits !== null && kind ? credits < kind.credits : false;

  async function draw() {
    if (busy || question.trim().length < 3) return;
    setBusy(true);
    setError(null);
    setResult(null);
    track("spread_draw", { kind: kindId });

    try {
      const res = await fetch("/api/taro/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kindId, question: question.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (res.ok) {
        setResult(data as unknown as Result);
        if (typeof data.left === "number") {
          setState((s) => (s ? { ...s, credits: data.left as number } : s));
        }
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
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>

      <div className="mx-auto w-[min(880px,92vw)]" style={{ paddingTop: "clamp(24px, 4vh, 56px)", paddingBottom: "clamp(56px, 8vh, 110px)" }}>
        <div className="flex flex-wrap items-end justify-between" style={{ gap: 16 }}>
          <div>
            <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(28px, 3vw, 46px)", lineHeight: 1.08 }}>
              Расклад на ваш вопрос
            </h1>
            <p className="mt-3 max-w-[560px] text-text-secondary" style={{ fontSize: "clamp(14px, 1.1vw, 17px)", lineHeight: 1.6 }}>
              Двадцать два старших аркана. Расклад объясняет, как посмотреть на ситуацию, а не что случится
            </p>
          </div>
          {state?.authorized && (
            <div className="text-[14px] text-text-secondary">
              {credits === null ? "демо · без списаний" : `${credits} ${creditWord(credits)}`}
              {credits !== null && (
                <Link href="/tarify#credits" className="ml-2 text-text-accent underline-offset-4 hover:underline">
                  докупить
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── выбор вида ── */}
        <fieldset className="mt-8 border-0 p-0">
          <legend className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Какой расклад
          </legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {kinds.map((k) => (
              <label
                key={k.id}
                className={`flex cursor-pointer items-start rounded-[14px] border transition-colors ${
                  k.id === kindId ? "border-text-accent bg-accent/10" : "border-border hover:border-text-accent/60"
                }`}
                style={{ padding: 16, gap: 12 }}
              >
                <input
                  type="radio"
                  name="spread-kind"
                  value={k.id}
                  checked={k.id === kindId}
                  onChange={() => setKindId(k.id)}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between" style={{ gap: 8 }}>
                    <span className="text-text-primary" style={{ fontSize: 16 }}>
                      {k.title}
                    </span>
                    <span className="text-text-accent" style={{ fontSize: 14 }}>
                      {k.credits} {creditWord(k.credits)}
                    </span>
                  </span>
                  <span className="mt-1 block text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {/* У «Одной карты» число уже стоит в названии — второй
                        раз его писать незачем. */}
                    {k.cards === 1 ? k.hint : `${k.cards} ${k.cards < 5 ? "карты" : "карт"} · ${k.hint}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── вопрос ── */}
        <div className="mt-8">
          <label htmlFor="spread-question" className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Ваш вопрос
          </label>
          <textarea
            id="spread-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
            placeholder="Своими словами. Чем конкретнее вопрос, тем конкретнее ответ"
            rows={3}
            maxLength={MAX_QUESTION}
            className="qc-focus mt-3 w-full rounded-[14px] border border-border bg-surface-1 text-text-primary focus:border-text-accent"
            style={{ padding: 14, fontSize: 16, lineHeight: 1.55, resize: "vertical" }}
          />
          <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Вопросы вида «что будет» расклад переформулирует в «что происходит и от чего это зависит» — и отвечает на
            переформулированный
          </p>
        </div>

        {/* ── что мешает вытянуть ── */}
        {state && !state.authorized && (
          <Notice text="Расклады делаются в вашем кабинете, чтобы потом их можно было перечитать" href="/login" link="Войти" />
        )}
        {state?.authorized && !state.plan && (
          <Notice
            text="Расклады входят в подписку. Бесплатно в таро — карта дня, она считается по дате рождения и меняется каждый день"
            href="/tarify"
            link="Тарифы"
          />
        )}
        {state?.authorized && state.plan && !state.enabled && (
          <Notice text="Нейросеть пока не подключена, расклад написать нечем. Кредиты за это не спишутся" />
        )}
        {state?.authorized && state.plan && state.enabled && notEnough && kind && (
          <Notice text={`На этот расклад нужно ${kind.credits} ${creditWord(kind.credits)}, а у вас ${credits}`} href="/tarify#credits" link="Докупить" />
        )}

        <button
          type="button"
          onClick={draw}
          disabled={busy || question.trim().length < 3 || !state?.authorized || !state?.plan || !state?.enabled}
          className="qc-focus mt-6 inline-flex items-center justify-center rounded-[14px] bg-accent px-7 text-[16px] font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          style={{ height: 52 }}
        >
          {busy ? "Тянем карты…" : kind ? `Вытянуть карты · ${kind.credits} ${creditWord(kind.credits)}` : "Вытянуть карты"}
        </button>
        {busy && (
          <p className="mt-3 text-text-secondary" style={{ fontSize: 13 }}>
            Текст пишется под ваш вопрос — это занимает до полуминуты
          </p>
        )}

        {error && (
          <p className="mt-4 text-[14px] text-text-danger">
            {error.text}
            {error.href && (
              <Link href={error.href} className="ml-2 text-text-accent underline-offset-4 hover:underline">
                {error.link}
              </Link>
            )}
          </p>
        )}

        {/* ── расклад ── */}
        {result && (
          <section ref={resultRef} className="mt-10 rounded-[18px] border border-border bg-surface-1" style={{ padding: "clamp(18px, 3vw, 28px)" }}>
            <div className="flex flex-wrap justify-center" style={{ gap: 18 }}>
              {result.cards.map((card, i) => (
                <SpreadCard key={`${card.position.id}-${i}`} card={card} width={112} />
              ))}
            </div>

            <div className="mt-8 flex flex-col" style={{ gap: 14 }}>
              {result.body
                .split("\n")
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
                    {p}
                  </p>
                ))}
            </div>

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

        <p className="mt-10 text-text-secondary/80" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Расклад не предсказывает события и не заменяет врача, юриста и психолога. Если вам сейчас тяжело — он
          перестанет говорить про арканы и поможет найти живого человека
        </p>
      </div>

      <Footer />
    </main>
  );
}

function Notice({ text, href, link }: { text: string; href?: string; link?: string }) {
  return (
    <p className="mt-6 rounded-[12px] border border-border bg-surface-1 text-text-secondary" style={{ padding: 14, fontSize: 14, lineHeight: 1.55 }}>
      {text}
      {href && (
        <Link href={href} className="ml-2 text-text-accent underline-offset-4 hover:underline">
          {link}
        </Link>
      )}
    </p>
  );
}

/** Что показать вместо кода ошибки. Каждый случай — с выходом, а не тупиком. */
function messageFor(status: number, error: string, price: number): { text: string; href?: string; link?: string } {
  if (status === 401) return { text: "Войдите, чтобы сделать расклад", href: "/login", link: "Войти" };
  if (error === "no_subscription") return { text: "Расклады входят в подписку", href: "/tarify", link: "Тарифы" };
  if (error === "no_credits") {
    return {
      text: `Не хватает кредитов: нужно ${price} ${creditWord(price)}`,
      href: "/tarify#credits",
      link: "Докупить",
    };
  }
  if (error === "llm_off") return { text: "Нейросеть пока не подключена. Кредиты не списаны" };
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
