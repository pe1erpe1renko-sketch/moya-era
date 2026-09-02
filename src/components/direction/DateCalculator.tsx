"use client";

import { useMemo, useState } from "react";
import { MONTHS, isValidDate } from "@/lib/arcana";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const selectClass =
  "qc-focus h-14 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 pr-10 text-[17px] text-text-primary transition-colors focus:border-text-accent";

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 8"
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2 text-text-secondary"
    >
      <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export type DateParts = { day: string; month: string; year: string };

export type DateSelectsProps = {
  idPrefix: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
  gap?: number;
};

/** Три выпадающих списка с датой — переиспользуемый ряд полей. */
export function DateSelects({ idPrefix, value, onChange, gap = 12 }: DateSelectsProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  return (
    <div className="flex flex-col md:flex-row" style={{ gap }}>
      <div className="relative flex-1">
        <label className="sr-only" htmlFor={`${idPrefix}-day`}>
          День
        </label>
        <select
          id={`${idPrefix}-day`}
          className={selectClass}
          value={value.day}
          onChange={(e) => onChange({ ...value, day: e.target.value })}
        >
          <option value="">День</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Chevron />
      </div>

      <div className="relative flex-1">
        <label className="sr-only" htmlFor={`${idPrefix}-month`}>
          Месяц
        </label>
        <select
          id={`${idPrefix}-month`}
          className={selectClass}
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
        >
          <option value="">Месяц</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <Chevron />
      </div>

      <div className="relative flex-1">
        <label className="sr-only" htmlFor={`${idPrefix}-year`}>
          Год
        </label>
        <select
          id={`${idPrefix}-year`}
          className={selectClass}
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
        >
          <option value="">Год</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  );
}

export type DateCalculatorProps = {
  idPrefix: string;
  stage: "form" | "loading" | "result";
  onSubmit: (date: { day: number; month: number; year: number }) => void;
};

/** Три выпадающих списка с датой и кнопка расчёта — общий блок для страниц направлений. */
export function DateCalculator({ idPrefix, stage, onSubmit }: DateCalculatorProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const complete = day !== "" && month !== "" && year !== "";
  const dateInvalid = complete && !isValidDate(Number(day), Number(month), Number(year));
  const disabled = !complete || dateInvalid || stage === "loading";

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row" style={{ marginTop: 32 }}>
        <div className="relative flex-1">
          <label className="sr-only" htmlFor={`${idPrefix}-day`}>
            День
          </label>
          <select
            id={`${idPrefix}-day`}
            className={selectClass}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            <option value="">День</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <div className="relative flex-1">
          <label className="sr-only" htmlFor={`${idPrefix}-month`}>
            Месяц
          </label>
          <select
            id={`${idPrefix}-month`}
            className={selectClass}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">Месяц</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <div className="relative flex-1">
          <label className="sr-only" htmlFor={`${idPrefix}-year`}>
            Год
          </label>
          <select
            id={`${idPrefix}-year`}
            className={selectClass}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Год</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>

      {dateInvalid ? (
        <p className="text-text-secondary" style={{ marginTop: 10, fontSize: 14 }}>
          Такой даты не существует
        </p>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          !disabled && onSubmit({ day: Number(day), month: Number(month), year: Number(year) })
        }
        className="qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity"
        style={{ marginTop: 20, height: 54, paddingInline: 40, opacity: disabled ? 0.4 : 1 }}
      >
        {stage === "loading" ? "Считаем" : stage === "result" ? "Пересчитать" : "Рассчитать"}
      </button>
    </>
  );
}
