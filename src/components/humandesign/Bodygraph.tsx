"use client";

import { useMemo, useState } from "react";
import {
  CENTERS,
  CENTER_ORDER,
  CHANNELS,
  centerOfGate,
  channelKey,
  type CenterId,
  type HumanDesignChart,
} from "@/lib/humandesign";

/**
 * БОДИГРАФ — настоящая схема: девять центров и все тридцать шесть каналов.
 *
 * Определённые центры закрашены, открытые остаются контуром. Канал горит
 * целиком, если активны обе его ворота; если активна только одна половина,
 * подсвечивается половина со стороны своего центра — так принято рисовать,
 * и так видно, чего человеку не хватает до полного канала.
 *
 * Каналов между одной парой центров бывает до четырёх, поэтому линии
 * разводятся перпендикулярным смещением, иначе они лягут друг на друга.
 */

const W = 120;
const H = 190;

type Shape =
  | { kind: "triangle"; points: string }
  | { kind: "square"; x: number; y: number; size: number }
  | { kind: "diamond"; points: string };

/** radius — насколько канал не доходит до середины центра, чтобы не пересекать фигуру. */
type Layout = { center: readonly [number, number]; shape: Shape; radius: number };

const LAYOUT: Record<CenterId, Layout> = {
  head: { center: [60, 16], shape: { kind: "triangle", points: "60,6 74,26 46,26" }, radius: 10 },
  ajna: { center: [60, 42], shape: { kind: "triangle", points: "60,52 74,32 46,32" }, radius: 10 },
  throat: { center: [60, 72], shape: { kind: "square", x: 46, y: 58, size: 28 }, radius: 14 },
  self: { center: [60, 104], shape: { kind: "diamond", points: "60,90 74,104 60,118 46,104" }, radius: 13 },
  heart: { center: [88, 98], shape: { kind: "triangle", points: "80,90 98,98 80,106" }, radius: 8 },
  spleen: { center: [22, 128], shape: { kind: "triangle", points: "10,128 34,116 34,140" }, radius: 11 },
  solar: { center: [98, 128], shape: { kind: "triangle", points: "110,128 86,116 86,140" }, radius: 11 },
  sacral: { center: [60, 134], shape: { kind: "square", x: 46, y: 120, size: 28 }, radius: 14 },
  root: { center: [60, 170], shape: { kind: "square", x: 46, y: 156, size: 28 }, radius: 14 },
};

const ACTIVE_FILL = "rgba(122, 93, 168, 0.55)";
const ACTIVE_STROKE = "var(--text-accent)";

/** Каналы, сгруппированные по паре центров, чтобы развести параллельные. */
type DrawnChannel = { a: number; b: number; from: readonly [number, number]; to: readonly [number, number] };

