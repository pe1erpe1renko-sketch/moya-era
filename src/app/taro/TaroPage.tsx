"use client";

import { useCallback, useState } from "react";
import {
  DirectionPage,
  type CalculatorApi,
} from "@/components/direction/DirectionPage";
import { TarotFlipCard } from "@/components/tarot/TarotFlipCard";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { arcana } from "@/lib/arcana";
const tarotAsset = "/images/tarot.png";
import { TAROT_LINES } from "@/lib/directionLines";


type TarotResult = { n: number; question: string; drawKey: number };

const ABOUT_PARAGRAPHS = [
  "В колоде 78 карт: 22 старших аркана описывают крупные состояния и повороты, 56 младших — повседневные обстоятельства. В карте дня участвуют старшие: они говорят не о деталях, а о том, что сейчас главное.",
  "Расклад не отвечает на вопрос «что будет». Он даёт формулировку: карта называет то, что уже происходит, но чего ты пока не проговорил словами.",
  "Поэтому важнее не выпавшая карта, а вопрос. Чем точнее он задан, тем полезнее ответ — половина работы делается до того, как карта перевёрнута.",
  "Карта выбирается случайно. Мы не подстраиваем результат под вопрос и не показываем «хорошие» карты чаще остальных.",
];

const LINES = TAROT_LINES;

const SAMPLE_PARAGRAPHS = [
  "Девятый аркан в ответе на вопрос о работе почти всегда говорит одно: решение не придёт в разговоре. Тебе нужно время наедине с задачей, и попытки ускорить это обсуждением с коллегами дадут обратный эффект — чем больше мнений, тем дальше от собственного ответа.",
  "Это не про изоляцию. Отшельник не уходит от людей, он уходит от шума. В рабочем контексте это чаще всего означает несколько дней без встреч, а не смену команды или увольнение.",
  "Обрати внимание на то, как быстро ты задал этот вопрос. Карта девятого аркана выпадает тем, кто уже знает ответ, но ищет подтверждения снаружи. Если это так, настоящий вопрос звучит иначе, и он про то,",
];

const FAQ = [
  {
    q: "Как выбирается карта",
    a: "Случайно, из 22 старших арканов, с равной вероятностью для каждой. Результат не зависит от вопроса, времени суток и того, платный у тебя тариф или нет.",
  },
  {
    q: "Можно ли тянуть карту несколько раз подряд",
    a: "Технически да, но смысла мало. Если тянуть до тех пор, пока не выпадет приятное, ответом будет не карта, а твоё нежелание слышать первый вариант.",
  },
  {
    q: "Что делать, если карта не подходит к вопросу",
    a: "Это частая ситуация, и обычно она значит, что вопрос задан не о том. Попробуй переформулировать: вместо «что будет с работой» — «что мешает мне решиться».",
  },
  {
    q: "Таро предсказывает будущее",
    a: "Нет. Карта описывает состояние и даёт формулировку тому, что уже происходит. Что с этим делать, остаётся за тобой.",
  },
  {
    q: "Чем Таро отличается от матрицы судьбы",
    a: "Матрица считается из даты рождения и не меняется всю жизнь — это устройство. Таро отвечает на конкретный вопрос сейчас — это состояние. В полном разборе они сопоставляются друг с другом.",
  },
];

function TarotCalculator({ stage, submit }: CalculatorApi<TarotResult>) {
  const [question, setQuestion] = useState("");

  const handleSubmit = () => {
    const n = arcana[Math.floor(Math.random() * arcana.length)]!.n;
    submit({ n, question: question.trim(), drawKey: Date.now() });
  };

  return (
    <>
      <div style={{ marginTop: 32 }}>
        <label className="sr-only" htmlFor="taro-question">
          Твой вопрос
        </label>
        <input
          id="taro-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Например: что мешает мне решиться"
          className="qc-focus w-full text-[17px] text-text-primary transition-colors placeholder:text-text-secondary focus:border-text-accent"
          style={{
            height: 56,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            paddingInline: 16,
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={stage === "loading"}
        className="qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity"
        style={{
          marginTop: 20,
          height: 54,
          paddingInline: 40,
          opacity: stage === "loading" ? 0.4 : 1,
        }}
      >
        {stage === "loading"
          ? "Тяну карту"
          : stage === "result"
            ? "Вытянуть другую"
            : "Вытянуть карту"}
      </button>
    </>
  );
}

export default function TaroPage() {
  const [flipped, setFlipped] = useState(false);
  const handleFlip = useCallback((value: boolean) => setFlipped(value), []);

  return (
    <DirectionPage<TarotResult>
      id="tarot"
      h1="Расклад Таро онлайн"
      heroDescription="Задай вопрос и вытяни карту. Бесплатно, без регистрации, с трактовкой"
      heroImage={tarotAsset}
      heroImageAlt="Расклад Таро онлайн — карта дня"
      aboutTitle="Что даёт расклад"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="ТВОЯ КАРТА"
      linesTitle="Что входит в разбор"
      linesSubtitle="Расклады, история вопросов и связь с остальными системами"
      lines={LINES}
      exampleTitle="Как выглядит трактовка"
      exampleSubtitle="Фрагмент настоящего текста. Вопрос про работу, выпал аркан 9"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный расклад — три карты и связь с твоей матрицей"
      faqTitle="Вопросы о Таро"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Таро говорит про сейчас. Остальные пять описывают устройство и складываются с ним в один профиль"
      finalTitle="Вытяни свою карту"
      finalSubtitle="Один аркан бесплатно, прямо сейчас"
      calculator={(api) => <TarotCalculator {...api} />}
      resultVisual={({ result }) => {
        const card = arcana.find((x) => x.n === result.n);
        return (
          <TarotFlipCard
            n={result.n}
            name={card?.name ?? ""}
            drawKey={result.drawKey}
            onFlip={handleFlip}
          />
        );
      }}
      resultContent={({ result }) => {
        const card = arcana.find((x) => x.n === result.n);
        if (!flipped) {
          return (
            <div data-taro-pre="true">
              <h2
                className="font-display text-text-primary"
                style={{ fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
              >
                Что даёт расклад
              </h2>
              <div
                className="flex flex-col text-text-secondary"
                style={{
                  marginTop: 24,
                  gap: 16,
                  fontSize: "clamp(15px, 1.15vw, 19px)",
                  lineHeight: 1.65,
                }}
              >
                {ABOUT_PARAGRAPHS.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          );
        }

        const text = card?.draw ?? "";

        return (
          <>
            <h2
              className="font-display text-text-primary"
              style={{ marginTop: 8, fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
            >
              {card?.n} · {card?.name}
            </h2>

            {result.question && (
              <p className="text-text-secondary" style={{ marginTop: 10, fontSize: 14 }}>
                Вопрос: {result.question}
              </p>
            )}

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

            <FullReadingButton />
          </>
        );
      }}
    />
  );
}
