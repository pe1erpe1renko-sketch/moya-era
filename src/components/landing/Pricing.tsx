"use client";

import { useState } from "react";
import Link from "next/link";
import { Section } from "./Section";


type Plan = {
  id: string;
  title: string;
  lead: string;
  price?: string;
  note?: string;
  priceMonth?: string;
  priceYear?: string;
  noteMonth?: string;
  noteYear?: string;
  features: string[];
  warning?: string;
  action: string;
  primary: boolean;
};

const PLANS: Plan[] = [
  {
    id: "free",
    title: "Знакомство",
    lead: "Если хочется просто посмотреть и ничего пока не решать",
    price: "0 ₽",
    note: "Навсегда",
    features: [
      "Центральный аркан по дате рождения",
      "Короткий разбор: что это за число и о чём оно",
      "Без регистрации и без карты",
    ],
    action: "Посмотреть свой аркан",
    primary: false,
  },
  {
    id: "trial",
    title: "Пробный доступ",
    lead: "Если уже интересно, но платить сразу за месяц не хочется",
    price: "249 ₽",
    note: "Три дня полного доступа",
    features: [
      "Все шесть систем, полные разборы",
      "Своё небо на минуту рождения",
      "Дневник наблюдений",
      "Отменить можно в первый же день",
    ],
    warning: "Через три дня — 690 ₽ в месяц, если не отменить",
    action: "Открыть на три дня",
    primary: false,
  },
  {
    id: "sub",
    title: "Подписка",
    lead: "Если хочется разбираться в себе не один вечер, а спокойно и подолгу",
    priceMonth: "690 ₽",
    priceYear: "4 900 ₽",
    noteMonth: "В месяц",
    noteYear: "В год — это 408 ₽ в месяц",
    features: [
      "Всё из пробного, без ограничения по времени",
      "Профили близких: партнёр, ребёнок, коллега",
      "Совместимость между любыми двумя профилями",
      "Карта дня утром в Telegram",
      "Разборы обновляются вместе с транзитами",
      "Отмена в один шаг, без звонков и писем",
    ],
    action: "Оформить подписку",
    primary: true,
  },
];

const MOBILE_ORDER: Record<string, string> = {
  sub: "order-1 md:order-none",
  trial: "order-2 md:order-none",
  free: "order-3 md:order-none",
};

function Price({ value }: { value: string }) {
  const number = value.split(" ₽")[0];
  return (
    <div
      className="font-mono text-text-primary"
      style={{ fontSize: "clamp(32px, 2.9vw, 50px)", marginTop: 22, lineHeight: 1.05 }}
    >
      <span>{number}</span>
      <span
        style={{
          fontSize: "62%",
          color: "var(--text-primary)",
          opacity: 0.7,
          marginLeft: 6,
          verticalAlign: "baseline",
        }}
      >
        ₽
      </span>
    </div>
  );
}

export function Pricing() {
  const [period, setPeriod] = useState<"month" | "year">("year");

  return (
    <Section
      id="pricing"
      title="Тарифы"
      subtitle="Один тариф открывает всё. Никаких докупок внутри"
    >
      <div className="pricing-wide">
        {/* Period switch */}
        <div className="mt-7 flex justify-center">
          <div
            className="flex items-center rounded-full bg-surface-1 p-1"
            style={{ border: "1px solid var(--border)" }}
            role="group"
            aria-label="Период оплаты"
          >
            {(["month", "year"] as const).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPeriod(p)}
                  className="pricing-period"
                  data-active={active}
                >
                  {p === "month" ? "Месяц" : "Год"}
                  {p === "year" && (
                    <span className="ml-2 text-text-accent" style={{ fontSize: 12 }}>
                      −41%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div className="pricing-grid mt-10">
          {PLANS.map((plan) => {
            const price =
              plan.id === "sub"
                ? period === "year"
                  ? plan.priceYear
                  : plan.priceMonth
                : plan.price;
            const note =
              plan.id === "sub"
                ? period === "year"
                  ? plan.noteYear
                  : plan.noteMonth
                : plan.note;

            return (
              <div
                key={plan.id}
                className={`pricing-card ${MOBILE_ORDER[plan.id]}`}
                data-primary={plan.primary}
              >
                {plan.primary && <span className="pricing-card-glow" aria-hidden="true" />}

                <div className="relative flex h-full flex-col">
                  <h3
                    className="font-display text-text-primary"
                    style={{
                      fontSize: "clamp(20px, 1.6vw, 28px)",
                      fontWeight: 400,
                      lineHeight: 1.15,
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <span>{plan.title}</span>
                    {plan.primary && (
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          color: "var(--text-accent)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Основной
                      </span>
                    )}
                  </h3>

                  <p
                    className="text-text-secondary"
                    style={{ fontSize: "clamp(13px, 1.05vw, 16px)", lineHeight: 1.45, marginTop: 8 }}
                  >
                    {plan.lead}
                  </p>

                  {price && <Price value={price} />}

                  <div
                    className="text-text-secondary"
                    style={{ fontSize: "clamp(13px, 1vw, 15px)", marginTop: 6 }}
                  >
                    {note}
                  </div>

                  <div
                    style={{
                      marginTop: 22,
                      height: 1,
                      background: "var(--border)",
                      opacity: 0.35,
                    }}
                  />

                  <ul className="flex flex-col" style={{ marginTop: 20, gap: 12 }}>
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex text-text-secondary"
                        style={{ fontSize: "clamp(13px, 1.05vw, 16px)", lineHeight: 1.5 }}
                      >
                        <span
                          aria-hidden="true"
                          className="text-text-accent"
                          style={{ marginRight: 10 }}
                        >
                          ·
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.warning && (
                    <p
                      className="text-text-secondary"
                      style={{ fontSize: 12, opacity: 0.75, marginTop: 16 }}
                    >
                      {plan.warning}
                    </p>
                  )}

                  <div className="mt-auto pt-7">
                    {plan.id === "free" ? (
                      <Link
                        href="/#quick-calc"
                        className={plan.primary ? "pricing-btn-solid" : "pricing-btn-outline"}
                      >
                        {plan.action}
                      </Link>
                    ) : (
                      <Link
                        href={`/checkout?plan=${plan.id === "trial" ? "trial" : "sub"}&period=${
                          plan.id === "trial" ? "3d" : period === "year" ? "12m" : "1m"
                        }`}
                        className={plan.primary ? "pricing-btn-solid" : "pricing-btn-outline"}
                      >
                        {plan.action}
                      </Link>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        <p
          className="mx-auto mt-8 text-center text-text-secondary"
          style={{ fontSize: "clamp(14px, 1.1vw, 17px)" }}
        >
          Подписка отменяется в один шаг в личном кабинете. Без звонков и писем в поддержку
        </p>
      </div>
    </Section>
  );
}
