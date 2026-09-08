"use client";

import type { Person } from "@/lib/backend";
import { personLabel } from "@/lib/people";

/**
 * Переключатель «для кого считаем» — там же, где результат. Показывается
 * только вошедшему и только если людей в профиле больше одного.
 */
export function PersonSwitch({
  id,
  label = "Кого посмотрим",
  people,
  value,
  onChange,
}: {
  id: string;
  label?: string;
  people: Person[];
  value: string | null;
  onChange: (person: Person) => void;
}) {
  if (people.length < 2) return null;
  return (
    <div className="mb-6 md:max-w-[380px]">
      <label htmlFor={id} className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          className="qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 pr-10 text-[16px] text-text-primary transition-colors focus:border-text-accent"
          value={value ?? ""}
          onChange={(e) => {
            const next = people.find((p) => p.id === e.target.value);
            if (next) onChange(next);
          }}
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {personLabel(p)}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 12 8" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2 text-text-secondary">
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
