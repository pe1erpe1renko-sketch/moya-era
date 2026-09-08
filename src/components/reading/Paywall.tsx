"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { savePendingBirth } from "@/lib/pendingBirth";
import { authHref, currentPath, leaveForAuth, rememberAfterPay } from "@/lib/returnTo";
import { usePlans } from "@/lib/usePlans";
import { fromPriceLine, hereLine, lockItems, type LockCounts, type LockReason, type LockSystem } from "@/lib/lock";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { track } from "@/components/analytics/track";

/**
 * ЗАМОК. Один на весь сайт, и смысл у него один: продаём подписку
 * целиком, а не отдельный разбор. Отдельных разборов на продажу нет.
 *
 * Что говорит: не «откройте этот разбор за N», а «Подписка открывает
 * всё» — и список: этот разбор целиком (первой строкой — где человек
 * сейчас), остальные пять систем по этой дате, разборы близких, карта
 * дня, сводка в Telegram, наставник. Цена — «от N ₽ в месяц» из
 * таблицы тарифов. Одна кнопка «Открыть всё» ведёт на тарифы, где все
 * три тарифа показаны честно, без подталкивания. Под кнопкой тихо:
 * «Отменить можно в любой день».
 *
 * Без таймеров, без «осталось 3 места», без зачёркнутых цен — это
 * принципиально: весь рынок работает на фальшивом дефиците, мы
 * работаем на объяснении.
 *
 * Две формы: окно (`Paywall`) поверх разбора и тело (`LockBody`),
 * которое встаёт прямо в карточку — в кабинете у пустой карточки
 * человека, в панели бота, в окне образа.
 */

export type { LockReason, LockSystem } from "@/lib/lock";

export type LockBodyProps = {
  /** где стоит замок — от этого зависит первая строка списка */
  system: LockSystem;
  /** сферы и вопросы разбора, у которого стоит замок (матрица) */
  counts?: LockCounts;
  /** дата, по которой человек хочет открыть разбор — уедет в профиль после регистрации */
  date?: string;
  /** компактно: без иллюстраций, для карточек кабинета и окна образа */
  compact?: boolean;
  /** заголовок окна — для aria-labelledby */
  titleId?: string;
};

export function LockBody({ system, counts, date, compact = false, titleId }: LockBodyProps) {
  const { plans } = usePlans();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const items = lockItems(system, plans, counts);
  const price = fromPriceLine(plans);

  const openAll = () => {
    track("lock_open_all", { system });
    // После оплаты — обратно сюда, а не в кабинет.
    rememberAfterPay(currentPath());
    // После регистрации по дороге к оплате дата попадёт в профиль — и
    // разбор откроется сразу, без повторного ввода.
    if (!isAuthenticated && date) savePendingBirth({ date, direction: system });
  };

  return (
    <div className={compact ? "lock lock--compact" : "lock"}>
      <h3 id={titleId} className="lock-title font-display text-text-primary">
        Подписка открывает всё
      </h3>
      <ul className="lock-list">
        {items.map((it) => (
          <li key={it.id} className={`lock-item${it.here ? " lock-item--here" : ""}`}>
            {!compact && (
              <span className="lock-art" aria-hidden="true">
                <ArcanaImage n={it.art} width={34} rounded={6} />
              </span>
            )}
            <span className="lock-text">{it.text}</span>
          </li>
        ))}
      </ul>
      {price && <div className="lock-price font-display text-text-primary">{price}</div>}
      <div className="lock-actions">
        <Link href="/tarify" onClick={openAll} className="qc-focus lock-btn">
          Открыть всё
        </Link>
        <span className="lock-cancel text-text-secondary">Отменить можно в любой день</span>
      </div>
      {!isAuthenticated && (
        <p className="lock-login text-text-secondary">
          Уже есть подписка?{" "}
          <Link
            href={authHref("login", pathname)}
            onClick={(e) => {
              e.preventDefault();
              leaveForAuth(router, "login");
            }}
            className="text-text-accent underline-offset-4 hover:underline"
          >
            Войти
          </Link>
        </p>
      )}
    </div>
  );
}

export type PaywallProps = {
  open: boolean;
  onClose: () => void;
  system: LockSystem;
  counts?: LockCounts;
  date?: string;
  /** почему закрыто: нет подписки / этот человек не в списке / не вошёл */
  reason?: LockReason;
};

export function Paywall({ open, onClose, system, counts, date, reason }: PaywallProps) {
  useEffect(() => {
    if (!open) return;
    track("paywall_open", { system, reason: reason ?? "no_subscription" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, system, reason]);

  if (!open) return null;

  // Подписчик открыл дату человека, которого нет в списке: подписка у
  // него уже есть, продавать её заново незачем — нужно добавить человека.
  const addPerson = reason === "person_not_added";
  const here = hereLine(system, counts);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={onClose}
    >
      <div className="lock-sheet w-full max-w-[560px] rounded-t-[24px] border border-border bg-bg-page p-6 sm:rounded-[24px] md:p-8" onClick={(e) => e.stopPropagation()}>
        {addPerson ? (
          <>
            <h3 id="paywall-title" className="lock-title font-display text-text-primary">
              Добавьте этого человека в свой список
            </h3>
            <p className="mt-3 text-[15px] leading-[1.6] text-text-secondary">
              Подписка открывает разборы людей из вашего списка. Добавьте — и по этой дате откроется всё сразу
              {here ? `: ${here[0].toLowerCase()}${here.slice(1)}` : ""}, а с ним и совместимость с вами.
            </p>
            <div className="lock-actions mt-6">
              <Link href={`/cabinet?add=${date ?? ""}`} className="qc-focus lock-btn">
                Добавить человека
              </Link>
            </div>
          </>
        ) : (
          <LockBody system={system} counts={counts} date={date} titleId="paywall-title" />
        )}
        <button type="button" onClick={onClose} className="qc-focus mt-4 inline-flex h-11 items-center justify-center rounded-[12px] border border-border px-5 text-[15px] text-text-primary">
          Позже
        </button>
      </div>
    </div>
  );
}
