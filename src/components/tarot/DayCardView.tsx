"use client";

import { useEffect, useState } from "react";
import { arcanumInfo, moscowDay, type DayCard } from "@/lib/tarot";
import { useSlotTexts } from "@/components/chart/useSlotTexts";
import { Paywall } from "@/components/reading/Paywall";
import { formatBirthDate } from "@/lib/pendingBirth";
import { DayCardFace } from "./DayCardFace";

/**
 * СТРАНИЦА КАРТЫ ДНЯ — /taro/26-07-1990
 *
 * Открыто всем: сама карта, её название и короткая справка. Под замком —
 * разбор «эта карта на фоне вашей карты рождения».
 *
 * Карта считается на сервере и приходит готовой: она одинакова для всех,
 * кто откроет эту дату сегодня, и меняется в московскую полночь. Ничего
 * случайного здесь нет и быть не должно — иначе обновление страницы
 * давало бы новую карту, и вся затея разваливается.
 */

export function DayCardView({
  card,
  initialText,
  changesAt,
}: {
  card: DayCard;
  /** короткая справка, посчитанная на сервере */
  initialText: string | null;
  /** во сколько по Москве сменится карта, «00:00 5 сентября» */
  changesAt: string;
}) {
  const [paywall, setPaywall] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  // Вкладка, открытая со вчерашнего дня, показывала бы вчерашнюю карту —
  // и человек честно решил бы, что карта у всех разная. Проверяем сами:
  // сутки считаются по Москве и в браузере, и на сервере одинаково.
  useEffect(() => {
    const check = () => setStale(moscowDay() !== card.day);
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [card.day]);

  const info = arcanumInfo(card.arcanum);
  const birth = arcanumInfo(card.birthArcanum);

  const { texts, busy, unlocked, load, reset } = useSlotTexts(
    "/api/content/taro",
    { date: card.birth },
    `${card.birth}|${card.day}`,
  );

  useEffect(() => {
    if (unlocked) reset();
  }, [unlocked, reset]);

  const brief = texts["taro_day"];
  const briefText = brief && "text" in brief ? brief.text : initialText;

  const paid = [
    { id: "taro_on", label: "Как этот день ложится на ваше устройство", hint: `${card.arcanum} на ${card.birthArcanum}` },
    { id: "taro_use", label: "Что с этим делать сегодня", hint: undefined },
    { id: "taro_shadow", label: "Обратная сторона этого дня", hint: undefined },
  ];

  return (
    <div className="w-full">
      {stale && (
        <div
          className="mb-6 rounded-[14px] border border-text-accent/50 bg-surface-1"
          style={{ padding: "14px 16px" }}
          role="status"
        >
          <p className="text-text-primary" style={{ fontSize: 15, lineHeight: 1.55 }}>
            Наступил новый день, и карта уже сменилась. На странице пока вчерашняя{" "}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-text-accent underline-offset-4 hover:underline"
            >
              Показать сегодняшнюю
            </button>
          </p>
        </div>
      )}

      <header>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.08 }}>
          Карта дня для {formatBirthDate(card.birth)}
        </h1>
        <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(16px, 1.25vw, 20px)", lineHeight: 1.5 }}>
          Сегодня выпал {card.arcanum}-й аркан — {info.name}. {info.line}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <DayCardFace n={card.arcanum} name={info.name} />

        <div>
          <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Что означает эта карта
          </div>
          {briefText ? (
            <div className="mt-3 flex flex-col" style={{ gap: 12 }}>
              {briefText.split("\n\n").map((p, i) => (
                <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.7 }}>
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
              {info.line}
            </p>
          )}

          <div className="mt-6 rounded-[16px] border border-border bg-surface-1" style={{ padding: "14px 16px" }}>
            <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
              Ваш аркан рождения — {card.birthArcanum}, {birth.name}. Он не меняется всю жизнь, и один и тот же аркан
              дня ложится на него не так, как на любой другой
            </p>
          </div>

          <p className="mt-4 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
            Карта выбрана по дате рождения и сегодняшнему дню, не наугад: у всех, кто открыл эту дату сегодня, она одна
            и та же. Следующая — {changesAt} по московскому времени
          </p>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
          Эта карта на фоне вашей карты рождения
        </h2>
        <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
          Один и тот же аркан дня попадает либо в то, что вам и так даётся, либо в то, чего у вас мало. Три вопроса
          считаются по двум числам сразу — аркану дня {card.arcanum} и аркану рождения {card.birthArcanum}. Открывает
          подписка
        </p>

        <div className="mt-6 flex flex-col" style={{ gap: 10 }}>
          {paid.map((slot) => {
            const value = texts[slot.id];
            const locked = value && "locked" in value;
            const isOpen = open === slot.id;
            return (
              <div key={slot.id} className="rounded-[14px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const next = isOpen ? null : slot.id;
                    setOpen(next);
                    if (next) load([slot.id]);
                    if (next && value && "locked" in value) setPaywall(true);
                  }}
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.4 }}>
                    {slot.label}
                    {slot.hint && (
                      <span className="ml-2 text-text-secondary" style={{ fontSize: 13 }}>
                        · {slot.hint}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-text-accent" style={{ fontSize: 13 }}>
                    {locked ? "замок" : isOpen ? "свернуть" : "открыть"}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-3">
                    {busy.has(slot.id) ? (
                      <p className="text-text-secondary" style={{ fontSize: 15 }}>
                        Пишем разбор…
                      </p>
                    ) : locked ? (
                      <p className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                        Этот вопрос открывается по подписке.{" "}
                        <button
                          type="button"
                          onClick={() => setPaywall(true)}
                          className="text-text-accent underline-offset-4 hover:underline"
                        >
                          Что входит
                        </button>
                      </p>
                    ) : value && "text" in value ? (
                      <div className="flex flex-col" style={{ gap: 12 }}>
                        {value.text.split("\n\n").map((p, i) => (
                          <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
                            {p}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-secondary" style={{ fontSize: 15 }}>
                        Не удалось загрузить текст. Попробуйте ещё раз
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-[16px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
          <p className="text-text-primary" style={{ fontSize: 15, lineHeight: 1.6 }}>
            Завтра карта сменится, и сегодняшняя пропадёт со страницы
          </p>
          <p className="mt-2 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
            По подписке карты не пропадают: сохраняется история за все дни, и по ней видно, какие арканы возвращаются к
            вам чаще других.{" "}
            <button type="button" onClick={() => setPaywall(true)} className="text-text-accent underline-offset-4 hover:underline">
              Что входит в подписку
            </button>
          </p>
        </div>
      </section>

      <Paywall open={paywall} onClose={() => setPaywall(false)} date={card.birth} freeCount={1} totalCount={1 + paid.length} />
    </div>
  );
}