function layoutChannels(): DrawnChannel[] {
  const groups = new Map<string, typeof CHANNELS>();
  for (const c of CHANNELS) {
    const x = centerOfGate(c.a);
    const y = centerOfGate(c.b);
    const key = [x, y].sort().join("_");
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  const out: DrawnChannel[] = [];
  for (const list of groups.values()) {
    const first = list[0];
    const ca = LAYOUT[centerOfGate(first.a)].center;
    const cb = LAYOUT[centerOfGate(first.b)].center;
    const dx = cb[0] - ca[0];
    const dy = cb[1] - ca[1];
    const len = Math.hypot(dx, dy) || 1;
    // Единичная нормаль, вдоль неё разводим параллельные каналы.
    const nx = -dy / len;
    const ny = dx / len;
    const step = 4.2;
    const start = -((list.length - 1) / 2) * step;

    // Единичный вектор вдоль канала: им укорачиваем концы, чтобы линия
    // упиралась в фигуру центра, а не проходила сквозь неё.
    const ux = dx / len;
    const uy = dy / len;
    const ra = LAYOUT[centerOfGate(first.a)].radius;
    const rb = LAYOUT[centerOfGate(first.b)].radius;

    list.forEach((c, i) => {
      const shift = start + i * step;
      out.push({
        a: c.a,
        b: c.b,
        from: [ca[0] + nx * shift + ux * ra, ca[1] + ny * shift + uy * ra] as const,
        to: [cb[0] + nx * shift - ux * rb, cb[1] + ny * shift - uy * rb] as const,
      });
    });
  }
  return out;
}

const DRAWN = layoutChannels();

/**
 * Схеме нужны только ворота, центры и каналы — а не вся карта. Благодаря
 * этому тот же бодиграф рисует и композит пары, где карты как таковой нет.
 */
export type BodygraphChart = Pick<HumanDesignChart, "gates" | "definedCenters" | "channels">;

export type BodygraphProps = {
  chart: BodygraphChart | null;
  /** подсветить центр или канал */
  active?: string | null;
  onActivate?: (id: string | null) => void;
  /** нажатие на центр — для пояснения рядом со схемой (на телефоне наведения нет) */
  onSelect?: (id: string) => void;
  className?: string;
  /** показывать номера ворот у концов каналов */
  showGateNumbers?: boolean;
};

export function Bodygraph({ chart, active = null, onActivate, onSelect, className, showGateNumbers = false }: BodygraphProps) {
  const [hover, setHover] = useState<string | null>(null);
  const current = hover ?? active;

  const gates = useMemo(() => new Set(chart?.gates ?? []), [chart]);
  const defined = useMemo(() => new Set(chart?.definedCenters ?? []), [chart]);
  const fullChannels = useMemo(
    () => new Set((chart?.channels ?? []).map((c) => channelKey(c.a, c.b))),
    [chart],
  );

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={
          chart
            ? `Бодиграф: определено ${chart.definedCenters.length} центров из девяти, горит ${chart.channels.length} каналов`
            : "Пустой бодиграф: девять центров без заполнения"
        }
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* каналы */}
        {DRAWN.map((ch) => {
          const key = channelKey(ch.a, ch.b);
          const full = fullChannels.has(key);
          const halfA = gates.has(ch.a);
          const halfB = gates.has(ch.b);
          const lit = current === `channel:${key}` || (current && (current === `center:${centerOfGate(ch.a)}` || current === `center:${centerOfGate(ch.b)}`));
          const mid = [(ch.from[0] + ch.to[0]) / 2, (ch.from[1] + ch.to[1]) / 2] as const;

          return (
            <g
              key={key}
              onMouseEnter={() => {
                if (!full) return;
                setHover(`channel:${key}`);
                onActivate?.(`channel:${key}`);
              }}
              onMouseLeave={() => {
                setHover(null);
                onActivate?.(null);
              }}
              style={{ cursor: full && onActivate ? "pointer" : "default" }}
            >
              {/* основа канала */}
              <line
                x1={ch.from[0]}
                y1={ch.from[1]}
                x2={ch.to[0]}
                y2={ch.to[1]}
                stroke="var(--border)"
                strokeOpacity={0.45}
                strokeWidth={1.2}
              />
              {/* половины: своя сторона горит, если активны её ворота */}
              {halfA && (
                <line
                  x1={ch.from[0]}
                  y1={ch.from[1]}
                  x2={mid[0]}
                  y2={mid[1]}
                  stroke={full ? ACTIVE_STROKE : "var(--text-secondary)"}
                  strokeOpacity={full ? (lit ? 1 : 0.9) : 0.5}
                  strokeWidth={full ? 2 : 1.4}
                  style={{ transition: "stroke-opacity 200ms" }}
                />
              )}
              {halfB && (
                <line
                  x1={mid[0]}
                  y1={mid[1]}
                  x2={ch.to[0]}
                  y2={ch.to[1]}
                  stroke={full ? ACTIVE_STROKE : "var(--text-secondary)"}
                  strokeOpacity={full ? (lit ? 1 : 0.9) : 0.5}
                  strokeWidth={full ? 2 : 1.4}
                  style={{ transition: "stroke-opacity 200ms" }}
                />
              )}
              {full && <title>{`Канал ${ch.a}—${ch.b}`}</title>}
              {showGateNumbers && (halfA || halfB) && (
                <text
                  x={mid[0]}
                  y={mid[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--text-secondary)"
                  fontSize={2.4}
                  opacity={0.8}
                >
                  {ch.a}·{ch.b}
                </text>
              )}
            </g>
          );
        })}

        {/* центры */}
        {CENTER_ORDER.map((id) => {
          const shape = LAYOUT[id].shape;
          const isDefined = defined.has(id);
          const isActive = current === `center:${id}`;
          const fill = isDefined ? ACTIVE_FILL : "transparent";
          const stroke = isDefined || isActive ? ACTIVE_STROKE : "var(--border)";
          const common = {
            fill,
            stroke,
            strokeWidth: isActive ? 1.6 : 1,
            strokeOpacity: isDefined ? 1 : 0.6,
            style: {
              cursor: onActivate || onSelect ? "pointer" : "default",
              transition: "fill 250ms, stroke 250ms, filter 250ms",
              filter: isActive ? "drop-shadow(0 0 5px rgba(122, 93, 168, 0.5))" : "none",
            },
            onMouseEnter: () => {
              setHover(`center:${id}`);
              onActivate?.(`center:${id}`);
            },
            onMouseLeave: () => {
              setHover(null);
              onActivate?.(null);
            },
            onClick: () => onSelect?.(`center:${id}`),
          };

          return (
            <g key={id}>
              {shape.kind === "square" ? (
                <rect x={shape.x} y={shape.y} width={shape.size} height={shape.size} rx={1.5} {...common} />
              ) : (
                <polygon points={shape.points} {...common} />
              )}
              <title>{`${CENTERS[id].name}: ${isDefined ? "определён" : "открыт"}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Список центров с состоянием — рядом со схемой. */
export function CenterList({
  chart,
  active,
  onActivate,
}: {
  chart: HumanDesignChart;
  active?: string | null;
  onActivate?: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {CENTER_ORDER.map((id) => {
        const isDefined = chart.definedCenters.includes(id);
        return (
          <div
            key={id}
            onMouseEnter={() => onActivate?.(`center:${id}`)}
            onMouseLeave={() => onActivate?.(null)}
            className="flex items-center gap-3 rounded-[8px] px-2 py-1"
            style={{
              background: active === `center:${id}` ? "rgba(122, 93, 168, 0.12)" : "transparent",
              transition: "background 200ms",
            }}
          >
            <span
              aria-hidden="true"
              className="shrink-0 rounded-[3px]"
              style={{
                width: 10,
                height: 10,
                background: isDefined ? ACTIVE_FILL : "transparent",
                border: `1px solid ${isDefined ? "var(--text-accent)" : "var(--border)"}`,
              }}
            />
            <span className="text-text-primary" style={{ fontSize: 14 }}>
              {CENTERS[id].name}
            </span>
            <span className="ml-auto text-text-secondary" style={{ fontSize: 13 }}>
              {isDefined ? "определён" : "открыт"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
