"use client";

import Link from "next/link";
import { DateField } from "@/components/reading/DateField";
import { useGoToReading } from "@/components/reading/CalcTheater";
import { arcanaImage } from "@/lib/arcanaImage";
import { arcanaName, isoToUrlDate } from "@/lib/matrix";
import type { NextAction, NextCard, NextShowcase } from "@/lib/nextSteps";

/**
 * ВИТРИНА «ДАЛЬШЕ» — конец каждой страницы разбора.
 *
 * Три-четыре крупные карточки: иллюстрация аркана, заголовок, одна живая
 * строка и кнопка. Язык нарочно другой, чем у разделов с вопросами выше:
 * разделы — это чтение, витрина — это выбор. Поэтому здесь нет строк с
 * замками и бледных ссылок в ряд, а есть карты на столе — с наклоном,
 * тенью и свечением под блоком.
 *
 * Данные карточек собирают серверные страницы (`lib/nextSteps`), сюда
 * они приходят готовыми. Поле даты внутри карточки ведёт в разбор через
 * ту же «сцену расчёта», что и калькуляторы направлений.
 */

export function NextSteps({ showcase, className = "" }: { showcase: NextShowcase; className?: string }) {
  const { cards, neighbors, also } = showcase;
  const foot = neighbors.length > 0 || also.length > 0;

  return (
    <section id="dalshe" className={`next-stage scroll-mt-24 ${className}`} aria-labelledby="dalshe-title">
      <div className="next-glow" aria-hidden="true" />
      <div className="relative">
        <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">Дальше</div>
        <h2 id="dalshe-title" className="mt-2 font-display text-[clamp(28px,3vw,44px)] leading-[1.05] text-text-primary">
          Что посмотреть следующим
        </h2>

        <div className="next-grid mt-7" data-count={cards.length}>
          {cards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>

        {foot && (
          <div className="next-foot">
            {neighbors.length > 0 && (
              <p>
                <span className="text-text-secondary">Соседние даты:</span>
                {neighbors.map((l) => (
                  <Link key={l.href} href={l.href} className="qc-focus next-foot-link">
                    {l.label}
                  </Link>
                ))}
              </p>
            )}
            {also.length > 0 && (
              <p>
                <span className="text-text-secondary">Эта же дата:</span>
                {also.map((l) => (
                  <Link key={l.href} href={l.href} className="qc-focus next-foot-link">
                    {l.label}
                  </Link>
                ))}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Card({ card }: { card: NextCard }) {
  return (
    <article className="next-card">
      <div className="next-art" aria-hidden="true">
        <img src={arcanaImage(card.art, "md")} alt="" loading="lazy" decoding="async" title={arcanaName(card.art)} />
      </div>
      <div className="next-text">
        {card.tag && <span className="next-tag">{card.tag}</span>}
        <h3 className="font-display text-[clamp(22px,1.9vw,28px)] leading-[1.12] text-text-primary">{card.title}</h3>
        <p className="mt-2 text-[15px] leading-[1.55] text-text-secondary">{card.line}</p>
      </div>
      <div className="next-act">
        <Action action={card.action} />
      </div>
    </article>
  );
}

function Action({ action }: { action: NextAction }) {
  const go = useGoToReading();

  if (action.kind === "link") {
    return (
      <Link href={action.href} className="qc-focus next-btn">
        {action.label}
      </Link>
    );
  }

  if (action.kind === "links") {
    return (
      <div className="flex flex-col gap-2">
        {action.items.map((item) => (
          <Link key={item.href} href={item.href} className="qc-focus next-btn next-btn--ghost">
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <DateField
      stacked
      label={action.fieldLabel}
      submitLabel={action.label}
      onSubmit={(iso) => go(action.pattern.replace("{date}", isoToUrlDate(iso)))}
    />
  );
}
