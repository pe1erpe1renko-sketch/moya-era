import type { ReactNode } from "react";

/**
 * КОРОТКИЕ СПРАВКИ на странице по дате.
 *
 * По одной на позицию: заголовок с самим положением («Солнце во Льве»),
 * точное значение и абзац в три-четыре строки. Это отдельные тексты, а не
 * начало платного разбора: платный текст той же позиции написан иначе.
 *
 * Если справка ещё не написана, показываем только положение — оно
 * посчитано и верно. Выдумывать заглушку на общедоступной странице нельзя.
 */

export type BriefItem = {
  id: string;
  /** «Солнце во Льве» */
  title: string;
  /** «3°07′ Льва» — точное значение под заголовком */
  detail?: string;
  text: string | null;
  /** значок или подпись справа от заголовка */
  aside?: ReactNode;
};

export function BriefList({ items }: { items: BriefItem[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-7 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.id}>
          <h3 className="flex flex-wrap items-baseline gap-x-3 text-text-primary" style={{ fontSize: "clamp(17px, 1.3vw, 20px)", lineHeight: 1.25 }}>
            {item.title}
            {item.aside}
          </h3>
          {item.detail && (
            <div className="mt-1 text-text-secondary" style={{ fontSize: 13 }}>
              {item.detail}
            </div>
          )}
          {item.text && (
            <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.65 }}>
              {item.text}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
