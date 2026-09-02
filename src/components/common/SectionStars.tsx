"use client";

import { useEffect, useRef } from "react";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Section background star field, drawn in code on a canvas. */
export function SectionStars({ count = 70 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const color =
      getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim() ||
      "#E6F0EF";

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const clusters = Array.from({ length: Math.floor(rand(5, 7)) }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        spread: rand(w * 0.05, w * 0.12),
      }));
      const clustered = Math.round(count * 0.7);
      const bright = 6;
      const mid = 20;

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
        let r = 0.6;
        let opacity = 0.25;
        if (i < bright) {
          r = 1.6;
          opacity = 0.85;
        } else if (i < bright + mid) {
          r = 1.1;
          opacity = 0.5;
        }
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
