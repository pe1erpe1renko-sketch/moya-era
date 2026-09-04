"use client";

import {
  DirectionPage,
  type CalculatorApi,
} from "@/components/direction/DirectionPage";
import { DateCalculator } from "@/components/direction/DateCalculator";
import { DayCardFace } from "@/components/tarot/DayCardFace";
import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { arcanumInfo, dayCardArcanum, moscowDay } from "@/lib/tarot";
import { centralArcanum } from "@/lib/arcana";
import { toIsoDate } from "@/lib/pendingBirth";
const tarotAsset = "/images/tarot.png";
import { TAROT_LINES } from "@/lib/directionLines";

/**
 * ВИТРИНА ТАРО — /taro
 *
 * Показывает карту дня по дате рождения и ведёт на постоянный адрес
 * /taro/26-07-1990, где стоит разбор.
 *
 * Раньше здесь тянулась случайная карта на свободный вопрос. Живой
 * расклад вернётся отдельным этапом, а карта дня со случайностью не
 * уживается: если карта меняется от нажатия кнопки, обещание «у всех
 * сегодня одна карта» перестаёт быть правдой в ту же секунду.
 */

type TarotResult = { n: number; birthArcanum: number; date: { day: number; month: number; year: number } };

const ABOUT_PARAGRAPHS = [
  "В колоде 78 карт: 22 старших аркана описывают крупные состояния и повороты, 56 младших — повседневные обстоятельства. В карте дня участвуют старшие: они говорят не о деталях, а о том, что сейчас главное.",
  "Карта дня не отвечает на вопрос «что будет». Она даёт формулировку: называет то, что уже происходит, но чего вы пока не проговорили словами.",
  "Карта выводится из даты рождения и сегодняшнего дня — не случайно. У всех, кто родился в один день, карта сегодня одна и та же, и обновление страницы её не меняет.",
  "День считается по московскому времени: карта меняется у всех в один момент, в полночь по Москве. Иначе двое в разных поясах спорили бы, у кого сегодня какая карта.",
];

const LINES = TAROT_LINES;

const SAMPLE_PARAGRAPHS = [
  "Девятый аркан на фоне тринадцатого работает необычно. Отшельник просит тишины, а ваш аркан рождения умеет заканчивать — и сегодня это сходится в одну задачу: побыть наедине не с вопросом, а с уже принятым решением, которое вы ещё не назвали вслух.",
  "На деле такой день выглядит буднично. Меньше разговоров, чем обычно, и раздражение от чужих советов сильнее привычного. Это не признак усталости: чем больше мнений вы соберёте сегодня, тем дальше уйдёте от собственного ответа.",
  "Обратная сторона у этого дня одна, и она не про одиночество. Тишину легко перепутать с откладыванием, и тогда день уходит на",
];

const FAQ = [
  {
    q: "Как выбирается карта дня",
    a: "Из даты рождения и сегодняшней даты, арифметически. Ничего случайного: одна и та же дата рождения в один и тот же день всегда даёт один и тот же аркан. Обновление страницы карту не меняет, и от тарифа она не зависит.",
  },
  {
    q: "Когда меняется карта",
    a: "В полночь по московскому времени, у всех одновременно. Так сделано нарочно: если бы день считался по местным часам, двое в разных поясах в один и тот же момент видели бы разные карты.",
  },
  {
    q: "Можно ли вытянуть другую карту, если эта не нравится",
    a: "Нет, и это главное отличие карты дня от расклада. Если тянуть до тех пор, пока не выпадет приятное, ответом будет не карта, а нежелание слышать первый вариант.",
  },
  {
    q: "Почему тринадцатый аркан называется Перерождение",
    a: "Так он называется у нас во всех разборах — как и пятнадцатый Искушение и шестнадцатый Обновление. С привычными книжными названиями человек читает не текст, а свой испуг, и до разбора не доходит. Смысл арканов при этом не меняется: тяжёлые остаются тяжёлыми, мы просто не пугаем заголовком.",
  },
  {
    q: "Чем карта дня отличается от матрицы судьбы",
    a: "Матрица считается из даты рождения и не меняется всю жизнь — это устройство. Карта дня меняется каждый день — это состояние. В полном разборе они сопоставляются: один и тот же аркан дня ложится по-разному на разные арканы рождения.",
  },
];

function TarotCalculator({ stage, submit }: CalculatorApi<TarotResult>) {
  return (
    <DateCalculator
      idPrefix="taro"
      stage={stage}
      onSubmit={(date) => {
        const iso = toIsoDate(date.day, date.month, date.year);
        submit({
          n: dayCardArcanum(iso, moscowDay()),
          birthArcanum: centralArcanum(date.day, date.month, date.year),
          date,
        });
      }}
    />
  );
}

export default function TaroPage() {
  return (
    <DirectionPage<TarotResult>
      id="tarot"
      h1="Карта дня по дате рождения"
      heroDescription="Один аркан на сегодня. Бесплатно, без регистрации, с трактовкой"
      heroImage={tarotAsset}
      heroImageAlt="Карта дня по дате рождения"
      aboutTitle="Что даёт карта дня"
      aboutParagraphs={ABOUT_PARAGRAPHS}
      resultLabel="ВАША КАРТА НА СЕГОДНЯ"
      linesTitle="Что входит в разбор"
      linesSubtitle="Расклады, история карт и связь с остальными системами"
      lines={LINES}
      exampleTitle="Как выглядит трактовка"
      exampleSubtitle="Фрагмент настоящего текста. Аркан дня 9 на аркане рождения 13"
      exampleParagraphs={SAMPLE_PARAGRAPHS}
      exampleFooter="Полный разбор — эта карта на фоне вашей карты рождения"
      faqTitle="Вопросы о карте дня"
      faq={FAQ}
      otherTitle="Эти пять считают тебя иначе"
      otherSubtitle="Карта дня говорит про сегодня. Остальные пять описывают устройство и складываются с ним в один профиль"
      finalTitle="Узнайте свою карту на сегодня"
      finalSubtitle="Одна карта бесплатно, прямо сейчас"
      calculator={(api) => <TarotCalculator {...api} />}
      resultVisual={({ result }) => <DayCardFace n={result.n} name={arcanumInfo(result.n).name} />}
      resultContent={({ result }) => {
        const info = arcanumInfo(result.n);
        const birth = arcanumInfo(result.birthArcanum);
        return (
          <>
            <h2
              className="font-display text-text-primary"
              style={{ marginTop: 8, fontSize: "clamp(28px, 2.6vw, 46px)", lineHeight: 1.1 }}
            >
              {result.n} · {info.name}
            </h2>

            <p className="text-text-secondary" style={{ marginTop: 10, fontSize: 14 }}>
              Ваш аркан рождения — {result.birthArcanum}, {birth.name}
            </p>

            <div className="relative overflow-hidden" style={{ marginTop: 20, height: 240 }}>
              <p
                className="text-text-primary"
                style={{ fontSize: "clamp(16px, 1.25vw, 21px)", lineHeight: 1.7 }}
              >
                {info.line}. Один и тот же аркан дня ложится по-разному на разных людей: он попадает либо в то, что вам
                и так даётся, либо в то, чего у вас мало. Поэтому разбор считается по двум числам сразу — аркану дня и
                аркану рождения, и
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
                direction: "tarot",
              }}
            />
          </>
        );
      }}
    />
  );
}
