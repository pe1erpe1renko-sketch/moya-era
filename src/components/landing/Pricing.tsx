"use client";

import { useState } from "react";
import Link from "next/link";
import { Section } from "./Section";
import { usePlans } from "@/lib/usePlans";
import { formatRub, monthlyEquivalent, yearDiscountPercent } from "@/lib/plansDefault";
import { PLAN_COMMON, creditsSpan, planRows } from "@/lib/lock";
import { track } from "@/components/analytics/track";

/**
 * ТАРИФЫ. Продаём подписку целиком: отдельных разборов на продажу нет.
 *
 * У каждого тарифа — что входит, одним и тем же списком; отличия видны
 * сразу, в отдельной табличке: сколько людей на сайте, сколько в боте,
 * сколько кредитов в месяц. Всё остальное одинаково: шесть систем, все
 * разборы, карта дня, бот, архив.
 *
 * Цены, люди и кредиты приходят из таблицы `plans` (лимиты бота — из
 * кода, `BOT_LIMITS`), здесь только вёрстка. Все три тарифа показаны
 * одинаково честно: без «чаще выбирают», без подсветки того, с чего
 * человек пришёл. Никаких зачёркнутых цен, таймеров и «осталось 3 места».
 */

export { usePlans } from "@/lib/usePlans";

export function PlansGrid({ compact = false }: { compact?: boolean }) {
  const { plans } = usePlans();
  const [period, setPeriod] = useState<"month" | "year">("month");

  return (
    <div>
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-border p-1" role="tablist" aria-label="Период оплаты">
        {(["month", "year"] as const).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)} className={`rounded-full px-4 py-2 text-[14px] transition-colors ${period === p ? "bg-accent text-primary-foreground" : "text-text-secondary"}`}>
            {p === "month" ? "Помесячно" : "За год"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const price = period === "year" ? monthlyEquivalent(plan) : plan.price_month;
          const discount = yearDiscountPercent(plan);
          return (
            <div key={plan.id} className="flex flex-col rounded-[20px] border border-border/60 bg-surface-1/40 p-6 md:p-7">
              <div className="font-display text-[clamp(24px,2.4vw,32px)] text-text-primary">{plan.title}</div>
              <p className="mt-1 text-[14px] text-text-secondary">{plan.subtitle}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-[clamp(32px,3vw,44px)] leading-none text-text-primary">{formatRub(price)}</span>
                <span className="text-[14px] text-text-secondary">/ мес</span>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                {period === "year" ? `${formatRub(plan.price_year)} за год${discount > 0 ? ` · дешевле помесячной на ${discount}%` : ""}` : "Списание раз в месяц, отменить можно в любой день"}
              </p>

              {/* Чем тариф отличается от соседей — и только это */}
              <dl className="plan-diff mt-5">
                {planRows(plan).map((row) => (
                  <div key={row.id} className="plan-diff-row">
                    <dt className="text-text-secondary">{row.label}</dt>
                    <dd className="text-text-primary">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {/* Что входит — одно и то же в каждом тарифе */}
              {!compact && (
                <>
                  <div className="mt-5 text-[12px] uppercase tracking-[0.08em] text-text-secondary">Что входит</div>
                  <ul className="mt-2 flex-1 space-y-1.5 text-[14px] leading-[1.45] text-text-secondary">
                    {PLAN_COMMON.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-text-accent" aria-hidden="true">·</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link
                href={`/checkout?plan=${plan.id}&period=${period}`}
                onClick={() => track("checkout_open", { plan: plan.id, period })}
                className="qc-focus mt-6 inline-flex h-12 items-center justify-center rounded-[12px] bg-accent text-[16px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Выбрать
              </Link>
            </div>
          );
        })}
      </div>

      {compact && (
        <div className="mx-auto mt-8 max-w-[860px] rounded-[16px] border border-border/60 p-5">
          <div className="text-[12px] uppercase tracking-[0.08em] text-text-secondary">Что входит в каждый тариф</div>
          <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-[14px] leading-[1.45] text-text-secondary sm:grid-cols-2">
            {PLAN_COMMON.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-text-accent" aria-hidden="true">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mx-auto mt-6 max-w-[760px] text-center text-[14px] text-text-secondary">
        Тарифы отличаются только числом людей и кредитами. Бесплатно и без регистрации у каждой системы есть своя часть: центральный аркан и первый вопрос в каждой сфере матрицы, Солнце и Луна в карте, тип и стратегия в бодиграфе, числа даты, карта дня, схема пары.
      </p>
    </div>
  );
}

/**
 * Пакеты кредитов — отдельно от тарифов и ниже них. Кредиты тратятся на
 * две вещи: сообщения наставнику и расклады таро. В каждом тарифе есть
 * свой пакет на месяц; докупленные не сгорают.
 */
export function CreditPacks() {
  const { plans, packs } = usePlans();
  const monthly = creditsSpan(plans);
  return (
    <div id="credits" className="scroll-mt-24">
      <p className="max-w-[760px] text-[15px] leading-[1.6] text-text-secondary">
        Кредиты тратятся на две вещи: сообщения наставнику и расклады таро. Чтение разборов, карта дня и схемы кредитов не тратят.
        {monthly ? ` В каждом тарифе свой пакет на месяц — ${monthly} кредитов.` : ""} Если не хватило — докупите отдельно: эти кредиты не сгорают и остаются после отмены подписки.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {packs.map((p) => (
          <Link key={p.id} href={`/checkout?pack=${p.id}`} onClick={() => track("checkout_open", { pack: p.id })} className="qc-focus rounded-[16px] border border-border/60 bg-surface-1/40 p-5 transition-colors hover:border-text-accent/60">
            <div className="font-display text-[28px] text-text-primary">{p.credits}</div>
            <div className="text-[13px] text-text-secondary">кредитов — наставник и расклады</div>
            <div className="mt-3 text-[18px] text-text-primary">{formatRub(p.price)}</div>
            <div className="text-[12px] text-text-secondary">{(p.price / p.credits).toFixed(1)} ₽ за кредит</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Секция тарифов на главной и страницах направлений. */
export function Pricing() {
  return (
    <Section id="pricing" title="Тарифы" subtitle="Одна подписка открывает всё: шесть систем, каждый вопрос в каждом разборе, карта дня, сводка в Telegram и архив. Тарифы отличаются только числом людей и кредитами.">
      <div className="mt-10">
        <PlansGrid compact />
      </div>
    </Section>
  );
}
