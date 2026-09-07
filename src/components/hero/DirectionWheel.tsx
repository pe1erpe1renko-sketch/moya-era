"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { directions } from "@/lib/directions";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const STEP = 60;
const COUNT = directions.length;

type Metrics = { centerX: number; centerY: number; r: number; mobile: boolean; cardH: number | null };

/** Зазор между карточкой и тем, что вокруг неё, на телефоне. */
const CARD_GAP = 16;

/**
 * На телефоне высота активной карточки считается от свободного места:
 * между низом шапки и верхом заголовка первого экрана. Раньше она была
 * долей ширины экрана и на невысоких телефонах (360×640, 360×780)
 * садилась поверх заголовка «Итог общий» — ссылка «Открыть» лежала на
 * буквах. Заголовок стоит от низа экрана, шапка — от верха, а карточка
 * между ними и должна целиком помещаться в этот промежуток с зазором.
 */
function mobileCardHeight(vw: number, vh: number): { cardH: number; apexY: number } {
  const wanted = Math.min(0.56 * vw, 0.32 * vh) * 1.45;
  const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 76;
  const text = document.querySelector(".hero-text-block")?.getBoundingClientRect().top ?? vh * 0.55;
  const room = text - CARD_GAP - (header + CARD_GAP);
  const cardH = Math.max(120, Math.min(wanted, room));
  // Карточка стоит вплотную под шапкой: так остаётся больше места, а
  // ниже неё всё равно только заголовок.
  return { cardH, apexY: header + CARD_GAP + cardH / 2 };
}

function computeMetrics(): Metrics {
  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const mobile = vw < 768;
  const r = mobile ? 0.85 * vw : 0.62 * vh;
  const fit = mobile ? mobileCardHeight(vw, vh) : null;
  const apexY = fit ? fit.apexY : 0.44 * vh;
  return {
    r,
    centerX: (mobile ? 0.5 : 0.3) * vw,
    centerY: apexY + r,
    mobile,
    cardH: fit ? fit.cardH : null,
  };
}

/**
 * Координата в стилях — с двумя знаками после запятой.
 *
 * Не ради красоты: браузер хранит inline-стили с точностью до сотых, и
 * React при гидратации сравнивает своё «-51.24217531171661px» с
 * браузерным «-51.2422px», считает это расхождением и пишет в консоль на
 * каждой загрузке главной. Число, которое сериализуется без потерь,
 * совпадает само с собой.
 */
const px = (v: number) => Math.round(v * 100) / 100;

