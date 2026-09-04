import Link from "next/link";
import { CHART_SYSTEMS, chartPath, chartUrlDateToIso, isoToChartUrlDate, type ChartSystem } from "@/lib/chartUrl";
import { formatBirthDate } from "@/lib/pendingBirth";
import { readingPath } from "@/lib/matrix";

/**
 * Перелинковка страниц карты дня — как у остальных систем.
 *
 * Отдельный компонент, а не общий `ChartCrossLinks`: у таро нет адреса в
 * `CHART_SYSTEMS` и быть не должно. Те три системы считают устройство
 * человека по дате и не меняются; карта дня меняется каждый день, и
 * складывать их в один список значило бы обещать поисковику одинаковые
 * страницы там, где они разные.
 */

const dayShift = (iso: string, days: number): string => {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
};

const linkClass =
  "qc-focus rounded-[12px] border border-border px-4 py-3 text-text-primary transition-colors hover:border-text-accent/60";

export function TarotCrossLinks({ iso }: { iso: string }) {
  const prev = dayShift(iso, -1);
  const next = dayShift(iso, 1);
  const inRange = (d: string) => chartUrlDateToIso(isoToChartUrlDate(d)) !== null;

  return (
    <nav className="mt-12 border-t border-border pt-8" aria-label="Другие разборы этой даты">
      <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Эта же дата в других системах
      </div>
      <div className="mt-3 flex flex-wrap" style={{ gap: 10 }}>
        {(Object.keys(CHART_SYSTEMS) as ChartSystem[]).map((system) => (
          <Link key={system} href={chartPath(system, iso)} className={linkClass} style={{ fontSize: 15 }}>
            {CHART_SYSTEMS[system].title} на {formatBirthDate(iso)}
          </Link>
        ))}
        <Link href={readingPath("matrica", [iso])} className={linkClass} style={{ fontSize: 15 }}>
          Матрица судьбы на {formatBirthDate(iso)}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap" style={{ gap: 10 }}>
        {inRange(prev) && (
          <Link href={`/taro/${isoToChartUrlDate(prev)}`} className={linkClass} style={{ fontSize: 15 }}>
            ← {formatBirthDate(prev)}
          </Link>
        )}
        {inRange(next) && (
          <Link href={`/taro/${isoToChartUrlDate(next)}`} className={linkClass} style={{ fontSize: 15 }}>
            {formatBirthDate(next)} →
          </Link>
        )}
        <Link href="/taro" className={linkClass} style={{ fontSize: 15 }}>
          Посчитать по своей дате
        </Link>
      </div>
    </nav>
  );
}
