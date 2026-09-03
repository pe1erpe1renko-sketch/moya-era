"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SQUARE, DIAMOND, VB, CX, CY, R } from "./octagramGeometry";

/**
 * ТЕАТР ЗАГРУЗКИ.
 * Расчёт мгновенный, но при первом расчёте даты показываем сцену
 * на ~2,3 секунды: фразы сменяются, октаграмма проявляется.
 * Повторно для той же страницы — не показываем (sessionStorage).
 */

const PHRASES = [
  "Соединяюсь с полем вашей матрицы…",
  "Рассчитываю центральный аркан…",
  "Раскладываю числа по точкам…",
  "Собираю разбор…",
];

const DURATION = 2300;

type Ctx = { go: (path: string) => void };
const TheaterCtx = createContext<Ctx>({ go: () => {} });

export function useGoToReading() {
  return useContext(TheaterCtx).go;
}

export function CalcTheaterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [phrase, setPhrase] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);

  const go = useCallback(
    (path: string) => {
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(`seen:${path}`) === "1";
      } catch {
        /* ignore */
      }
      router.prefetch(path);
      if (seen) {
        router.push(path);
        return;
      }
      try {
        window.sessionStorage.setItem(`seen:${path}`, "1");
      } catch {
        /* ignore */
      }
      setTarget(path);
    },
    [router],
  );

  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!target) return;
    const path = target;
    const start = performance.now();
    let finished = false;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / DURATION);
      setProgress(t);
      setPhrase(Math.min(PHRASES.length - 1, Math.floor(t * PHRASES.length)));
      if (t < 1) {
        timer.current = requestAnimationFrame(tick);
        return;
      }
      finished = true;
      routerRef.current.push(path);
      // Если клиентский переход не случился — уходим обычной ссылкой.
      window.setTimeout(() => {
        if (window.location.pathname !== path) window.location.assign(path);
      }, 1500);
      // Оставляем сцену, пока страница не сменится
      window.setTimeout(() => {
        setTarget(null);
        setProgress(0);
        setPhrase(0);
      }, 700);
    };
    timer.current = requestAnimationFrame(tick);
    return () => {
      if (!finished && timer.current) cancelAnimationFrame(timer.current);
    };
  }, [target]);

  const value = useMemo(() => ({ go }), [go]);

  return (
    <TheaterCtx.Provider value={value}>
      {children}
      {target && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-page" role="status" aria-live="polite">
          <svg viewBox={`0 0 ${VB} ${VB}`} className="h-[min(60vw,320px)] w-[min(60vw,320px)]" aria-hidden="true">
            <circle cx={CX} cy={CY} r={R + 20} fill="none" stroke="var(--text-accent)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray={`${Math.PI * 2 * (R + 20)}`} strokeDashoffset={`${Math.PI * 2 * (R + 20) * (1 - progress)}`} style={{ transition: "stroke-dashoffset 120ms linear" }} />
            <polygon points={SQUARE.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--text-accent)" strokeWidth="1" style={{ opacity: Math.min(1, progress * 2) }} />
            <polygon points={DIAMOND.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--text-accent)" strokeWidth="1" style={{ opacity: Math.max(0, Math.min(1, progress * 2 - 0.6)) }} />
            <circle cx={CX} cy={CY} r={10 + progress * 8} fill="var(--accent)" style={{ opacity: Math.max(0, progress * 1.4 - 0.4) }} />
          </svg>
          <p className="mt-8 px-6 text-center font-display text-[clamp(20px,3vw,28px)] text-text-primary">{PHRASES[phrase]}</p>
          <div className="mt-6 h-[2px] w-[min(60vw,320px)] overflow-hidden rounded bg-surface-1">
            <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
    </TheaterCtx.Provider>
  );
}
