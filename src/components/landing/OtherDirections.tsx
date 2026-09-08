"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { directions, type Direction } from "@/lib/directions";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CursorStarField } from "@/components/common/CursorStarField";
import { seededRandom, seedFrom } from "@/lib/seededRandom";

const CARD_GRADIENT =
  "linear-gradient(to bottom, rgba(3,25,30,0) 40%, rgba(3,25,30,0.6) 62%, rgba(3,25,30,0.9) 82%, rgba(3,25,30,0.97) 100%)";

/**
 * Случайность с зерном, а не `Math.random`: разметка карточки собирается
 * и на сервере, и в браузере, и звёзды должны лечь одинаково — иначе
 * React при гидратации находит расхождение и пишет об этом в консоль.
 */
const makeRand = (seed: number) => {
  const next = seededRandom(seed);
  return (min: number, max: number) => min + next() * (max - min);
};

const INSET = 24;

type CardStar = {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  opacity: number;
  delay: number;
};

function perimeterPos(i: number, total: number) {
  const t = (i + 0.5) / total;
  const p = t * 4;
  const a = INSET;
  if (p < 1) return { x: `calc(${p * 100}% - ${p * 2 * a}px + ${a}px)`, y: `${a}px` };
  if (p < 2) {
    const q = p - 1;
    return { x: `calc(100% - ${a}px)`, y: `calc(${q * 100}% - ${q * 2 * a}px + ${a}px)` };
  }
  if (p < 3) {
    const q = 1 - (p - 2);
    return { x: `calc(${q * 100}% - ${q * 2 * a}px + ${a}px)`, y: `calc(100% - ${a}px)` };
  }
  const q = 1 - (p - 3);
  return { x: `${a}px`, y: `calc(${q * 100}% - ${q * 2 * a}px + ${a}px)` };
}

function buildCardStars(count: number, seed: number): CardStar[] {
  const rand = makeRand(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    fromX: rand(-38, 138),
    fromY: rand(-38, 138),
    toX: 0,
    toY: 0,
    size: rand(1.4, 2.8),
    opacity: rand(0.45, 0.95),
    delay: rand(0, 120),
  }));
}

type Props = {
  currentId?: Direction["id"];
  title?: string;
  subtitle?: string;
};

type CardLinkRest = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  className: string;
  style: CSSProperties;
};

function CardLink({
  item,
  children,
  ...rest
}: {
  item: Direction;
  children: ReactNode;
} & CardLinkRest) {
  return (
    <Link href={item.path} {...rest}>
      {children}
    </Link>
  );
}

function DirectionCard({ item, reducedMotion }: { item: Direction; reducedMotion: boolean }) {
  const [active, setActive] = useState(false);
  const stars = useMemo(() => buildCardStars(14, seedFrom(item.id)), [item.id]);

  return (
    <div className="relative aspect-square w-[62vw] shrink-0 md:w-auto md:shrink">
      {!reducedMotion && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          {stars.map((s, i) => {
            const target = perimeterPos(i, stars.length);
            return (
              <span
                key={s.id}
                className="absolute rounded-full bg-text-primary"
                style={{
                  width: s.size,
                  height: s.size,
                  left: active ? target.x : `${s.fromX}%`,
                  top: active ? target.y : `${s.fromY}%`,
                  opacity: active ? 0 : s.opacity,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 6px rgba(230, 240, 239, 0.7)",
                  transition: active
                    ? `left 700ms cubic-bezier(0.22, 0.8, 0.2, 1) ${s.delay}ms, top 700ms cubic-bezier(0.22, 0.8, 0.2, 1) ${s.delay}ms, opacity 260ms ease-in 440ms`
                    : `left 520ms ease-out ${s.delay}ms, top 520ms ease-out ${s.delay}ms, opacity 240ms ease-out 120ms`,
                }}
              />
            );
          })}
        </div>
      )}
      <CardLink
        item={item}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        className="group relative z-10 block h-full w-full cursor-pointer overflow-hidden rounded-[18px] border border-border transition duration-300"
        style={{
          borderColor: active ? "rgba(255, 255, 255, 0.95)" : "var(--border)",
          boxShadow:
            active && !reducedMotion
              ? "0 0 26px rgba(230, 240, 239, 0.3), inset 0 0 14px rgba(230, 240, 239, 0.08)"
              : "none",
          transform: active ? "translateY(-6px)" : "translateY(0)",
          transition: reducedMotion
            ? "none"
            : active
              ? "transform 300ms ease, border-color 500ms ease-out 240ms, box-shadow 600ms ease-out 240ms"
              : "transform 300ms ease, border-color 400ms ease-out, box-shadow 400ms ease-out",
          outlineOffset: 4,
        }}
      >
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: CARD_GRADIENT }} />
        <span
          className="absolute inset-x-0 bottom-0 block px-4 pb-4 font-display text-text-primary"
          style={{ fontSize: "clamp(16px, 1.3vw, 21px)", lineHeight: 1.2 }}
        >
          {item.title}
        </span>
      </CardLink>
    </div>
  );
}

export function OtherDirections({
  currentId,
  title = "Эти пять считают вас иначе",
  subtitle = "Матрица описывает устройство. Остальные пять смотрят с других сторон и складываются с ней в один профиль",
}: Props = {}) {
  const reduced = useReducedMotion();
  const items = directions.filter((d) => d.id !== currentId);

  return (
    <section
      className="relative w-full overflow-hidden bg-bg-page"
      style={{
        paddingTop: "clamp(80px, 9vh, 140px)",
        paddingBottom: "clamp(80px, 9vh, 140px)",
      }}
    >
      <CursorStarField count={90} />

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-[clamp(20px,5vw,40px)]">
        <h2
          className="text-center font-display text-text-primary"
          style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.1 }}
        >
          {title}
        </h2>
        <p
          className="mx-auto mt-[14px] max-w-[760px] text-center text-text-secondary"
          style={{ fontSize: "clamp(15px, 1.2vw, 19px)", lineHeight: 1.55 }}
        >
          {subtitle}
        </p>

        <div className="other-dirs-track mt-11 flex gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 lg:grid-cols-5">
          {items.map((d) => (
            <DirectionCard key={d.id} item={d} reducedMotion={reduced} />
          ))}
        </div>
      </div>
    </section>
  );
}
