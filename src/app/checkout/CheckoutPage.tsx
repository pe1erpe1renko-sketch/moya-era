"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/lib/useAuth";
import { usePlans } from "@/components/landing/Pricing";
import { formatRub, monthlyEquivalent, yearDiscountPercent } from "@/lib/plansDefault";
import { DEMO_MODE } from "@/lib/env";
import { localDemo } from "@/lib/backend.local";
import { track } from "@/components/analytics/track";
import { leaveForAuth } from "@/lib/returnTo";

/**
 * ОФОРМЛЕНИЕ. Сумма считается на сервере из базы — здесь только показ.
 * Пока эквайринг не подключён, кнопка честно говорит об этом.
 * В демо-режиме подписка включается сразу, чтобы пройти воронку целиком.
 */
export default function CheckoutPage() {
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const { plans, packs } = usePlans();

  const planId = search.get("plan");
  const packId = search.get("pack");
  const [period, setPeriod] = useState<"month" | "year">(search.get("period") === "year" ? "year" : "month");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const plan = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId]);
  const pack = useMemo(() => packs.find((p) => p.id === packId) ?? null, [packs, packId]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const back = search.toString() ? `/checkout?${search.toString()}` : "/checkout";
      leaveForAuth(router, "register", back, "replace");
    }
  }, [loading, isAuthenticated, router, search]);

  const total = plan ? (period === "year" ? plan.price_year : plan.price_month) : pack ? pack.price : 0;

  async function pay() {
    if (busy || !user) return;
    setError(null);
    setBusy(true);
    track("checkout_pay", { plan: planId ?? undefined, pack: packId ?? undefined, period });
    try {
      if (DEMO_MODE) {
        if (plan) localDemo.activate(user.id, plan.id, period);
        if (pack) localDemo.addCredits(user.id, pack.credits, "pack_purchase");
        router.push("/cabinet");
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan ? { kind: "plan", planId: plan.id, period } : { kind: "pack", packId: pack?.id }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string };
      if (res.status === 503 || data.error === "payments_not_configured") {
        setError("Оплата пока недоступна: приём платежей подключается. Мы напишем, как только можно будет оформить.");
        return;
      }
      if (!res.ok || !data.redirectUrl) {
        setError("Не удалось создать платёж. Попробуйте ещё раз или напишите в поддержку.");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (!plan && !pack) {
    return (
      <Shell>
        <p className="text-[16px] text-text-secondary">Не выбран тариф или пакет.</p>
        <Link href="/tarify" className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground">К тарифам</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="checkout-grid">
        <section className="checkout-card">
          <div className="text-[13px] uppercase tracking-[0.08em] text-text-secondary">{plan ? "Тариф" : "Пакет кредитов"}</div>
          <h2 className="mt-2 font-display text-[clamp(24px,2.6vw,34px)] text-text-primary">{plan ? plan.title : `${pack!.credits} сообщений наставнику`}</h2>
          <p className="mt-2 text-[15px] text-text-secondary">{plan ? plan.subtitle : "Кредиты не сгорают и не зависят от подписки."}</p>

          {plan && (
            <>
              <div className="mt-6 text-[13px] uppercase tracking-[0.08em] text-text-secondary">Период оплаты</div>
              <div role="radiogroup" aria-label="Период оплаты" className="mt-3 grid gap-3">
                {(["month", "year"] as const).map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)} className={`flex items-center justify-between rounded-[14px] border px-4 py-3 text-left ${period === p ? "border-text-accent bg-accent/15" : "border-border"}`}>
                    <span className="text-[16px] text-text-primary">{p === "month" ? "Месяц" : "Год"}</span>
                    <span className="text-[15px] text-text-secondary">
                      {p === "month" ? formatRub(plan.price_month) : `${formatRub(plan.price_year)} · ${formatRub(monthlyEquivalent(plan))}/мес${yearDiscountPercent(plan) > 0 ? ` · −${yearDiscountPercent(plan)}%` : ""}`}
                    </span>
                  </button>
                ))}
              </div>
              <ul className="mt-6 space-y-2 text-[15px] text-text-secondary">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="checkout-card">
          <div className="text-[13px] uppercase tracking-[0.08em] text-text-secondary">К оплате</div>
          <div className="mt-2 font-display text-[clamp(32px,3vw,44px)] text-text-primary">{formatRub(total)}</div>
          <p className="mt-1 text-[14px] text-text-secondary">
            {plan ? (period === "month" ? "Списание раз в месяц. Отменить можно в любой день в кабинете." : "Списание раз в год. Отменить можно в любой день в кабинете.") : "Разовый платёж."}
          </p>
          <p className="mt-3 text-[14px] text-text-secondary">Чек придёт на {user?.email ?? "вашу почту"}.</p>

          <label className="mt-6 flex items-start gap-3 text-[14px] text-text-secondary">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <span>
              Принимаю <Link href="/offer" className="underline underline-offset-4">оферту</Link>, <Link href="/subscription-terms" className="underline underline-offset-4">условия подписки</Link> и{" "}
              <Link href="/privacy" className="underline underline-offset-4">политику данных</Link>
            </span>
          </label>

          {error && <p className="mt-4 rounded-[10px] bg-surface-1 p-3 text-[14px] text-text-danger">{error}</p>}

          <button type="button" onClick={pay} disabled={busy || !agree} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-accent text-[16px] font-medium text-primary-foreground disabled:opacity-40">
            {busy ? "…" : DEMO_MODE ? "Включить (демо)" : `Оплатить ${formatRub(total)}`}
          </button>
          <p className="mt-3 text-[12px] text-text-secondary/80">Способ оплаты выберете на защищённой странице ЮKassa: карта, СБП, SberPay.</p>
          <Link href="/tarify" className="mt-4 inline-block text-[14px] text-text-accent underline-offset-4 hover:underline">← Другие тарифы</Link>
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>
      <div className="mx-auto w-[min(1100px,92vw)] pb-20 pt-6 md:pt-10">
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}>Оформление</h1>
        <div className="mt-8">{children}</div>
      </div>
      <Footer />
    </main>
  );
}
