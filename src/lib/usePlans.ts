"use client";

import { useEffect, useState } from "react";
import { backend, type CreditPack, type Plan } from "@/lib/backend";
import { DEFAULT_CREDIT_PACKS, DEFAULT_PLANS } from "@/lib/plansDefault";

/**
 * Тарифы и пакеты кредитов — из базы (таблицы `plans` и `credit_packs`),
 * чтобы цены и объёмы менялись без деплоя. Пока ответ не пришёл и в
 * демо-режиме — запасные значения, те же, что в миграции.
 *
 * Одна на весь сайт: страница тарифов, оформление, замок в разборах,
 * кабинет. Из-за этого «от N ₽ в месяц» в замке и цена на /tarify не
 * могут разойтись.
 */
export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [packs, setPacks] = useState<CreditPack[]>(DEFAULT_CREDIT_PACKS);
  useEffect(() => {
    let alive = true;
    Promise.all([backend.billing.plans(), backend.billing.creditPacks()])
      .then(([p, c]) => {
        if (!alive) return;
        if (p.length) setPlans(p);
        if (c.length) setPacks(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return { plans, packs };
}
