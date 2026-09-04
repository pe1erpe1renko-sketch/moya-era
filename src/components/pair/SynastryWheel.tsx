"use client";

import { useState } from "react";
import { SIGNS, formatZodiac, norm360 } from "@/lib/ephemeris";
import { chartBody, pointGlyph, pointName, type NatalChart } from "@/lib/natal";
import { SYNASTRY_POINTS, type Synastry } from "@/lib/pair";

/**
 * Двойное колесо синастрии: планеты первого человека во внутреннем кольце,
 * второго — во внешнем, между ними линии межкарточных аспектов.
 *
 * Круг развёрнут по асценденту первого, если он известен; иначе от нуля
 * Овна — тогда это просто карта знаков, и подпись об этом говорит.
 * Домов здесь нет намеренно: у двоих домов две системы, и рисовать одну из
 * них поверх обеих значило бы соврать.
 */

const SIZE = 100;
const CENTER = SIZE / 2;

const R = {
  outer: 47,
  signInner: 40,
  second: 36,
  first: 29,
  aspect: 24,
};

const TONE_COLOR: Record<"soft" | "hard" | "neutral", string> = {
  soft: "rgba(122, 200, 168, 0.55)",
  hard: "rgba(214, 122, 122, 0.5)",
  neutral: "rgba(195, 174, 228, 0.5)",
};

const FIRST_COLOR = "var(--text-accent)";
const SECOND_COLOR = "rgba(122, 200, 168, 0.95)";

function longitudeOf(chart: NatalChart, point: string): number | null {
  if (point === "asc") return chart.asc?.longitude ?? null;
  return chartBody(chart, point as never)?.longitude ?? null;
}

export function SynastryWheel({
  synastry,
  active = null,
  onActivate,
  className,
}: {
  synastry: Synastry;
  active?: string | null;
  onActivate?: (id: string | null) => void;
  className?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const current = hover ?? active;

  const rotation = synastry.first.asc?.longitude ?? 0;

  const point = (longitude: number, radius: number) => {
    const a = (norm360(longitude - rotation) * Math.PI) / 180;
    return [CENTER - radius * Math.cos(a), CENTER + radius * Math.sin(a)] as const;
  };

  const ring = (chart: NatalChart, radius: number, owner: 0 | 1) =>
    SYNASTRY_POINTS.flatMap((p) => {
      const lon = longitudeOf(chart, p);
      if (lon === null) return [];
      const [x, y] = point(lon, radius);
      return [{ id: `${owner}:${p}`, point: p, lon, x, y, owner }];
    });

  const firstRing = ring(synastry.first, R.first, 0);
  const secondRing = ring(synastry.second, R.second, 1);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Двойное колесо синастрии: ${synastry.aspects.length} аспектов между картами`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx={CENTER} cy={CENTER} r={R.outer} fill="none" stroke="var(--border)" strokeWidth={0.3} />
        <circle cx={CENTER} cy={CENTER} r={R.signInner} fill="none" stroke="var(--border)" strokeWidth={0.3} />
        <circle cx={CENTER} cy={CENTER} r={R.aspect} fill="none" stroke="var(--border)" strokeWidth={0.2} opacity={0.6} />

        {/* Границы знаков и их символы */}
        {SIGNS.map((sign, i) => {
          const start = i * 30;
          const [x1, y1] = point(start, R.outer);
          const [x2, y2] = point(start, R.signInner);
          const [gx, gy] = point(start + 15, (R.outer + R.signInner) / 2);
          return (
            <g key={sign.key}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={0.3} />
              <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize={3.4} fill="var(--text-secondary)">
                {sign.glyph}
              </text>
            </g>
          );
        })}

        {/* Линии межкарточных аспектов */}
        {synastry.aspects.map((a) => {
          const from = longitudeOf(synastry.first, a.a);
          const to = longitudeOf(synastry.second, a.b);
          if (from === null || to === null) return null;
          const [x1, y1] = point(from, R.aspect);
          const [x2, y2] = point(to, R.aspect);
          const lit = current === `0:${a.a}` || current === `1:${a.b}`;
          return (
            <line
              key={`${a.a}-${a.b}-${a.aspect.key}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={TONE_COLOR[a.aspect.tone]}
              strokeWidth={lit ? 0.65 : 0.3}
              opacity={current && !lit ? 0.15 : 1}
            />
          );
        })}

        {/* Планеты обоих */}
        {[...firstRing, ...secondRing].map((p) => {
          const lit = current === p.id;
          return (
            <g
              key={p.id}
              onMouseEnter={() => {
                setHover(p.id);
                onActivate?.(p.id);
              }}
              onMouseLeave={() => {
                setHover(null);
                onActivate?.(null);
              }}
              style={{ cursor: "default" }}
            >
              <circle cx={p.x} cy={p.y} r={2.6} fill="var(--surface-1)" opacity={lit ? 1 : 0.85} />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={3.2}
                fill={p.owner === 0 ? FIRST_COLOR : SECOND_COLOR}
                opacity={current && !lit ? 0.35 : 1}
              >
                {pointGlyph(p.point as never)}
              </text>
              <title>{`${pointName(p.point as never)} ${p.owner === 0 ? "первого" : "второго"}: ${formatZodiac(p.lon)}`}</title>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center" style={{ gap: 16 }}>
        <Legend color={FIRST_COLOR} label="первый — внутреннее кольцо" />
        <Legend color={SECOND_COLOR} label="второй — внешнее кольцо" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center text-text-secondary" style={{ fontSize: 12, gap: 6 }}>
      <span aria-hidden="true" className="rounded-full" style={{ width: 8, height: 8, background: color }} />
      {label}
    </span>
  );
}