/** wrap into (-180, 180] */
const wrapDeg = (v: number) => {
  let a = ((v % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
};

export function DirectionWheel() {
  const reduced = useReducedMotion();
  const router = useRouter();
  // SSR-safe initial state: always render desktop metrics on the first pass
  // to avoid hydration mismatch. Client-side resize effect updates it after mount.
  const [metrics, setMetrics] = useState<Metrics>({
    r: 0.62 * 900,
    centerX: 0.3 * 1440,
    centerY: 0.44 * 900 + 0.62 * 900,
    mobile: false,
    cardH: null,
  });
  const [offset, setOffset] = useState(0);
  const [duration, setDuration] = useState(650);
  const [interacting, setInteracting] = useState(false);
  const drag = useRef<{ active: boolean; lastX: number; moved: boolean }>({
    active: false,
    lastX: 0,
    moved: false,
  });
  const offsetRef = useRef(0);
  offsetRef.current = offset;

  useEffect(() => {
    const onResize = () => setMetrics(computeMetrics());
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // stepped auto-rotation: 2800ms pause, then one 60° step over 650ms
  useEffect(() => {
    if (reduced || interacting) return;
    const id = setInterval(() => {
      setDuration(650);
      setOffset((o) => o - STEP);
    }, 3450);
    return () => clearInterval(id);
  }, [reduced, interacting]);

  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pause = useCallback(() => {
    if (resume.current) clearTimeout(resume.current);
    setInteracting(true);
  }, []);
  const scheduleResume = useCallback((delay = 2000) => {
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => setInteracting(false), delay);
  }, []);

  const snap = useCallback(() => {
    setDuration(400);
    setOffset((o) => Math.round(o / STEP) * STEP);
  }, []);

  /** Rotate so card `i` lands in the active slot, shortest way. Never queued. */
  const goTo = useCallback(
    (i: number) => {
      pause();
      setDuration(650);
      setOffset((o) => o - wrapDeg(o + i * STEP));
      scheduleResume(6000);
    },
    [pause, scheduleResume],
  );


  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { active: true, lastX: e.clientX, moved: false };
    pause();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.lastX;
    if (Math.abs(dx) > 1) drag.current.moved = true;
    drag.current.lastX = e.clientX;
    setDuration(0);
    setOffset((o) => o + dx * 0.25);
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    snap();
    scheduleResume();
  };

  const openDirection = () => {
    const d = directions[activeIndex];
    if (d) router.push(d.path);
  };

  const activate = (i: number, isActive: boolean) => {
    if (drag.current.moved) return;
    if (isActive) openDirection();
    else goTo(i);
  };



  const activeIndex = (() => {
    let best = 0;
    let bestAbs = Infinity;
    for (let i = 0; i < COUNT; i++) {
      const a = Math.abs(wrapDeg(offsetRef.current + i * STEP));
      if (a < bestAbs) {
        bestAbs = a;
        best = i;
      }
    }
    return best;
  })();

  const { centerX, centerY, r, mobile } = metrics;
  // На телефоне ширина выводится из высоты, а высота — из свободного
  // места (см. mobileCardHeight); пропорция карточки 1 : 1,45.
  const side = mobile ? (metrics.cardH ? `${Math.round(metrics.cardH / 1.45)}px` : "min(56vw, 32vh)") : "var(--hero-card)";

  return (
    <div
      className="absolute inset-0 h-screen w-screen touch-none select-none overflow-hidden"
      onPointerEnter={pause}
      onPointerLeave={() => {
        endDrag();
        scheduleResume();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* visible orbit line, clipped by the screen edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full border"
        style={{
          width: r * 2,
          height: r * 2,
          left: centerX,
          top: centerY,
          transform: "translate(-50%, -50%)",
          borderColor: "var(--border)",
          borderWidth: 1,
          opacity: 0.35,
        }}
      />

      {/* orbit dots, under the cards */}
      {directions.map((d, i) => {
        const angle = offset + i * STEP;
        const rad = (angle * Math.PI) / 180;
        const x = px(centerX + r * Math.sin(rad));
        const y = px(centerY - r * Math.cos(rad));
        const isActive = i === activeIndex;
        const size = isActive ? 10 : 8;
        return (
          <div
            key={`dot-${d.id}`}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              backgroundColor: isActive ? "var(--text-accent)" : "var(--surface-2)",
              opacity: isActive ? 1 : 0.6,
              transition: `left ${duration}ms ease-out, top ${duration}ms ease-out, width 400ms ease-out, height 400ms ease-out, background-color 400ms ease-out, opacity 400ms ease-out`,
            }}
          />
        );
      })}

      {directions.map((d, i) => {
        const angle = offset + i * STEP;
        const rad = (angle * Math.PI) / 180;
        const x = px(centerX + r * Math.sin(rad));
        const y = px(centerY - r * Math.cos(rad));
        const isActive = i === activeIndex;
        return (
          <div
            key={d.id}
            role="button"
            tabIndex={0}
            aria-current={isActive}
            aria-label={d.title}
            onClick={() => activate(i, isActive)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (isActive) openDirection();
                else goTo(i);
              }
            }}
            className="wheel-card absolute cursor-pointer"
            style={{
              left: x,
              top: y,
              transform: `translate(-50%, -50%)${isActive ? "" : " scale(0.55)"}`,
              opacity: isActive ? 1 : 0.35,
              filter: isActive ? "none" : "blur(2px)",
              transition: `left ${duration}ms ease-out, top ${duration}ms ease-out, transform 400ms ease-out, opacity 400ms ease-out, filter 400ms ease-out`,
              width: side,
              // На телефоне карточка выше, чем шире: иначе заголовок и описание
              // ложатся на иллюстрацию (проверено на 390×844).
              height: mobile ? (metrics.cardH ? metrics.cardH : `calc(${side} * 1.45)`) : side,
            }}
          >

            <div
              className="bg-surface-1 relative h-full w-full overflow-hidden border"
              style={{
                borderColor: "var(--border)",
                borderRadius: 20,
                borderWidth: 1,
              }}
            >
              <img
                src={d.image}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    mobile
                      ? "linear-gradient(to bottom, rgba(3, 25, 30, 0) 30%, rgba(3, 25, 30, 0.6) 50%, rgba(3, 25, 30, 0.92) 68%, rgba(3, 25, 30, 0.98) 100%)"
                      : "linear-gradient(to bottom, rgba(3, 25, 30, 0) 40%, rgba(3, 25, 30, 0.55) 60%, rgba(3, 25, 30, 0.88) 78%, rgba(3, 25, 30, 0.97) 100%)",
                }}
              />

              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col justify-end text-left"
                style={{ padding: mobile ? 18 : 32 }}
              >
                <h2
                  className="font-display text-text-primary leading-tight"
                  style={{ fontSize: mobile ? 22 : "clamp(24px, 2.1vw, 40px)", letterSpacing: "0.01em", fontWeight: 400 }}
                >
                  {d.title}
                </h2>
                {isActive && (
                  <>
                    <p
                      className="text-text-secondary leading-snug"
                      style={{ fontSize: mobile ? 14 : "clamp(14px, 1.1vw, 19px)", marginTop: mobile ? 4 : 8 }}
                    >
                      {d.desc}
                    </p>
                    <button
                      type="button"
                      className="text-text-accent self-start bg-transparent hover:underline"
                      style={{ fontSize: mobile ? 14 : "clamp(14px, 1.1vw, 19px)", marginTop: mobile ? 10 : 16 }}
                    >
                      Открыть
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
