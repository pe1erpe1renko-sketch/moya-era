"use client";

import { useCallback, useState } from "react";
import { arcanaImage, ARCANA_RATIO, ARCANA_WIDTH, type ArcanaSize } from "@/lib/arcanaImage";
import { arcanaName } from "@/lib/matrix";

/**
 * ИЛЛЮСТРАЦИЯ АРКАНА — одна на весь сайт.
 *
 * Три обязательных свойства, ради которых компонент общий:
 *
 * 1. МЕСТО РЕЗЕРВИРУЕТСЯ ЗАРАНЕЕ. Рамка получает размер до того, как
 *    картинка загрузится, — страница не дёргается и текст под ней не
 *    прыгает вниз в момент подгрузки.
 * 2. ЕСЛИ КАРТИНКИ НЕТ — на её месте номер и название аркана, в той же
 *    рамке того же размера. Так было и до иллюстраций, и должно
 *    остаться: файла может не быть, сеть может отвалиться, а разбор
 *    читается и без картинки.
 * 3. ЧИТАЛКЕ С ЭКРАНА произносится название аркана, а не имя файла.
 */

export function ArcanaImage({
  n,
  width,
  size,
  className = "",
  rounded = 12,
  priority = false,
}: {
  n: number;
  /**
   * Ширина рамки: число — пиксели, строка — любое значение CSS
   * (`46%`, `min(320px, 40vw)`). Высота в обоих случаях выводится из
   * пропорций, поэтому место резервируется до загрузки и в резиновой
   * вёрстке тоже.
   */
  width: number | string;
  /**
   * Какой файл брать. Если не указан и ширина задана числом — выбирается
   * сам, по размеру рамки. Так никто не отдаст полумегабайтную картинку
   * в рамку шириной сорок точек просто потому, что забыл про свойство.
   */
  size?: ArcanaSize;
  className?: string;
  rounded?: number;
  /** картинка первого экрана: грузить сразу, а не по прокрутке */
  priority?: boolean;
}) {
  const [missing, setMissing] = useState(false);
  const name = arcanaName(n);
  const fixed = typeof width === "number" ? width : null;
  const height = fixed === null ? undefined : Math.round(fixed / ARCANA_RATIO);
  // Берём самый лёгкий файл, который покрывает рамку с запасом вдвое —
  // ради экранов с двойной плотностью точек.
  const chosen: ArcanaSize =
    size ?? (fixed === null ? "lg" : (["sm", "md", "lg"] as const).find((k) => fixed * 2 <= ARCANA_WIDTH[k]) ?? "lg");

  // Ошибка загрузки может случиться до гидратации — React её не увидит.
  // Проверяем состояние картинки сразу после монтирования.
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setMissing(true);
  }, []);

  return (
    <div
      className={`overflow-hidden border border-border/60 bg-surface-1 ${className}`}
      style={{ width, height, aspectRatio: fixed === null ? String(ARCANA_RATIO) : undefined, borderRadius: rounded, flexShrink: 0 }}
    >
      {missing ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
          <span
            className="font-display text-text-accent"
            style={{ fontSize: fixed === null ? "clamp(28px, 7vw, 96px)" : Math.max(18, Math.round(fixed * 0.24)) }}
          >
            {n}
          </span>
          {/* Название — только если рамка достаточно широкая. В сорок
              точек «Перерождение» не влезает и обрезается на середине
              слова; рядом с такой рамкой название всё равно написано
              обычным текстом. */}
          {(fixed === null || fixed >= 64) && (
            <span
              className="leading-tight text-text-secondary"
              style={{ fontSize: fixed === null ? "clamp(11px, 1.6vw, 20px)" : Math.max(10, Math.round(fixed * 0.09)) }}
            >
              {name}
            </span>
          )}
        </div>
      ) : (
        <img
          ref={imgRef}
          src={arcanaImage(n, chosen)}
          alt={name}
          width={fixed ?? undefined}
          height={height}
          className="h-full w-full object-cover"
          onError={() => setMissing(true)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </div>
  );
}
