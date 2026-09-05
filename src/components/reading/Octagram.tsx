"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MatrixBase } from "@/lib/matrix/matrixEngine";
import { findSectionForPoint } from "@/lib/matrix/contentPositions";
import { arcanaName } from "@/lib/matrix";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import {
  OCTA_POINTS,
  SQUARE,
  DIAMOND,
  CX,
  CY,
  R,
  VB,
  pointValue,
  timelineRing,
  type OctaPoint,
} from "./octagramGeometry";

type Layers = { timeline: boolean; ancestral: boolean; money: boolean; love: boolean };

export type OctagramProps = {
  matrix: MatrixBase;
  /** Для парной матрицы возрастная шкала не имеет смысла. */
  showTimeline?: boolean;
  /** Текущий возраст — подсветить период на кольце. */
  age?: number | null;
  /** Вызывается при выборе точки — родитель подгружает подсказку. */
  onSelect?: (pointId: string) => void;
  /** Тексты подсказок по id точки (из общего кэша текстов). */
  hints?: Record<string, string | undefined>;
  /** id точек, подсказка которых сейчас грузится */
  loading?: Set<string>;
  /** Прокрутка к разделу разбора по id. */
  onGoToSection?: (sectionId: string) => void;
};

const ZONE_COLOR: Record<NonNullable<OctaPoint["zone"]>, string> = {
  money: "#c9a35c",
  love: "#c58fb5",
  male: "#6fa8c8",
  female: "#9fd0c0",
};

