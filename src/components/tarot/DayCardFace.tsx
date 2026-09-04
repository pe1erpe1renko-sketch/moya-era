import { toRoman } from "./TarotFlipCard";

/**
 * Лицо карты дня — рисуется кодом, как и в раскладе.
 *
 * Здесь карта сразу лежит лицом вверх и ничего не переворачивается.
 * Причина не в лени: страница живёт в поиске, и её содержимое должно
 * стоять в HTML, а не появляться после нажатия. Да и интрига неуместна —
 * карта на сегодня одна, второй попытки не будет.
 */
export function DayCardFace({ n, name }: { n: number; name: string }) {
  return (
    <figure
      className="relative mx-auto w-full max-w-[200px] overflow-hidden rounded-[14px] border border-border md:max-w-[260px]"
      style={{ aspectRatio: "0.6", background: "linear-gradient(to bottom, var(--surface-1), #000000)" }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-[8px]"
        style={{ inset: 10, border: "1px solid color-mix(in srgb, var(--text-accent) 45%, transparent)" }}
      />
      <div className="relative flex h-full flex-col items-center justify-between">
        <span
          className="font-display text-text-accent"
          style={{ marginTop: 26, fontSize: "clamp(16px, 1.3vw, 22px)", letterSpacing: "0.14em" }}
        >
          {toRoman(n)}
        </span>
        <span
          className="text-text-accent"
          style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(56px, 6vw, 96px)", lineHeight: 1 }}
        >
          {n}
        </span>
        <figcaption className="flex w-full flex-col items-center" style={{ paddingBottom: 26, paddingInline: 22 }}>
          <span
            aria-hidden="true"
            style={{ display: "block", width: 40, height: 1, marginBottom: 12, background: "var(--text-accent)", opacity: 0.5 }}
          />
          <span
            className="text-center font-display text-text-primary"
            style={{ fontSize: "clamp(18px, 1.5vw, 24px)", letterSpacing: "0.08em" }}
          >
            {name}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}
