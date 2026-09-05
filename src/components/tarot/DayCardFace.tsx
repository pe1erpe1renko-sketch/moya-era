"use client";

import { useCallback, useState } from "react";
import { toRoman } from "./TarotFlipCard";
import { arcanaImage, ARCANA_RATIO } from "@/lib/arcanaImage";

/**
 * Лицо карты дня.
 *
 * Здесь карта сразу лежит лицом вверх и ничего не переворачивается.
 * Причина не в лени: страница живёт в поиске, и её содержимое должно
 * стоять в HTML, а не появляться после нажатия. Да и интрига неуместна —
 * карта на сегодня одна, второй попытки не будет.
 *
 * Иллюстрация занимает всю карту, номер и название лежат поверх неё на
 * затемнении — без затемнения светлые места картинки съедают белый
 * текст. Если картинки нет, остаётся ровно то, что было до неё:
 * римская цифра, номер и название на градиенте.
 */
export function DayCardFace({ n, name }: { n: number; name: string }) {
  const [missing, setMissing] = useState(false);

  // Ошибка загрузки может случиться до гидратации — React её не увидит.
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);

  return (
    <figure
      className="relative mx-auto w-full max-w-[200px] overflow-hidden rounded-[14px] border border-border md:max-w-[260px]"
      style={{ aspectRatio: String(ARCANA_RATIO), background: "linear-gradient(to bottom, var(--surface-1), #000000)" }}
    >
      {!missing && (
        <img
          ref={imgRef}
          src={arcanaImage(n, "lg")}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setMissing(true)}
          decoding="async"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-[8px]"
        style={{ inset: 10, border: "1px solid color-mix(in srgb, var(--text-accent) 45%, transparent)" }}
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
            style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(56px, 6vw, 96px)", lineHeight: 1 }}
          >
            {n}
          </span>
        )}
        <figcaption
          className="flex w-full flex-col items-center"
          style={{
            paddingBottom: 18,
            paddingTop: 26,
            paddingInline: 22,
            // Подпись читается и на светлой части картинки: тень снизу
            // всегда одна и та же, независимо от того, что нарисовано.
            background: missing ? "none" : "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))",
          }}
        >
          <span
            aria-hidden="true"
            style={{ display: "block", width: 40, height: 1, marginBottom: 12, background: "var(--text-accent)", opacity: 0.6 }}
          />
          <span
            className="text-center font-display"
            style={{
              fontSize: "clamp(18px, 1.5vw, 24px)",
              letterSpacing: "0.08em",
              color: "#f4f1ea",
              textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            }}
          >
            {n} · {name}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}
