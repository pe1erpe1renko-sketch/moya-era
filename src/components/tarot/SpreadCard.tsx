"use client";

import { arcanaName } from "@/lib/matrix";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import type { DrawnCard } from "@/lib/tarot";

/**
 * Карта в раскладе: иллюстрация, место в раскладе и название.
 *
 * ПЕРЕВЁРНУТАЯ КАРТА ПОКАЗЫВАЕТСЯ ПЕРЕВЁРНУТОЙ. Иначе слово
 * «перевёрнутая» в тексте нечем подтвердить, и человек решит, что мы его
 * придумали. Разворачивается только изображение — подпись остаётся
 * читаемой.
 */
export function SpreadCard({ card, width = 120 }: { card: DrawnCard; width?: number }) {
  const name = arcanaName(card.arcanum);
  return (
    <figure className="flex flex-col items-center" style={{ width }}>
      <div style={{ transform: card.reversed ? "rotate(180deg)" : undefined }}>
        <ArcanaImage n={card.arcanum} width={width} rounded={10} />
      </div>
      <figcaption className="mt-2 text-center">
        <div className="text-text-secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
          {card.position.label}
        </div>
        <div className="mt-0.5 text-text-primary" style={{ fontSize: 13, lineHeight: 1.3 }}>
          {card.arcanum} · {name}
        </div>
        {card.reversed && (
          <div className="text-text-accent" style={{ fontSize: 12 }}>
            перевёрнутая
          </div>
        )}
      </figcaption>
    </figure>
  );
}
