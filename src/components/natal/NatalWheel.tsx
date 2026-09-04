"use client";

import { useMemo, useState } from "react";
import {
  SIGNS,
  formatZodiac,
  norm360,
  type Sign,
} from "@/lib/ephemeris";
import { pointGlyph, pointName, type Aspect, type NatalChart } from "@/lib/natal";

/**
 * Колесо натальной карты: двенадцать знаков по кругу, куспиды домов,
 * планеты на своих градусах и линии аспектов внутри.
 *
 * Круг развёрнут так, как принято в астрологии: асцендент слева, а знаки
 * идут против часовой стрелки. Если времени и места нет, домов и углов не
 * рисуем — вместо них ровный круг знаков, и подпись честно объясняет, чего
 * не хватает.
 */

const SIZE = 100;
const CENTER = SIZE / 2;

/** Радиусы колец в единицах viewBox. */
const R = {
  outer: 47,
  signInner: 40,
  houseOuter: 40,
  houseInner: 30,
  planet: 35.5,
  aspect: 29,
};

const TONE_COLOR: Record<Aspect["aspect"]["tone"], string> = {
  soft: "rgba(122, 200, 168, 0.55)",
  hard: "rgba(214, 122, 122, 0.5)",
  neutral: "rgba(195, 174, 228, 0.5)",
};

export type NatalWheelProps = {
  chart: NatalChart;
  /** подсветить точку по идентификатору тела или угла */
  active?: string | null;
  onActivate?: (id: string | null) => void;
  className?: string;
};

