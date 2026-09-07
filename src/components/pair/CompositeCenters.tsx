"use client";

import { CENTERS, CENTER_ORDER, type CenterId } from "@/lib/humandesign";
import { CONNECTION_KINDS, KIND_ORDER, countKinds, type Composite, type CenterSource } from "@/lib/pair";

/**
 * Откуда в паре взялся каждый центр и сколько связей какого вида.
 *
 * Самое интересное в композите — центры «только вместе»: их нет ни у
 * кого поодиночке, а вдвоём они загораются. Это и есть то, чем пара
 * отличается от двух отдельных людей.
 *
 * Центры нажимаются — и в списке, и на схеме: рядом появляется пояснение,
 * что это за центр, откуда он в паре и что это значит для двоих.
 */

const SOURCE_LABEL: Record<CenterSource, string> = {
  first: "у первого",
  second: "у второго",
  both: "у обоих",
  connection: "только вместе",
  none: "открыт у обоих",
};

const SOURCE_COLOR: Record<CenterSource, string> = {
  first: "var(--text-accent)",
  second: "rgba(122, 200, 168, 0.95)",
  both: "rgba(195, 174, 228, 0.95)",
  connection: "rgba(232, 180, 106, 0.95)",
  none: "transparent",
};

/** Что значит для пары, откуда взялся центр. */
const SOURCE_EXPLAIN: Record<CenterSource, string> = {
  both: "Определён у обоих: в этой теме вы устроены одинаково устойчиво, и никому не нужно подстраиваться.",
  first: "Определён у первого, у второго открыт: здесь первый задаёт тон, а второй чувствует его тему сильнее, чем свою.",
  second: "Определён у второго, у первого открыт: здесь второй задаёт тон, а первый чувствует его тему сильнее, чем свою.",
  connection: "Ни у кого поодиночке, а вместе есть. Это эффект пары: тема, которая живёт только между вами.",
  none: "Открыт у обоих: в этой теме вы оба зависите от людей вокруг, и в паре её никто не держит.",
};

export function CompositeCenters({
  composite,
  active = null,
  onSelect,
}: {
  composite: Composite;
  active?: CenterId | null;
  onSelect?: (id: CenterId) => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 4 }}>
      {CENTER_ORDER.map((id) => {
        const source = composite.centerSource[id];
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect?.(id)}
            aria-pressed={selected}
            className="qc-focus flex w-full items-center rounded-[8px] px-2 py-1.5 text-left transition-colors"
            style={{ gap: 12, background: selected ? "rgba(122, 93, 168, 0.14)" : "transparent" }}
          >
            <span
              aria-hidden="true"
              className="shrink-0 rounded-[3px]"
              style={{
                width: 10,
                height: 10,
                background: SOURCE_COLOR[source],
                border: `1px solid ${source === "none" ? "var(--border)" : SOURCE_COLOR[source]}`,
              }}
            />
            <span className="text-text-primary" style={{ fontSize: 14 }}>
              {CENTERS[id].name}
            </span>
            <span className="ml-auto text-text-secondary" style={{ fontSize: 13 }}>
              {SOURCE_LABEL[source]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Пояснение к выбранному центру: что это, откуда в паре и что это значит. */
export function CenterExplain({ composite, id, onClose }: { composite: Composite; id: CenterId; onClose: () => void }) {
  const source = composite.centerSource[id];
  const center = CENTERS[id];
  return (
    <div className="rounded-[14px] border border-text-accent/40 bg-surface-1" style={{ padding: "14px 16px" }} role="status">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-text-primary" style={{ fontSize: 20, lineHeight: 1.2 }}>
            {center.name}
            <span className="ml-2 text-text-secondary" style={{ fontSize: 13, fontFamily: "var(--font-sans)" }}>
              · {SOURCE_LABEL[source]}
            </span>
          </div>
          <p className="mt-1 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {center.about}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть пояснение"
          className="qc-focus -mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-accent/10 hover:text-text-primary"
          style={{ fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-text-primary" style={{ fontSize: 15, lineHeight: 1.6 }}>
        {SOURCE_EXPLAIN[source]}
      </p>
    </div>
  );
}

/** Сколько связей каждого вида — короткая сводка над схемой. */
export function ConnectionSummary({ composite }: { composite: Composite }) {
  const counts = countKinds(composite);
  const shown = KIND_ORDER.filter((k) => counts[k] > 0);
  if (shown.length === 0) {
    return (
      <p className="text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
        Ни один канал в этой паре не замыкается. Это не приговор: значит, связь держится не на общей схеме, а на том, что
        вы выбираете делать вместе
      </p>
    );
  }
  return (
    <div className="flex flex-wrap" style={{ gap: 10 }}>
      {shown.map((kind) => (
        <span
          key={kind}
          className="inline-flex items-baseline rounded-[10px] border border-border px-3 py-1.5 text-text-primary"
          style={{ fontSize: 13, gap: 8 }}
          title={CONNECTION_KINDS[kind].about}
        >
          {CONNECTION_KINDS[kind].name}
          <span className="text-text-accent" style={{ fontSize: 13 }}>
            {counts[kind]}
          </span>
        </span>
      ))}
    </div>
  );
}
