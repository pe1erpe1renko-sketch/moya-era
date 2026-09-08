"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { ensureOwnerProfile } from "@/lib/profile";
import {
  readPendingBirth,
  savePendingBirth,
  setProfileSaveError,
  type PendingBirth,
} from "@/lib/pendingBirth";
import { readingPath } from "@/lib/matrix";
import { chartPath, chartUrlDateToIso, isoToChartUrlDate, type ChartSystem } from "@/lib/chartUrl";
import { useGoToReading } from "@/components/reading/CalcTheater";
import { track } from "@/components/analytics/track";
import { currentPath, leaveForAuth } from "@/lib/returnTo";

export type FullReadingButtonProps = {
  /** Дата (и время/место), собранные на этой странице. */
  pending?: PendingBirth | null;
  /** Для совместимости — вторая дата. */
  partnerDate?: string | null;
  /** Уточнение времени и места в адресе: '?t1=0940&g1=524901'. */
  query?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Кнопка «Открыть полный разбор».
 *
 * Матрица и совместимость по матрице ведут на ПОСТОЯННЫЙ АДРЕС разбора
 * (/matrica/13-07-1998): там открыты бесплатные вопросы, а замок стоит
 * уже внутри — регистрация не требуется, чтобы посмотреть.
 *
 * У всех шести направлений постоянные адреса по дате — регистрация не
 * нужна ни для одного. Запасной ход в кабинет остаётся только на случай
 * кнопки без даты.
 */
/** Направление витрины → система с постоянными адресами по дате. */
const DIRECTION_SYSTEM: Record<string, ChartSystem | undefined> = {
  numerology: "numerology",
  natal: "natal",
  humandesign: "humandesign",
};

export function FullReadingButton({
  pending = null,
  partnerDate = null,
  query = "",
  label = "Открыть полный разбор",
  className = "qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity hover:opacity-90",
  style = { marginTop: 20, height: 54, paddingInline: 40 },
}: FullReadingButtonProps) {
  const router = useRouter();
  const go = useGoToReading();
  const { isAuthenticated, user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (pending?.date) savePendingBirth(pending);

    const dir = pending?.direction;
    if (pending?.date && (dir === "matrix" || !dir)) {
      track("calc_submit", { direction: "matrix" });
      go(readingPath("matrica", [pending.date]));
      return;
    }
    if (pending?.date && dir === "synastry" && partnerDate) {
      track("calc_submit", { direction: "synastry" });
      go(`${readingPath("sovmestimost", [pending.date, partnerDate])}${query}`);
      return;
    }
    // У карты дня адрес свой: он не по системе из CHART_SYSTEMS, а по
    // дате рождения — /taro/26-07-1990.
    if (pending?.date && dir === "tarot") {
      const iso = chartUrlDateToIso(isoToChartUrlDate(pending.date));
      if (iso) {
        track("calc_submit", { direction: "tarot" });
        go(`/taro/${isoToChartUrlDate(iso)}`);
        return;
      }
    }
    // У нумерологии, натальной карты и дизайна человека есть свои
    // постоянные адреса: ведём туда, а не через регистрацию.
    const system = DIRECTION_SYSTEM[dir ?? ""];
    if (pending?.date && system) {
      const iso = chartUrlDateToIso(isoToChartUrlDate(pending.date));
      if (iso) {
        track("calc_submit", { direction: dir });
        go(`${chartPath(system, iso)}${query}`);
        return;
      }
    }

    if (!isAuthenticated || !user) {
      leaveForAuth(router, "register", currentPath());
      return;
    }

    setBusy(true);
    const ok = await ensureOwnerProfile(user.id, pending ?? readPendingBirth());
    setBusy(false);
    if (!ok) setProfileSaveError();
    router.push("/cabinet");
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className} style={style}>
      {label}
    </button>
  );
}
