"use client";

import { CENTERS, CENTER_ORDER } from "@/lib/humandesign";
import { CONNECTION_KINDS, KIND_ORDER, countKinds, type Composite, type CenterSource } from "@/lib/pair";

/**
 * Откуда в паре взялся каждый центр и сколько связей какого вида.
 *
 * Самое интересное в композите — центры «только вместе»: их нет ни у
 * кого поодиночке, а вдвоём они загораются. Это и есть то, чем пара
 * отличается от двух отдельных людей.
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

export function CompositeCenters({ composite }: { composite: Composite }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {CENTER_ORDER.map((id) => {
        const source = composite.centerSource[id];
        return (
          <div key={id} className="flex items-center rounded-[8px] px-2 py-1" style={{ gap: 12 }}>
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
          </div>
        );
      })}
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