export function NatalWheel({ chart, active = null, onActivate, className }: NatalWheelProps) {
  const [hover, setHover] = useState<string | null>(null);
  const current = hover ?? active;

  /** Асцендент слева: поворачиваем круг так, чтобы он оказался на 180°. */
  const rotation = chart.asc ? chart.asc.longitude : 0;

  /**
   * Долгота → точка на плоскости. Асцендент слева (девять часов), дальше
   * долгота растёт против часовой стрелки — как принято в астрологии.
   * Ось y в SVG направлена вниз, поэтому синус берётся со знаком плюс.
   */
  const point = (longitude: number, radius: number) => {
    const a = (norm360(longitude - rotation) * Math.PI) / 180;
    return [CENTER - radius * Math.cos(a), CENTER + radius * Math.sin(a)] as const;
  };

  const arcPath = (from: number, to: number, rOuter: number, rInner: number) => {
    const [x1, y1] = point(from, rOuter);
    const [x2, y2] = point(to, rOuter);
    const [x3, y3] = point(to, rInner);
    const [x4, y4] = point(from, rInner);
    const span = norm360(to - from);
    const large = span > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 0 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 1 ${x4} ${y4} Z`;
  };

  /**
   * Планеты, стоящие рядом, наезжают друг на друга. Разводим их по кругу:
   * если между соседями меньше 5°, отодвигаем — рисунок остаётся читаемым,
   * а настоящая долгота остаётся в подписи.
   */
  const placed = useMemo(() => {
    const items = chart.bodies
      .map((b) => ({ id: b.body, longitude: b.longitude, draw: b.longitude, body: b }))
      .sort((a, b) => norm360(a.longitude - rotation) - norm360(b.longitude - rotation));
    const MIN_GAP = 5;
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        const b = items[(i + 1) % items.length];
        const gap = norm360(b.draw - a.draw);
        if (gap < MIN_GAP && gap >= 0) {
          const shift = (MIN_GAP - gap) / 2;
          a.draw = norm360(a.draw - shift);
          b.draw = norm360(b.draw + shift);
        }
      }
    }
    return items;
  }, [chart.bodies, rotation]);

  const cusps = chart.houses?.cusps ?? null;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={
          chart.unknown.houses
            ? "Круг натальной карты: положения планет по знакам. Дома не построены — нужны время и место рождения"
            : "Круг натальной карты: знаки, дома, планеты и аспекты между ними"
        }
        className="h-auto w-full overflow-visible"
      >
        {/* кольцо знаков */}
        {SIGNS.map((sign: Sign) => {
          const start = sign.index * 30;
          const [gx, gy] = point(start + 15, (R.outer + R.signInner) / 2);
          const isSunSign = chart.bodies.some((b) => b.body === "sun" && b.sign.index === sign.index);
          return (
            <g key={sign.key}>
              <path
                d={arcPath(start, start + 30, R.outer, R.signInner)}
                fill={isSunSign ? "rgba(122, 93, 168, 0.16)" : "transparent"}
                stroke="var(--border)"
                strokeWidth={0.25}
                strokeOpacity={0.6}
              />
              <text
                x={gx}
                y={gy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSunSign ? "var(--text-accent)" : "var(--text-secondary)"}
                fontSize={4}
                fontFamily="'Noto Sans Symbols 2', sans-serif"
                style={{ fontVariantEmoji: "text" }}
              >
                {sign.glyph}
              </text>
            </g>
          );
        })}

        {/* кольцо домов */}
        <circle cx={CENTER} cy={CENTER} r={R.houseInner} fill="none" stroke="var(--border)" strokeWidth={0.25} strokeOpacity={0.5} />
        {cusps?.map((cusp, i) => {
          const [x1, y1] = point(cusp, R.houseInner);
          const [x2, y2] = point(cusp, R.houseOuter);
          const angular = i === 0 || i === 3 || i === 6 || i === 9;
          const mid = cusp + norm360(cusps[(i + 1) % 12] - cusp) / 2;
          const [lx, ly] = point(mid, (R.houseInner + R.houseOuter) / 2);
          return (
            <g key={`cusp-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={angular ? "var(--text-accent)" : "var(--border)"}
                strokeWidth={angular ? 0.5 : 0.25}
                strokeOpacity={angular ? 0.8 : 0.5}
              />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="var(--text-secondary)" fontSize={2.6} opacity={0.75}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* аспекты */}
        {chart.aspects.map((a, i) => {
          const from = a.a === "asc" ? chart.asc?.longitude : a.a === "mc" ? chart.mc?.longitude : chart.bodies.find((b) => b.body === a.a)?.longitude;
          const to = a.b === "asc" ? chart.asc?.longitude : a.b === "mc" ? chart.mc?.longitude : chart.bodies.find((b) => b.body === a.b)?.longitude;
          if (from === undefined || to === undefined) return null;
          const [x1, y1] = point(from, R.aspect);
          const [x2, y2] = point(to, R.aspect);
          const lit = current === a.a || current === a.b;
          return (
            <line
              key={`aspect-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={TONE_COLOR[a.aspect.tone]}
              strokeWidth={lit ? 0.6 : 0.25}
              strokeOpacity={current ? (lit ? 1 : 0.15) : 0.35 + a.strength * 0.35}
              style={{ transition: "stroke-opacity 200ms, stroke-width 200ms" }}
            />
          );
        })}

        {/* углы карты */}
        {chart.asc && chart.mc
          ? (
              [
                { id: "asc", lon: chart.asc.longitude, label: "Asc" },
                { id: "mc", lon: chart.mc.longitude, label: "MC" },
              ] as const
            ).map((angle) => {
              const [tx, ty] = point(angle.lon, R.outer + 3.5);
              return (
                <text
                  key={angle.id}
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--text-accent)"
                  fontSize={3}
                  fontFamily="var(--font-mono)"
                >
                  {angle.label}
                </text>
              );
            })
          : null}

        {/* планеты */}
        {placed.map(({ id, longitude, draw, body }) => {
          const [px, py] = point(draw, R.planet);
          const [tickOuter] = [point(longitude, R.signInner)];
          const [tx1, ty1] = tickOuter;
          const [tx2, ty2] = point(longitude, R.signInner - 1.6);
          const isActive = current === id;
          return (
            <g
              key={id}
              onMouseEnter={() => {
                setHover(id);
                onActivate?.(id);
              }}
              onMouseLeave={() => {
                setHover(null);
                onActivate?.(null);
              }}
              style={{ cursor: onActivate ? "pointer" : "default" }}
            >
              <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--text-secondary)" strokeWidth={0.25} strokeOpacity={0.7} />
              <circle cx={px} cy={py} r={3} fill="transparent" />
              <text
                x={px}
                y={py}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? "var(--text-accent)" : "var(--text-primary)"}
                fontSize={isActive ? 4.6 : 4}
                fontFamily="'Noto Sans Symbols 2', sans-serif"
                style={{
                  fontVariantEmoji: "text",
                  transition: "fill 200ms, font-size 200ms",
                  filter: isActive ? "drop-shadow(0 0 3px rgba(122, 93, 168, 0.6))" : "none",
                }}
              >
                {body.glyph}
              </text>
              {body.retrograde && (
                <text x={px + 2.6} y={py + 2.2} textAnchor="middle" fill="var(--text-secondary)" fontSize={2} opacity={0.8}>
                  R
                </text>
              )}
              <title>{`${body.name} ${body.label}${body.house ? `, ${body.house} дом` : ""}${body.retrograde ? ", ретроградный" : ""}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Список положений под колесом: планета, знак, дом. */
export function NatalPositions({
  chart,
  onActivate,
  active,
}: {
  chart: NatalChart;
  onActivate?: (id: string | null) => void;
  active?: string | null;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {chart.bodies.map((b) => (
        <div
          key={b.body}
          onMouseEnter={() => onActivate?.(b.body)}
          onMouseLeave={() => onActivate?.(null)}
          className="flex items-baseline gap-3 rounded-[8px] px-2 py-1"
          style={{
            background: active === b.body ? "rgba(122, 93, 168, 0.12)" : "transparent",
            transition: "background 200ms",
          }}
        >
          <span
            aria-hidden="true"
            className="w-4 shrink-0 text-text-accent"
            style={{ fontFamily: "'Noto Sans Symbols 2', sans-serif", fontVariantEmoji: "text" }}
          >
            {b.glyph}
          </span>
          <span className="w-[92px] shrink-0 text-text-primary" style={{ fontSize: 14 }}>
            {b.name}
          </span>
          <span className="text-text-secondary" style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>
            {formatZodiac(b.longitude)}
          </span>
          {b.house ? (
            <span className="text-text-secondary" style={{ fontSize: 13, opacity: 0.7 }}>
              {b.house} дом
            </span>
          ) : null}
          {b.retrograde ? (
            <span className="text-text-secondary" style={{ fontSize: 12, opacity: 0.6 }}>
              R
            </span>
          ) : null}
        </div>
      ))}

      {chart.asc && chart.mc ? (
        <>
          <div className="mt-1 flex items-baseline gap-3 px-2">
            <span aria-hidden="true" className="w-4 shrink-0 text-text-accent" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
              Asc
            </span>
            <span className="w-[92px] shrink-0 text-text-primary" style={{ fontSize: 14 }}>
              {pointName("asc")}
            </span>
            <span className="text-text-secondary" style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>
              {formatZodiac(chart.asc.longitude)}
            </span>
          </div>
          <div className="flex items-baseline gap-3 px-2">
            <span aria-hidden="true" className="w-4 shrink-0 text-text-accent" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
              {pointGlyph("mc")}
            </span>
            <span className="w-[92px] shrink-0 text-text-primary" style={{ fontSize: 14 }}>
              {pointName("mc")}
            </span>
            <span className="text-text-secondary" style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>
              {formatZodiac(chart.mc.longitude)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
