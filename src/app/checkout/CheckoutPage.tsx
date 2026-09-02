"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/lib/useAuth";
import {
  CHECKOUT_PLANS,
  formatRub,
  nextChargeDate,
  type PlanId,
} from "@/lib/plans";

type Search = { plan: PlanId; period: string };

function parseSearch(search: URLSearchParams): Search {
  const plan: PlanId = search.get("plan") === "trial" ? "trial" : "sub";
  const raw = search.get("period");
  const period = raw && raw.length > 0 ? raw : CHECKOUT_PLANS[plan].periods[0]!.id;
  return { plan, period };
}

const PAY_METHODS = ["VISA", "Mastercard", "МИР", "СБП", "Google Pay", "ЮMoney"];

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { plan: initialPlan, period } = parseSearch(searchParams);
  const navigate = ({ search }: { search: Search; replace?: boolean }) =>
    router.replace(`/checkout?plan=${search.plan}&period=${encodeURIComponent(search.period)}`);
  const { email: authEmail } = useAuth();

  const [planId, setPlanId] = useState<PlanId>(initialPlan);
  const plan = CHECKOUT_PLANS[planId];

  const [periodId, setPeriodId] = useState(period);

  function choosePlan(next: PlanId) {
    setPlanId(next);
    const first = CHECKOUT_PLANS[next].periods[0]!.id;
    setPeriodId(first);
    void navigate({ search: { plan: next, period: first }, replace: true });
  }

  const [email, setEmail] = useState("");
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [gift, setGift] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authEmail) setEmail((prev) => prev || authEmail);
  }, [authEmail]);

  const selected = useMemo(
    () => plan.periods.find((p) => p.id === periodId) ?? plan.periods[0]!,
    [plan, periodId],
  );

  const total = promoApplied ? Math.round(selected.price * 0.9) : selected.price;

  const canPay = accepted && /\S+@\S+\.\S+/.test(email);

  function handlePay() {
    if (!canPay) {
      setError(
        !/\S+@\S+\.\S+/.test(email)
          ? "Укажите почту для чека"
          : "Нужно принять условия",
      );
      return;
    }
    setError("Оплата пока недоступна: приём платежей подключается.");
  }

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[110px] w-full">
        <Header />
      </div>

      <div
        className="mx-auto w-full max-w-[1100px] px-[clamp(20px,5vw,40px)]"
        style={{ paddingTop: "clamp(40px, 6vh, 80px)", paddingBottom: "clamp(60px, 9vh, 120px)" }}
      >
        <div>
          <div
            className="text-text-secondary"
            style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}
          >
            Чекаут
          </div>
          <h1
            className="font-display text-text-primary"
            style={{ fontSize: "clamp(28px, 3.4vw, 46px)", lineHeight: 1.1, marginTop: 10 }}
          >
            Оформление подписки
          </h1>
        </div>

        <div className="checkout-grid" style={{ marginTop: 34 }}>
          {/* Left: plan summary */}
          <section className="checkout-card">
            <div className="text-text-secondary" style={{ fontSize: 14 }}>
              Ваш план
            </div>
            <div
              className="font-display text-text-primary"
              style={{ fontSize: "clamp(26px, 2.4vw, 38px)", lineHeight: 1.1, marginTop: 6 }}
            >
              {plan.title}
            </div>

            <dl style={{ marginTop: 22, display: "grid", gap: 12 }}>
              <Row label="Аккаунт" value={authEmail ?? "—"} />
              <Row label="Что входит" value={plan.account} />
              <Row label="Период" value={selected.label} />
            </dl>

            <div style={{ marginTop: 22, height: 1, background: "var(--border)", opacity: 0.35 }} />

            <div className="text-text-secondary" style={{ fontSize: 14, marginTop: 20 }}>
              К оплате
            </div>
            <div
              className="font-mono text-text-primary"
              style={{ fontSize: "clamp(30px, 3vw, 46px)", marginTop: 6, lineHeight: 1.05 }}
            >
              {formatRub(total)}
            </div>
            <div className="text-text-secondary" style={{ fontSize: 13, marginTop: 8 }}>
              Следующее списание: {nextChargeDate(selected.months)} · {formatRub(selected.price)}
            </div>

            <div className="text-text-secondary" style={{ fontSize: 14, marginTop: 24 }}>
              Промокод
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <input
                className="checkout-input"
                placeholder="Введите промокод"
                value={promo}
                onChange={(e) => {
                  setPromo(e.target.value);
                  setPromoApplied(false);
                }}
                aria-label="Промокод"
              />
              <button
                type="button"
                className="checkout-btn-ghost"
                onClick={() => setPromoApplied(promo.trim().length > 0)}
              >
                Применить
              </button>
            </div>
            {promoApplied && (
              <p className="text-text-accent" style={{ fontSize: 13, marginTop: 8 }}>
                Промокод применён: −10%
              </p>
            )}

            <div style={{ marginTop: 24, height: 1, background: "var(--border)", opacity: 0.35 }} />

            <label className="checkout-gift">
              <span aria-hidden="true" className="checkout-gift-icon">
                ✦
              </span>
              <span style={{ flex: 1 }}>
                <span className="text-text-primary" style={{ fontSize: 15 }}>
                  Подарить подписку другу
                </span>
                <span
                  className="text-text-secondary"
                  style={{ display: "block", fontSize: 13, marginTop: 4, lineHeight: 1.45 }}
                >
                  После оплаты вы получите ссылку — отправьте её другу в любой мессенджер
                </span>
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={gift}
                onChange={(e) => setGift(e.target.checked)}
              />
              <span className="checkout-switch" data-on={gift} aria-hidden="true">
                <span className="checkout-switch-knob" />
              </span>
            </label>
          </section>

          {/* Right: payment */}
          <section className="checkout-card">
            <div className="text-text-primary" style={{ fontSize: 15, fontWeight: 500 }}>
              Тариф
            </div>
            <div
              role="radiogroup"
              aria-label="Тариф"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}
            >
              {(Object.keys(CHECKOUT_PLANS) as PlanId[]).map((id) => {
                const p = CHECKOUT_PLANS[id];
                const active = id === planId;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choosePlan(id)}
                    className="checkout-period"
                    data-active={active}
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}
                  >
                    <span style={{ fontSize: 15 }}>{p.title}</span>
                    <span className="text-text-secondary" style={{ fontSize: 13 }}>
                      {id === "trial" ? "3 дня · 249 ₽" : "от 690 ₽ в месяц"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-text-primary" style={{ fontSize: 15, fontWeight: 500, marginTop: 24 }}>
              Период оплаты
            </div>

            <div role="radiogroup" aria-label="Период оплаты" style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {plan.periods.map((p) => {
                const active = p.id === selected.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setPeriodId(p.id);
                      void navigate({ search: { plan: planId, period: p.id }, replace: true });
                    }}
                    className="checkout-period"
                    data-active={active}
                  >

                    <span className="checkout-radio" data-active={active} aria-hidden="true" />
                    <span style={{ flex: 1, textAlign: "left" }}>{p.label}</span>
                    {p.discount && <span className="checkout-badge">−{p.discount}%</span>}
                    <span className="font-mono">{formatRub(p.price)}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-text-secondary" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>
              {plan.hint}
            </p>

            <div className="text-text-primary" style={{ fontSize: 15, fontWeight: 500, marginTop: 24 }}>
              Email для чека
            </div>
            <p className="text-text-secondary" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              Отправим на него электронный чек об оплате. Адрес сохранится в профиле.
            </p>
            <input
              type="email"
              className="checkout-input"
              style={{ width: "100%", marginTop: 12 }}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              aria-label="Email для чека"
            />

            <label style={{ display: "flex", gap: 12, marginTop: 20, alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => {
                  setAccepted(e.target.checked);
                  setError(null);
                }}
                className="checkout-checkbox"
              />
              <span className="text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
                Я принимаю{" "}
                <Link href="/offer" className="text-text-secondary underline">
                  Публичную оферту
                </Link>
                ,{" "}
                <Link href="/subscription-terms" className="text-text-secondary underline">
                  Условия подписки
                </Link>{" "}
                и{" "}
                <Link href="/privacy" className="text-text-secondary underline">
                  Политику обработки персональных данных
                </Link>{" "}
                и разрешаю списывать {formatRub(selected.price)} раз в выбранный период с привязанной
                карты. Отменить автопродление можно в любой момент в личном кабинете.
              </span>
            </label>

            <button
              type="button"
              onClick={handlePay}
              className="checkout-pay"
              data-disabled={!canPay}
            >
              Оплатить {formatRub(total)}
            </button>

            {error && (
              <p className="text-text-accent" style={{ fontSize: 13, marginTop: 10 }} role="alert">
                {error}
              </p>
            )}

            <div className="checkout-methods">
              {PAY_METHODS.map((m) => (
                <span key={m} className="checkout-method">
                  {m}
                </span>
              ))}
            </div>

            <p
              className="text-text-secondary"
              style={{ fontSize: 12, marginTop: 12, textAlign: "center", lineHeight: 1.5 }}
            >
              Способ оплаты выберете на защищённой странице платёжного провайдера · Возврат в течение
              3 дней
            </p>
          </section>
        </div>

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link
            href="/#pricing"
            className="text-text-secondary hover:text-text-primary"
            style={{ fontSize: 14 }}
          >
            ← Вернуться к тарифам
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <dt className="text-text-secondary" style={{ fontSize: 14 }}>
        {label}
      </dt>
      <dd className="text-text-primary" style={{ fontSize: 14, textAlign: "right" }}>
        {value}
      </dd>
    </div>
  );
}
