"use client";

import Link from "next/link";
import { DateField } from "./DateField";

export type ResearchCardProps = {
  title: string;
  text: string;
  /** Если задано — поле даты внутри карточки, а не ссылка на другую страницу. */
  dateLabel?: string;
  onDate?: (iso: string) => void;
  /** Иначе — переход по ссылке. */
  href?: string;
  linkLabel?: string;
};

/**
 * ИССЛЕДОВАТЕЛЬСКИЙ БЛОК в конце сферы: следующий шаг вытекает из
 * прочитанного. Поле даты — внутри карточки: каждый лишний переход
 * теряет половину людей.
 */
export function ResearchCard({ title, text, dateLabel, onDate, href, linkLabel = "Открыть" }: ResearchCardProps) {
  return (
    <div className="rounded-[16px] border border-text-accent/25 bg-depth/25 p-5">
      <div className="text-[13px] uppercase tracking-[0.08em] text-text-accent">Следующий шаг</div>
      <h4 className="mt-2 font-display text-[22px] leading-tight text-text-primary">{title}</h4>
      <p className="mt-2 text-[15px] leading-[1.6] text-text-secondary">{text}</p>
      <div className="mt-4">
        {onDate ? (
          <DateField label={dateLabel} submitLabel="Смотреть" onSubmit={onDate} />
        ) : href ? (
          <Link href={href} className="inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
