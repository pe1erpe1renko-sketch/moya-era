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
import { useGoToReading } from "@/components/reading/CalcTheater";
import { track } from "@/components/analytics/track";

export type FullReadingButtonProps = {
  /** Дата (и время/место), собранные на этой странице. */
  pending?: PendingBirth | null;
  /** Для совместимости — вторая дата. */
  partnerDate?: string | null;
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
 * Остальные направления пока ведут в кабинет через регистрацию —
 * до тех пор, пока у них не появятся свои страницы с адресами.
 */
export function FullReadingButton({
  pending = null,
  partnerDate = null,
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
      go(readingPath("sovmestimost", [pending.date, partnerDate]));
      return;
    }

    if (!isAuthenticated || !user) {
      router.push("/register");
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
