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

export type FullReadingButtonProps = {
  /** Дата (и время/место), собранные на этой странице. */
  pending?: PendingBirth | null;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Кнопка «Открыть полный разбор»: сохраняет дату в sessionStorage и ведёт
 * на регистрацию либо сразу в кабинет, если человек уже вошёл.
 */
export function FullReadingButton({
  pending = null,
  label = "Открыть полный разбор",
  className = "qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity hover:opacity-90",
  style = { marginTop: 20, height: 54, paddingInline: 40 },
}: FullReadingButtonProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    if (pending?.date) savePendingBirth(pending);

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
