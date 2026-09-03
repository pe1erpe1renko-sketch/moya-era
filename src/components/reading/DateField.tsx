"use client";

import { useId, useState } from "react";
import { MONTHS } from "@/lib/arcana";
import { toIsoDate } from "@/lib/pendingBirth";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1919 }, (_, i) => THIS_YEAR - i);

const selectClass =
  "qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-3 pr-8 text-[16px] text-text-primary transition-colors focus:border-text-accent";

function Chevron() {
  return (
    <svg viewBox="0 0 12 8" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-text-secondary">
      <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function isValid(d: number, m: number, y: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export type DateFieldProps = {
  label?: string;
  submitLabel?: string;
  compact?: boolean;
  onSubmit: (iso: string) => void;
  busy?: boolean;
};

/** Поле даты из трёх селектов — тот же паттерн, что в калькуляторах направлений. */
export function DateField({ label, submitLabel = "Рассчитать", compact = false, onSubmit, busy = false }: DateFieldProps) {
  const id = useId();
  const [d, setD] = useState<number | "">("");
  const [m, setM] = useState<number | "">("");
  const [y, setY] = useState<number | "">("");
  const ready = d !== "" && m !== "" && y !== "" && isValid(d, m, y);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(toIsoDate(d as number, m as number, y as number));
      }}
      className="w-full"
    >
      {label && (
        <label htmlFor={`${id}-d`} className="mb-2 block text-[14px] text-text-secondary">
          {label}
        </label>
      )}
      <div className={`grid gap-2 ${compact ? "grid-cols-[1fr_1.4fr_1.1fr_auto]" : "grid-cols-[1fr_1.5fr_1.2fr] sm:grid-cols-[1fr_1.5fr_1.2fr_auto]"}`}>
        <div className="relative">
          <select id={`${id}-d`} value={d} onChange={(e) => setD(e.target.value ? Number(e.target.value) : "")} className={selectClass} aria-label="День">
            <option value="">День</option>
            {DAYS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <Chevron />
        </div>
        <div className="relative">
          <select value={m} onChange={(e) => setM(e.target.value ? Number(e.target.value) : "")} className={selectClass} aria-label="Месяц">
            <option value="">Месяц</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
          <Chevron />
        </div>
        <div className="relative">
          <select value={y} onChange={(e) => setY(e.target.value ? Number(e.target.value) : "")} className={selectClass} aria-label="Год">
            <option value="">Год</option>
            {YEARS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <Chevron />
        </div>
        <button
          type="submit"
          disabled={!ready || busy}
          className={`qc-focus h-12 rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground transition-opacity disabled:opacity-40 ${compact ? "" : "col-span-3 sm:col-span-1"}`}
        >
          {busy ? "…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
