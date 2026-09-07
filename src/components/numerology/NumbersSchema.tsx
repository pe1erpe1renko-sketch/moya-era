"use client";

import { NUMEROLOGY_NUMBERS, numberValue, squareLabels, type NumerologyChart } from "@/lib/numerology";

/**
 * СХЕМА ЧИСЕЛ — бесплатная часть страницы.
 *
 * Четыре числа крупно и квадрат Пифагора рядом: это и есть расчёт, он
 * виден всем без регистрации, как октаграмма у матрицы и колесо у
 * натальной карты. Замок стоит на текстах, а не на схеме.
 */

/** Порядок ячеек по столбцам, как принято в квадрате: 1-4-7, 2-5-8, 3-6-9. */
const CELL_ORDER = [1, 4, 7, 2, 5, 8, 3, 6, 9];

export function NumbersSchema({ chart, className }: { chart: NumerologyChart; className?: string }) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {NUMEROLOGY_NUMBERS.map((n) => {
          const value = numberValue(chart, n.id);
          const master = value === 11 || value === 22;
          return (
            <div key={n.id} className="rounded-[16px] border border-border bg-surface-1" style={{ padding: "16px 14px" }}>
              <div
                className="font-mono"
                style={{
                  fontSize: "clamp(32px, 3.4vw, 52px)",
                  lineHeight: 1,
                  color: master ? "var(--text-accent)" : "var(--text-primary)",
                }}
              >
                {value}
              </div>
              <div className="mt-2 text-text-primary" style={{ fontSize: 14, lineHeight: 1.3 }}>
                {n.title}
              </div>
              <div className="mt-1 text-text-secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                {n.id === "year" ? `на ${chart.forYear} год` : n.about}
              </div>
              {master && (
                <div className="mt-2 text-text-accent" style={{ fontSize: 11 }}>
                  мастер-число
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Квадрат Пифагора: девять ячеек с плотностью каждой цифры.
 *
 * ПУСТАЯ ЯЧЕЙКА ПОДПИСАНА СЛОВОМ, а не прочерком: прочерк читался как
 * «не посчиталось», хотя пустота — такое же значение, как и цифры. Под
 * квадратом об этом сказано прямо, а нажатие на любую ячейку, пустую
 * или нет, открывает её разбор в списке ниже.
 */
export function PythagorasSquare({
  chart,
  className,
  onSelect,
}: {
  chart: NumerologyChart;
  className?: string;
  /** нажатие на ячейку: цифра 1–9 */
  onSelect?: (digit: number) => void;
}) {
  const { counts } = chart.square;
  return (
    <div className={className}>
      <div className="grid grid-cols-3" style={{ gap: "clamp(8px, 1vw, 14px)" }}>
        {CELL_ORDER.map((n) => {
          const count = counts[n] ?? 0;
          const label = squareLabels[n - 1];
          const Cell = onSelect ? "button" : "div";
          return (
            <div key={n} className="flex flex-col items-center">
              <Cell
                type={onSelect ? "button" : undefined}
                onClick={onSelect ? () => onSelect(n) : undefined}
                aria-label={onSelect ? `${label}: ${count > 0 ? `${count} раз` : "пусто"} — открыть разбор` : undefined}
                className={`flex w-full items-center justify-center rounded-[12px] border border-border bg-surface-1 ${
                  onSelect ? "qc-focus transition-colors hover:border-text-accent/60" : ""
                }`}
                style={{ aspectRatio: "1 / 1", minHeight: 62 }}
              >
                {count > 0 ? (
                  <span className="font-mono text-text-primary" style={{ fontSize: "clamp(15px, 1.4vw, 22px)" }}>
                    {String(n).repeat(count)}
                  </span>
                ) : (
                  <span className="text-text-secondary" style={{ fontSize: "clamp(12px, 1vw, 14px)", opacity: 0.7 }}>
                    пусто
                  </span>
                )}
              </Cell>
              <span className="mt-1.5 text-text-secondary" style={{ fontSize: 11 }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Пустая клетка — тоже значение: этой цифры в дате нет, и это качество не выражено. Что это значит — в разборе
      </p>
    </div>
  );
}

/** Как получились четыре рабочих числа — арифметика на виду. */
export function WorkingNumbers({ chart }: { chart: NumerologyChart }) {
  const { day, month, year, square } = chart;
  const pad = (n: number, len: number) => String(n).padStart(len, "0");
  const shown = [...pad(day, 2), ...pad(month, 2), ...pad(year, 4)].map(Number);
  const firstDayDigit = Number(String(day)[0]);

  const rows = [
    { formula: `${shown.join("+")} = ${square.first}`, text: "первое — сумма всех цифр даты" },
    { formula: `${String(square.first).split("").join("+")} = ${square.second}`, text: "второе — сумма цифр первого" },
    {
      formula: `|${square.first} − 2×${firstDayDigit}| = ${square.third}`,
      text: "третье — первое минус удвоенная первая цифра дня, по модулю",
    },
    { formula: `${String(square.third).split("").join("+")} = ${square.fourth}`, text: "четвёртое — сумма цифр третьего" },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {rows.map((r) => (
        <div key={r.text}>
          <div className="font-mono text-text-accent" style={{ fontSize: "clamp(13px, 1vw, 15px)" }}>
            {r.formula}
          </div>
          <div className="mt-0.5 text-text-secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
            {r.text}
          </div>
        </div>
      ))}
    </div>
  );
}