export function Octagram({ matrix, showTimeline = true, age = null, onSelect, hints = {}, loading, onGoToSection }: OctagramProps) {
  const [active, setActive] = useState<OctaPoint | null>(null);
  const hint = active ? hints[active.id] ?? null : null;
  const hintBusy = active ? Boolean(loading?.has(active.id)) : false;
  const [layers, setLayers] = useState<Layers>({ timeline: showTimeline, ancestral: true, money: true, love: true });

  // Зум и панорамирование на телефоне
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gesture = useRef<{ pointers: Map<number, { x: number; y: number }>; startDist: number; startScale: number; last: { x: number; y: number } | null }>({
    pointers: new Map(),
    startDist: 0,
    startScale: 1,
    last: null,
  });

  const ring = useMemo(() => timelineRing(), []);

  const select = useCallback(
    (p: OctaPoint) => {
      setActive(p);
      onSelect?.(p.id);
    },
    [onSelect],
  );

  useEffect(() => {
    setLayers((l) => ({ ...l, timeline: showTimeline }));
  }, [showTimeline]);

  const section = active ? findSectionForPoint(active.path) : null;
  const activeValue = active ? pointValue(matrix, active.path) : 0;

  /* ─── жесты ─── */
  const onPointerDown = (e: React.PointerEvent) => {
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.startScale = scale;
    } else if (g.pointers.size === 1 && scale > 1) {
      g.last = { x: e.clientX, y: e.clientY };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.startDist > 0) setScale(Math.min(3, Math.max(1, (g.startScale * dist) / g.startDist)));
    } else if (g.pointers.size === 1 && g.last && scale > 1) {
      const dx = e.clientX - g.last.x;
      const dy = e.clientY - g.last.y;
      g.last = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size < 2) g.startDist = 0;
    if (g.pointers.size === 0) g.last = null;
  };
  const reset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const stroke = "color-mix(in srgb, var(--text-accent) 45%, transparent)";
  const faint = "color-mix(in srgb, var(--text-secondary) 30%, transparent)";

  return (
    <div className="w-full">
      {/* Слои */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Слои схемы">
        {(
          [
            ["ancestral", "Родовые линии"],
            ["money", "Зона денег"],
            ["love", "Зона отношений"],
            ...(showTimeline ? ([["timeline", "Возрастная шкала"]] as const) : []),
          ] as Array<[keyof Layers, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={layers[key]}
            onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
              layers[key] ? "border-text-accent/60 bg-accent/20 text-text-primary" : "border-border text-text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Схема */}
      <div
        className="relative mx-auto aspect-square w-full max-w-[560px] select-none overflow-hidden rounded-[20px] border border-border/60 bg-surface-1/40"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg
          viewBox={`-18 -18 ${VB + 36} ${VB + 36}`}
          className="h-full w-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center", transition: scale === 1 ? "transform 200ms ease-out" : undefined }}
          role="img"
          aria-label="Схема матрицы: 25 точек, каждую можно выбрать"
        >
          <defs>
            <radialGradient id="octa-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--surface-2)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--surface-2)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R + 30} fill="url(#octa-glow)" />

          {/* Возрастная шкала */}
          {layers.timeline && (
            <g>
              <circle cx={CX} cy={CY} r={184} fill="none" stroke={faint} strokeWidth="0.6" strokeDasharray="2 4" />
              {ring.map((p) => {
                const current = age !== null && age >= p.age && age < p.age + 2.5;
                return (
                  <g key={p.age}>
                    <circle cx={p.x} cy={p.y} r={current ? 4 : p.major ? 2.4 : 1.4} fill={current ? "var(--text-accent)" : p.major ? "var(--text-secondary)" : faint} />
                    {p.major && (
                      <text x={p.x + (p.x - CX) * 0.075} y={p.y + (p.y - CY) * 0.075} fontSize="8.5" fill="var(--text-secondary)" textAnchor="middle" dominantBaseline="middle">
                        {p.age}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Контуры */}
          <polygon points={SQUARE.map((p) => p.join(",")).join(" ")} fill="none" stroke={stroke} strokeWidth="1" />
          <polygon points={DIAMOND.map((p) => p.join(",")).join(" ")} fill="none" stroke={stroke} strokeWidth="1" />
          {/* Оси */}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={faint} strokeWidth="0.8" />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke={faint} strokeWidth="0.8" />
          {/* Диагонали — родовые линии */}
          {(["NW", "NE", "SE", "SW"] as const).map((k) => {
            const p = OCTA_POINTS.find((x) => x.id === `point_${k}`)!;
            const on = layers.ancestral;
            return <line key={k} x1={p.x} y1={p.y} x2={CX} y2={CY} stroke={on ? (k === "NW" || k === "SE" ? ZONE_COLOR.male : ZONE_COLOR.female) : faint} strokeOpacity={on ? 0.55 : 1} strokeWidth={on ? 1.2 : 0.8} />;
          })}

          {/* Зоны */}
          {layers.money && <path d={`M ${CX} ${CY} L ${CX + R} ${CY} L ${CX + R * Math.SQRT1_2} ${CY + R * Math.SQRT1_2} L ${CX} ${CY + R} Z`} fill={ZONE_COLOR.money} fillOpacity="0.08" />}
          {layers.love && <path d={`M ${CX} ${CY} L ${CX - R} ${CY} L ${CX - R * Math.SQRT1_2} ${CY + R * Math.SQRT1_2} L ${CX} ${CY + R} Z`} fill={ZONE_COLOR.love} fillOpacity="0.08" />}

          {/* Точки */}
          {OCTA_POINTS.map((p) => {
            const v = pointValue(matrix, p.path);
            const isActive = active?.id === p.id;
            const size = p.kind === "outer" ? 15 : p.kind === "center" ? 17 : p.kind === "axis" ? 10 : 11;
            const zoneOn = (p.zone === "money" && layers.money) || (p.zone === "love" && layers.love) || ((p.zone === "male" || p.zone === "female") && layers.ancestral);
            const ringColor = isActive ? "var(--text-accent)" : zoneOn && p.zone ? ZONE_COLOR[p.zone] : "var(--border)";
            return (
              <g key={p.id} className="cursor-pointer" onClick={() => select(p)} role="button" aria-label={`${p.label}: аркан ${v}`} tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select(p)}>
                <circle cx={p.x} cy={p.y} r={size + 4} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={size} fill={isActive ? "var(--accent)" : "var(--bg-page)"} stroke={ringColor} strokeWidth={isActive ? 2 : 1.2} />
                <text x={p.x} y={p.y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={p.kind === "outer" || p.kind === "center" ? 13 : 9.5} fontWeight={p.kind === "center" ? 600 : 500} fill="var(--text-primary)" style={{ fontFamily: "var(--font-sans)" }}>
                  {v}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Управление зумом */}
        <div className="absolute bottom-3 right-3 flex gap-1.5 md:hidden">
          {[
            ["+", () => setScale((s) => Math.min(3, s + 0.5))],
            ["−", () => setScale((s) => Math.max(1, s - 0.5))],
            ["⟲", reset],
          ].map(([label, fn]) => (
            <button key={label as string} type="button" onClick={fn as () => void} className="h-9 w-9 rounded-full border border-border bg-bg-page/90 text-[16px] text-text-primary" aria-label={label === "⟲" ? "Сбросить масштаб" : label === "+" ? "Приблизить" : "Отдалить"}>
              {label as string}
            </button>
          ))}
        </div>
      </div>

      {/* Панель точки */}
      <div className="mx-auto mt-4 w-full max-w-[560px] rounded-[16px] border border-border/60 bg-surface-1/50 p-5" aria-live="polite">
        {!active ? (
          <p className="text-[15px] text-text-secondary">Нажмите на любую из 25 точек — откроется её значение и переход в нужный раздел разбора.</p>
        ) : (
          <div>
            <div className="flex items-start gap-4">
              {/* Иллюстрация выбранной точки. Кружок с номером остаётся
                  рядом: на схеме человек нажал именно на номер, и потерять
                  его связь с картинкой нельзя. */}
              <ArcanaImage n={activeValue} width={64} rounded={10} />
              <div className="min-w-0">
                <div className="text-[13px] uppercase tracking-[0.08em] text-text-secondary">{active.label}</div>
                <div className="font-display text-[22px] leading-tight text-text-primary">
                  {activeValue} · {arcanaName(activeValue)}
                </div>
              </div>
            </div>
            <p className="mt-3 min-h-[44px] text-[15px] leading-[1.6] text-text-secondary">
              {hintBusy ? "Подбираю слова…" : hint ?? "Короткая подсказка появится здесь."}
            </p>
            {section && onGoToSection && (
              <button type="button" onClick={() => onGoToSection(section.sectionId)} className="mt-3 text-[15px] text-text-accent underline-offset-4 hover:underline">
                Подробнее — в разделе «{section.sectionTitle}» →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
