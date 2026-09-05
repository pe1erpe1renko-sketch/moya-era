"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { arcanaImage } from "@/lib/arcanaImage";
const cardBack = "/images/card-back.jpg";

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  let rest = n;
  let out = "";
  for (const [value, sym] of ROMAN) {
    while (rest >= value) {
      out += sym;
      rest -= value;
    }
  }
  return out;
}

type Props = {
  n: number;
  name: string;
  /** сбрасывает переворот при новой карте */
  drawKey: number;
  onFlip: (flipped: boolean) => void;
  /** ширина карты (CSS-значение) */
  width?: string;
  /** открытая карта не закрывается обратно */
  oneWay?: boolean;
  /** начальное состояние переворота */
  initialFlipped?: boolean;
  /** подсказка «Нажми, чтобы перевернуть» */
  hint?: boolean;
};

/** Карта рубашкой вверх, переворачивается по клику. Лицо рисуется кодом. */
export function TarotFlipCard({
  n,
  name,
  drawKey,
  onFlip,
  width = "min(30vw, 46vh)",
  oneWay = false,
  initialFlipped = false,
  hint = true,
}: Props) {
  const [flipped, setFlipped] = useState(initialFlipped);
  const [missing, setMissing] = useState(false);

  // Ошибка загрузки может случиться до гидратации — React её не увидит.
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);

  useEffect(() => {
    setFlipped(initialFlipped);
    onFlip(initialFlipped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey]);

  const toggle = () => {
    setFlipped((f) => {
      if (oneWay && f) return f;
      onFlip(!f);
      return !f;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={`tarot-hit${flipped ? " is-flipped" : ""}`}
        style={{ cursor: "pointer" }}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? `${n} · ${name}` : "Перевернуть карту"}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <div className="tarot-tilt" style={{ width }}>
          <div className="tarot-flip">
            {/* Back */}
            <div className="tarot-side tarot-back">
              <img
                src={cardBack}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                className="pointer-events-none absolute rounded-[8px]"
                style={{
                  inset: 10,
                  border: "1px solid color-mix(in srgb, var(--border) 40%, transparent)",
                }}
              />
            </div>

            {/* Face */}
            <div
              className="tarot-side tarot-face"
              style={{ background: "linear-gradient(to bottom, var(--surface-1), #000000)" }}
            >
              {/* Иллюстрация аркана во всю карту. Не загрузилась — под ней
                  остаётся прежнее лицо, нарисованное кодом. */}
              {!missing && (
                <img
                  ref={imgRef}
                  src={arcanaImage(n, "lg")}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={() => setMissing(true)}
                  decoding="async"
                />
              )}
              <span
                className="pointer-events-none absolute rounded-[8px]"
                style={{
                  inset: 10,
                  border: "1px solid color-mix(in srgb, var(--text-accent) 45%, transparent)",
                }}
              />

              <div className="relative flex h-full flex-col items-center justify-between">
                <span
                  className="font-display"
                  style={{
                    marginTop: 26,
                    fontSize: "clamp(16px, 1.3vw, 22px)",
                    letterSpacing: "0.14em",
                    color: "#e6d9ff",
                    textShadow: "0 1px 6px rgba(0,0,0,0.85)",
                  }}
                >
                  {toRoman(n)}
                </span>

                {missing && (
                  <span
                    className="text-text-accent"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(64px, 7vw, 120px)",
                      lineHeight: 1,
                    }}
                  >
                    {n}
                  </span>
                )}

                <div
                  className="flex w-full flex-col items-center"
                  style={{
                    paddingBottom: 26,
                    paddingTop: 26,
                    paddingLeft: 22,
                    paddingRight: 22,
                    background: missing ? "none" : "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "block",
                      width: 40,
                      height: 1,
                      marginBottom: 12,
                      background: "var(--text-accent)",
                      opacity: 0.5,
                    }}
                  />
                  <span
                    className="text-center font-display"
                    style={{
                      fontSize: "clamp(18px, 1.5vw, 26px)",
                      letterSpacing: "0.08em",
                      color: "#f4f1ea",
                      textShadow: "0 1px 8px rgba(0,0,0,0.9)",
                    }}
                  >
                    {name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hint && !flipped && (
        <p className="text-text-secondary" style={{ marginTop: 14, fontSize: 14 }}>
          Нажми, чтобы перевернуть
        </p>
      )}
    </div>
  );
}
