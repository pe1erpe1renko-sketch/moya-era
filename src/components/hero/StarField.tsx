"use client";

import { useEffect, useRef } from "react";
import { useIsMobile, useReducedMotion } from "@/hooks/use-reduced-motion";

type Star = {
  /** position relative to field center, in px */
  x: number;
  y: number;
  r: number;
  opacity: number;
  twinklePhase: number;
  twinkling: boolean;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function buildStars(w: number, h: number, count: number): Star[] {
  const clusters = Array.from({ length: Math.floor(rand(7, 10)) }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    spread: rand(w * 0.04, w * 0.1),
  }));

  const stars: Star[] = [];
  const clustered = Math.round(count * 0.7);

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    if (i < clustered) {
      const c = clusters[Math.floor(Math.random() * clusters.length)]!;
      x = c.x + gauss() * c.spread;
      y = c.y + gauss() * c.spread;
    } else {
      x = rand(0, w);
      y = rand(0, h);
    }

    const bright = Math.round(count * (8 / 220));
    const mid = Math.round(count * (40 / 220));
    let r = 0.6;
    let opacity = 0.25;
    if (i < bright) {
      r = 1.6;
      opacity = 0.9;
    } else if (i < bright + mid) {
      r = 1.1;
      opacity = 0.5;
    }

    stars.push({
      x: x - w / 2,
      y: y - h / 2,
      r,
      opacity,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkling: false,
    });
  }

  // exactly 5 stars twinkle at any time
  const shuffled = [...stars].sort(() => Math.random() - 0.5);
  shuffled.slice(0, 5).forEach((s) => (s.twinkling = true));

  return stars;
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const starColor = styles.getPropertyValue("--text-primary").trim() || "#E6F0EF";

    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = buildStars(w, h, isMobile ? 120 : 220);
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const drift = reduced ? 0 : (t / 120) * Math.PI * 2;
      const cos = Math.cos(drift);
      const sin = Math.sin(drift);

      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const x = s.x * cos - s.y * sin + w / 2;
        const y = s.x * sin + s.y * cos + h / 2;
        let opacity = s.opacity;
        if (!reduced && s.twinkling) {
          const k = 0.5 + 0.5 * Math.sin((t / 3) * Math.PI * 2 + s.twinklePhase);
          opacity = s.opacity * (0.35 + 0.65 * k);
        }
        ctx.globalAlpha = opacity;
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced, isMobile]);

  return (
    <div className="absolute inset-0 bg-bg-page">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      <div className="nebula-spot pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
