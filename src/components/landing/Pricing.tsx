"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Section } from "./Section";
import { backend, type CreditPack, type Plan } from "@/lib/backend";
import { DEFAULT_CREDIT_PACKS, DEFAULT_PLANS, formatRub, monthlyEquivalent, yearDiscountPercent } from "@/lib/plansDefault";
import { track } from "@/components/analytics/track";

/**
 * ТАРИФЫ. Единица — профиль человека, кредиты — только на наставника.
 * Цены приходят из базы (таблица plans), здесь только вёрстка.
 * Никаких зачёркнутых цен, таймеров и «осталось 3 места».
 */

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [packs, setPacks] = useState<CreditPack[]>(DEFAULT_CREDIT_PACKS);
  useEffect(() => {
    let alive = true;
    Promise.all([backend.billing.plans(), backend.billing.creditPacks()]).then(([p, c]) => {
      if (!alive) return;
      if (p.length) setPlans(p);
      if (c.length) setPacks(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { plans, packs };
}

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

      <div className={`mt-8 grid gap-4 ${compact ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
        {plans.map((plan, i) => {
          const primary = i === 1;
          const price = period === "year" ? monthlyEquivalent(plan) : plan.price_month;
          const discount = yearDiscountPercent(plan);
          return (
            <div key={plan.id} className={`relative flex flex-col rounded-[20px] border p-6 md:p-7 ${primary ? "border-text-accent/70 bg-depth/25" : "border-border/60 bg-surface-1/40"}`}>
              {primary && <div className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[12px] text-primary-foreground">Чаще выбирают</div>}
              <div className="font-display text-[clamp(24px,2.4vw,32px)] text-text-primary">{plan.title}</div>
              <p className="mt-1 text-[14px] text-text-secondary">{plan.subtitle}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-[clamp(32px,3vw,44px)] leading-none text-text-primary">{formatRub(price)}</span>
                <span className="text-[14px] text-text-secondary">/ мес</span>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                {period === "year" ? `${formatRub(plan.price_year)} за год${discount > 0 ? ` · экономия ${discount}%` : ""}` : "Списание раз в месяц, отменить можно в любой день"}
              </p>
              <div className="mt-4 text-[14px] text-text-secondary">
                {plan.max_people === null ? "Людей без ограничений" : plan.max_people === 1 ? "Один человек — вы" : `До ${plan.max_people} человек`} · {plan.monthly_credits} сообщений наставнику в месяц
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-[15px] text-text-secondary">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-text-accent" aria-hidden="true">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout?plan=${plan.id}&period=${period}`}
                onClick={() => track("checkout_open", { plan: plan.id, period })}
                className={`mt-6 inline-flex h-12 items-center justify-center rounded-[12px] text-[16px] font-medium transition-opacity hover:opacity-90 ${primary ? "bg-accent text-primary-foreground" : "border border-text-accent/50 text-text-primary"}`}
              >
                Выбрать
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-[760px] text-center text-[14px] text-text-secondary">
        Бесплатно и без регистрации: центральный аркан, схема матрицы и первый вопрос в каждой из двенадцати сфер. Чтение оплаченного не ограничено — кредиты тратятся только на сообщения наставнику.
      </p>
    </div>
  );
}

export function CreditPacks() {
  const { packs } = usePlans();
  return (
    <div id="credits" className="scroll-mt-24">
      <div className="grid gap-3 sm:grid-cols-3">
        {packs.map((p) => (
          <Link key={p.id} href={`/checkout?pack=${p.id}`} onClick={() => track("checkout_open", { pack: p.id })} className="rounded-[16px] border border-border/60 bg-surface-1/40 p-5 transition-colors hover:border-text-accent/60">
            <div className="font-display text-[28px] text-text-primary">{p.credits}</div>
            <div className="text-[13px] text-text-secondary">сообщений наставнику</div>
            <div className="mt-3 text-[18px] text-text-primary">{formatRub(p.price)}</div>
            <div className="text-[12px] text-text-secondary">{(p.price / p.credits).toFixed(1)} ₽ за сообщение</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Секция тарифов на главной и страницах направлений. */
export function Pricing() {
  return (
    <Section id="pricing" title="Тарифы" subtitle="Единица — человек. Подписка открывает все шесть систем и все типы разбора по датам ваших людей.">
      <div className="mt-10">
        <PlansGrid compact />
      </div>
    </Section>
  );
}
