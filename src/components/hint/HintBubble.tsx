"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { arcanaImage } from "@/lib/arcanaImage";
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
 * ПОДСКАЗКА-КАРТОЧКА.
 *
 * Карточка в правом нижнем углу шириной с телефон: маленькая
 * иллюстрация аркана, заголовок в одну строку, текст в две, кнопка
 * действия и крестик в углу. Выезжает снизу с затуханием и так же
 * уходит. На телефоне — та же карточка с отступами от краёв, не полоса.
 *
 * Правила показа жёсткие и заданы заказчиком — это не настройки, а
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
 * НИЧЕГО НЕ ПЕРЕКРЫВАЕТ. Карточка живёт в углу, а не поперёк экрана,
 * и уходит при первой же прокрутке. Плавающая кнопка наставника стоит
 * в том же углу — карточка поднимается над ней (по классу `has-fab` на
 * body), а кнопка остаётся на месте.
 *
 * ЧТО ГДЕ ЗАПОМИНАЕТСЯ. Отказ — в localStorage: он должен пережить и
 * перезагрузку, и завтрашний день. Счётчик показов и список уже
 * показанного — в sessionStorage: «три за визит» и значит за визит.
 */

type Visit = { count: number; lastAt: number; seen: string[] };

const EMPTY_VISIT: Visit = { count: 0, lastAt: 0, seen: [] };

/** Сколько длится уход карточки — столько же, сколько анимация в CSS. */
const LEAVE_MS = 240;

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
  const [leaving, setLeaving] = useState(false);
  // Свойства приходят россыпью, а условие собирается заново только при их
  // смене: иначе отсчёт перезапускался бы на каждой перерисовке.
  const ctx = useMemo<HintContext>(() => ({ place, iso }), [place, iso]);
  // Часы заводятся в эффекте, а не при первом рендере: `Date.now()` в теле
  // компонента React считает нечистым вызовом — и справедливо, рендер
  // может повториться.
  const openedAt = useRef(0);
  const quietSince = useRef(0);
  const shown = useRef(false);
  const leaveTimer = useRef<number | null>(null);

  // Уход с затуханием: сначала класс анимации, потом снятие с экрана.
  const hide = useCallback(() => {
    if (!shown.current) return;
    shown.current = false;
    setLeaving(true);
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setHint(null);
      setLeaving(false);
    }, LEAVE_MS);
  }, []);

  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  // Прокрутка: и отсчёт тишины, и мгновенное исчезновение начатой прокрутки.
  useEffect(() => {
    openedAt.current = Date.now();
    quietSince.current = Date.now();
    const onScroll = () => {
      quietSince.current = Date.now();
      hide();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hide]);

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
      setLeaving(false);
      setHint(next);
      writeVisit({ count: visit.count + 1, lastAt: now, seen: [...visit.seen, next.id] });
    }, 1000);
    return () => clearInterval(timer);
  }, [ctx]);

  function dismissForever() {
    try {
      window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
    } catch {
      /* не запомнилось — но эту подсказку всё равно закрываем */
    }
    hide();
  }

  if (!hint) return null;

  const href = hint.action?.href(ctx) ?? null;
  // Якорь на этой же странице — обычной ссылкой: браузер сам прокрутит к
  // элементу и уважит его scroll-margin, а страница пары услышит смену
  // якоря и переключит вкладку.
  const anchor = href?.startsWith("#") ?? false;

  return (
    <div role="complementary" aria-label="Подсказка" className={`hint-card ${leaving ? "hint-card--out" : ""}`}>
      <div className="hint-card-art" aria-hidden="true">
        <img src={arcanaImage(hint.art, "sm")} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="min-w-0">
        <div className="hint-card-title">{hint.title}</div>
        <p className="hint-card-text">{hint.text}</p>
        {href && hint.action && (
          <div className="mt-2.5">
            {anchor ? (
              <a href={href} onClick={hide} className="qc-focus hint-card-btn">
                {hint.action.label}
              </a>
            ) : (
              <Link href={href} onClick={hide} className="qc-focus hint-card-btn">
                {hint.action.label}
              </Link>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={dismissForever}
        aria-label="Больше не показывать подсказки"
        title="Больше не показывать подсказки"
        className="qc-focus hint-card-close"
      >
        ×
      </button>
    </div>
  );
}
