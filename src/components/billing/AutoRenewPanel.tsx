"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * АВТОПРОДЛЕНИЕ В КАБИНЕТЕ.
 *
 * Здесь стоит постоянное предупреждение: что спишется, сколько и когда,
 * и рядом видная кнопка «Отключить автопродление». Видная, а не
 * спрятанная в подвале настроек: этого требуют и закон, и банк, и
 * здравый смысл — из подписки, из которой не выйти в одно нажатие, люди
 * выходят через возврат платежа, и это дороже для всех.
 *
 * Предупреждение стоит ПОСТОЯННО, а не появляется за день до списания.
 * Живой канал у нас один — телеграм, и он есть не у каждого; постоянная
 * строка в кабинете — то, что видно всем и всегда.
 *
 * ЕСЛИ АВТОПРОДЛЕНИЕ ВЫКЛЮЧЕНО В НАСТРОЙКАХ СЕРВЕРА, панель не рисует
 * выключателя, а прямо говорит: подписка не продлится, доступ кончится
 * такого-то числа. Кнопка отключения того, чего не происходит, — обман.
 */

type State = {
  available: boolean;
  active: boolean;
  autoRenew: boolean;
  hasMethod: boolean;
  periodEnd: string | null;
  planTitle: string | null;
  amount: number | null;
  lastError: string | null;
  demo?: boolean;
};

export function AutoRenewPanel() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/billing/auto-renew", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setState(d as State);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function toggle(enabled: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/auto-renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Не удалось сохранить. Попробуйте ещё раз");
      return;
    }
    setState((await res.json()) as State);
  }

  if (!state || !state.active) return null;

  const end = state.periodEnd ? dateLabel(state.periodEnd) : null;
  const renewing = state.available && state.autoRenew && state.hasMethod;

  return (
    <div id="auto-renew" className="mt-5 rounded-[14px] border border-border/60" style={{ padding: 16 }}>
      <div className="text-text-primary" style={{ fontSize: 15, lineHeight: 1.6 }}>
        {renewing ? (
          <>
            Подписка продлится {end}
            {state.amount ? `, спишется ${state.amount} ₽` : ""} с карты, которой вы платили в прошлый раз.
          </>
        ) : state.available && state.autoRenew && !state.hasMethod ? (
          <>Автопродление включено, но способ оплаты не сохранён — списывать нечем. Подписка кончится {end}.</>
        ) : state.available ? (
          <>Автопродление выключено. Подписка действует до {end}, дальше доступ станет бесплатным.</>
        ) : (
          <>Подписка не продлевается автоматически: она действует до {end}, дальше доступ станет бесплатным.</>
        )}
      </div>

      <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
        Всё, что оплачено и не израсходовано, остаётся доступным до конца оплаченного периода. Кредиты со счёта не
        сгорают, а сделанные расклады и разборы остаются у вас навсегда
      </p>

      {state.lastError && (
        <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
          Прошлое списание не прошло — банк отказал. Мы попробуем ещё раз; если не выйдет, честно напишем и переведём
          доступ в бесплатный режим.{" "}
          <Link href="/tarify" className="text-text-accent underline-offset-4 hover:underline">
            Оплатить вручную
          </Link>
        </p>
      )}

      {state.available && !state.demo && (
        <button
          type="button"
          onClick={() => toggle(!state.autoRenew)}
          disabled={busy}
          className="qc-focus mt-4 inline-flex items-center rounded-[12px] border border-border px-5 text-[15px] text-text-primary transition-colors hover:border-text-accent/60 disabled:opacity-50"
          style={{ height: 44 }}
        >
          {busy ? "Сохраняем…" : state.autoRenew ? "Отключить автопродление" : "Включить автопродление"}
        </button>
      )}

      {error && <p className="mt-2 text-[14px] text-text-danger">{error}</p>}
    </div>
  );
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
