"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  pickHints,
  HINT_DISMISSED_KEY,
  HINT_GAP_MS,
  HINT_MAX_PER_VISIT,
  HINT_MIN_ON_PAGE_MS,
  HINT_QUIET_MS,
  HINT_VISIT_KEY,
  type Hint,
  type HintContext,
} from "@/lib/hints";

/**
 * ОБЛАЧКО-ПОДСКАЗКА.
 *
 * Небольшая карточка внизу страницы, которая помогает сделать следующий
 * шаг. Правила показа жёсткие и заданы заказчиком — это не настройки, а
 * условие того, что подсказка остаётся помощью, а не назойливостью:
 *
 *  - только на страницах разбора: компонент ставится там вручную,
 *    в общий макет он не подключён и сам нигде не появится;
 *  - не раньше полутора минут с момента открытия страницы;
 *  - только когда человек остановился — десять секунд без прокрутки;
 *  - не больше трёх за визит и не чаще одной в две минуты;
 *  - крестик выключает подсказки навсегда и на всех страницах;
 *  - начал прокручивать — подсказка исчезает сама.
 *
 ПОЧЕМУ ОНА НЕ ПЕРЕКРЫВАЕТ СОДЕРЖИМОЕ. Одного отступа снизу мало: он
 * позволяет долистать до конца, но пока человек читает середину, полоса
 * всё равно ложится поверх текста. Поэтому в момент появления делаются
 * два действия сразу: странице добавляется отступ снизу на высоту
 * подсказки и страница прокручивается ровно на эту же высоту. Всё, что
 * человек видел, поднимается над полосой, а полоса занимает
 * освободившееся место. Ничего не скрывается ни на телефоне, ни на
 * широком экране.
 *
 * ЧТО ГДЕ ЗАПОМИНАЕТСЯ. Отказ — в localStorage: он должен пережить и
 * перезагрузку, и завтрашний день. Счётчик показов и список уже
 * показанного — в sessionStorage: «три за визит» и значит за визит.
 */

type Visit = { count: number; lastAt: number; seen: string[] };

const EMPTY_VISIT: Visit = { count: 0, lastAt: 0, seen: [] };

function readVisit(): Visit {
  try {
    const raw = window.sessionStorage.getItem(HINT_VISIT_KEY);
    if (!raw) return EMPTY_VISIT;
    const v = JSON.parse(raw) as Partial<Visit>;
    return {
      count: typeof v.count === "number" ? v.count : 0,
      lastAt: typeof v.lastAt === "number" ? v.lastAt : 0,
      seen: Array.isArray(v.seen) ? v.seen.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return EMPTY_VISIT;
  }
}

function writeVisit(v: Visit) {
  try {
    window.sessionStorage.setItem(HINT_VISIT_KEY, JSON.stringify(v));
  } catch {
    /* приватный режим — подсказка просто не запомнится, это не поломка */
  }
}

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function HintBubble({ place, iso }: HintContext) {
  const [hint, setHint] = useState<Hint | null>(null);
  // Свойства приходят россыпью, а условие собирается заново только при их
  // смене: иначе отсчёт перезапускался бы на каждой перерисовке.
  const ctx = useMemo<HintContext>(() => ({ place, iso }), [place, iso]);
  const box = useRef<HTMLDivElement | null>(null);
  // Прокрутка, сделанная нами самими: свой же обработчик её игнорирует,
  // иначе подсказка спрятала бы себя в момент появления.
  const selfScroll = useRef(0);
  // Часы заводятся в эффекте, а не при первом рендере: `Date.now()` в теле
  // компонента React считает нечистым вызовом — и справедливо, рендер
  // может повториться.
  const openedAt = useRef(0);
  const quietSince = useRef(0);
  const shown = useRef(false);

  const hide = useCallback(() => setHint(null), []);

  // Прокрутка: и отсчёт тишины, и мгновенное исчезновение начатой прокрутки.
  useEffect(() => {
    openedAt.current = Date.now();
    quietSince.current = Date.now();
    const onScroll = () => {
      if (Date.now() < selfScroll.current) return;
      quietSince.current = Date.now();
      if (shown.current) {
        shown.current = false;
        setHint(null);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Раз в секунду проверяем, сошлись ли все условия сразу.
  useEffect(() => {
    if (dismissed()) return;
    const timer = setInterval(() => {
      if (shown.current || dismissed()) return;
      const now = Date.now();
      if (!openedAt.current) return;
      if (now - openedAt.current < HINT_MIN_ON_PAGE_MS) return;
      if (now - quietSince.current < HINT_QUIET_MS) return;

      const visit = readVisit();
      if (visit.count >= HINT_MAX_PER_VISIT) return;
      if (visit.lastAt && now - visit.lastAt < HINT_GAP_MS) return;

      const next = pickHints(ctx, visit.seen)[0];
      if (!next) return;

      shown.current = true;
      setHint(next);
      writeVisit({ count: visit.count + 1, lastAt: now, seen: [...visit.seen, next.id] });
    }, 1000);
    return () => clearInterval(timer);
  }, [ctx]);

  // Пока подсказка видна, страница получает отступ снизу на её высоту —
  // тогда подсказка ничего не закрывает и до низа можно долистать.
  useEffect(() => {
    if (!hint) return;
    const el = box.current;
    if (!el) return;
    let reserved = 0;
    const apply = () => {
      const need = el.offsetHeight + 16;
      document.body.style.paddingBottom = `${need}px`;
      // Освободившееся место надо ещё и открыть: поднимаем страницу ровно
      // на столько, на сколько выросла полоса.
      const delta = need - reserved;
      reserved = need;
      if (delta > 0) {
        selfScroll.current = Date.now() + 400;
        window.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [hint]);

  function dismissForever() {
    try {
      window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
    } catch {
      /* не запомнилось — но эту подсказку всё равно закрываем */
    }
    shown.current = false;
    hide();
  }

  if (!hint) return null;

  const href = hint.action?.href(ctx) ?? null;

  return (
    <div
      ref={box}
      role="complementary"
      aria-label="Подсказка"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-page/95 backdrop-blur"
    >
      <div
        className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-[4vw] py-2.5 md:gap-5 md:px-6"
      >
        <p className="min-w-0 flex-1 text-text-primary md:max-w-[840px]" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
          {hint.text}
          {href && hint.action && (
            <>
              {" "}
              <Link
                href={href}
                onClick={hide}
                className="qc-focus whitespace-nowrap text-text-accent underline underline-offset-4"
              >
                {hint.action.label}
              </Link>
            </>
          )}
        </p>

        <button
          type="button"
          onClick={dismissForever}
          aria-label="Больше не показывать подсказки"
          title="Больше не показывать подсказки"
          className="qc-focus flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-accent/10 hover:text-text-primary"
          style={{ fontSize: 20, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
