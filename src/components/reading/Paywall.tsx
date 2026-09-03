"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { savePendingBirth } from "@/lib/pendingBirth";

export type PaywallProps = {
  open: boolean;
  onClose: () => void;
  /** дата, по которой человек хочет открыть разбор — уедет в профиль после регистрации */
  date?: string;
  freeCount: number;
  totalCount: number;
  /** почему закрыто: нет подписки / этот человек не в списке */
  reason?: "no_subscription" | "person_not_added" | "not_logged_in";
};

/**
 * Замок. Без таймеров, без «осталось 3 места», без зачёркнутых цен —
 * это принципиально: весь рынок работает на фальшивом дефиците,
 * мы работаем на объяснении.
 */
export function Paywall({ open, onClose, date, freeCount, totalCount, reason }: PaywallProps) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const why = reason ?? (isAuthenticated ? "no_subscription" : "not_logged_in");

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="paywall-title" onClick={onClose}>
      <div className="w-full max-w-[520px] rounded-t-[24px] border border-border bg-bg-page p-6 sm:rounded-[24px] md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="text-[13px] uppercase tracking-[0.08em] text-text-accent">Полный разбор</div>
        <h3 id="paywall-title" className="mt-2 font-display text-[clamp(24px,3vw,32px)] leading-tight text-text-primary">
          {why === "person_not_added" ? "Добавьте этого человека в кабинет" : "Открыть все вопросы по этой дате"}
        </h3>
        <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
          {why === "person_not_added"
            ? "По подписке открыты разборы людей из вашего списка. Добавьте этого человека — и вся его матрица откроется сразу, включая совместимость с вами."
            : `Сейчас открыто ${freeCount} из ${totalCount} вопросов. Подписка открывает всё: двенадцать сфер, десять типов разбора, аркан дня и личный год — по этой дате и по датам ваших близких.`}
        </p>
        <ul className="mt-4 space-y-2 text-[15px] text-text-secondary">
          <li>· Читать оплаченное можно без ограничений</li>
          <li>· Отменить можно в любой день</li>
          <li>· Никаких таймеров и «последних мест» — цена одна</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {why === "not_logged_in" ? (
            <Link
              href="/register"
              onClick={() => date && savePendingBirth({ date, direction: "matrix" })}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-[12px] bg-accent px-5 text-[16px] font-medium text-primary-foreground"
            >
              Создать аккаунт
            </Link>
          ) : why === "person_not_added" ? (
            <Link href={`/cabinet?add=${date ?? ""}`} className="inline-flex h-12 flex-1 items-center justify-center rounded-[12px] bg-accent px-5 text-[16px] font-medium text-primary-foreground">
              Добавить человека
            </Link>
          ) : (
            <Link href="/tarify" className="inline-flex h-12 flex-1 items-center justify-center rounded-[12px] bg-accent px-5 text-[16px] font-medium text-primary-foreground">
              Смотреть тарифы
            </Link>
          )}
          <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-[12px] border border-border px-5 text-[16px] text-text-primary">
            Позже
          </button>
        </div>
        {why === "not_logged_in" && (
          <p className="mt-4 text-[13px] text-text-secondary">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-text-accent underline-offset-4 hover:underline">
              Войти
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
