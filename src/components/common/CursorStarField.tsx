"use client";

import { useEffect, useState, useRef } from "react";
import { useIsMobile, useReducedMotion } from "@/hooks/use-reduced-motion";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Физика слежения — не менять. */
const RADIUS = 420;
const MAX_SHIFT = 90;
const MIN_DIST = 30;
const EASE = 0.08;

type Star = {
  /** домашняя позиция в процентах */
  left: number;
  top: number;
  size: number;
  opacity: number;
};

function buildStars(count: number): Star[] {
  const clusters = Array.from({ length: Math.floor(rand(5, 7)) }, () => ({
    x: rand(0, 100),
    y: rand(0, 100),
    spread: rand(5, 12),
  }));
  const clustered = Math.round(count * 0.7);
  const bright = 6;
  const mid = 20;

  return Array.from({ length: count }, (_, i) => {
    let x: number;
    let y: number;
    if (i < clustered) {
      const c = clusters[Math.floor(Math.random() * clusters.length)]!;
      x = c.x + gauss() * c.spread;
      y = c.y + gauss() * c.spread;
    } else {
      x = rand(0, 100);
      y = rand(0, 100);
    }
    let size = 1.2;
    let opacity = 0.25;
    if (i < bright) {
      size = 3.2;
      opacity = 0.85;
    } else if (i < bright + mid) {
      size = 2.2;
      opacity = 0.5;
    }
    return { left: x, top: y, size, opacity };
  });
}

/**
 * Звёздное поле, следующее за курсором внутри своей секции.
 * Слой абсолютный, pointer-events: none.
 */
export function CursorStarField({
  count = 70,
  opacity = 1,
  className = "",
}: {
  count?: number;
  opacity?: number;
  className?: string;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  // Генерация только на клиенте после гидратации — иначе SSR/клиент
  // получают разные случайные позиции и ломается гидратация страницы.
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    setStars(buildStars(isMobile ? 35 : count));
  }, [count, isMobile]);

  useEffect(() => {
    if (reduced || isMobile) return;
    const layer = layerRef.current;
    if (!layer) return;
    const section = layer.parentElement;
    if (!section) return;

    const nodes = Array.from(layer.children) as HTMLElement[];
    const cur = nodes.map(() => ({ x: 0, y: 0 }));
    const target = nodes.map(() => ({ x: 0, y: 0 }));

    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let stopAt = 0;

    const setWillChange = (on: boolean) => {
      for (const n of nodes) n.style.willChange = on ? "transform" : "";
    };

    const frame = () => {
      const rect = section.getBoundingClientRect();
      let moving = false;

      for (let i = 0; i < nodes.length; i++) {
        if (pointer) {
          const sx = rect.left + (stars[i]!.left / 100) * rect.width;
          const sy = rect.top + (stars[i]!.top / 100) * rect.height;
          const dx = sx - pointer.x;
          const dy = sy - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < RADIUS && dist > 0) {
            const falloff = (1 - dist / RADIUS) ** 2;
            const pull = Math.min(MAX_SHIFT * falloff, Math.max(0, dist - MIN_DIST));
            target[i]!.x = (-dx / dist) * pull;
            target[i]!.y = (-dy / dist) * pull;
          } else {
            target[i]!.x = 0;
            target[i]!.y = 0;
          }
        } else {
          target[i]!.x = 0;
          target[i]!.y = 0;
        }

        const c = cur[i]!;
        c.x += (target[i]!.x - c.x) * EASE;
        c.y += (target[i]!.y - c.y) * EASE;
        if (Math.abs(c.x) > 0.05 || Math.abs(c.y) > 0.05) moving = true;
        nodes[i]!.style.transform = `translate(-50%, -50%) translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)`;
      }

      if (moving || pointer) {
        stopAt = 0;
        raf = requestAnimationFrame(frame);
        return;
      }
      // все звёзды дома — остановка через секунду
      if (!stopAt) stopAt = performance.now();
      if (performance.now() - stopAt < 1000) {
        raf = requestAnimationFrame(frame);
        return;
      }
      raf = 0;
      stopAt = 0;
      setWillChange(false);
    };

    const start = () => {
      if (raf) return;
      setWillChange(true);
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      start();
    };
    const onLeave = () => {
      pointer = null;
      start();
    };

    section.addEventListener("mousemove", onMove);
    section.addEventListener("mouseleave", onLeave);

    return () => {
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      setWillChange(false);
    };
  }, [reduced, isMobile, stars]);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={{ opacity }}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-text-primary"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
