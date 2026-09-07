"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { spreadPath } from "@/lib/tarot/spreadUrl";

/**
 * РАСКЛАДЫ В КАБИНЕТЕ — раздел #spreads.
 *
 * Человек заплатил кредитами и должен иметь возможность вернуться и
 * перечитать. Поэтому список показывается ВСЕГДА, в том числе без
 * подписки: расклад оплачивается кредитами, а сделанные остаются
 * сделанными — как архив сводок бота.
 *
 * Пустой раздел не прячем: это единственное место в кабинете, где о
 * раскладах вообще сказано.
 */

type Row = { code: string; title: string; question: string; credits: number; createdAt: string };

export function SpreadsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/taro/spread", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { spreads?: Row[] } | null) => {
        if (!alive || !d) return;
        setRows(d.spreads ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="spreads" className="mt-8 rounded-[18px] border border-border bg-surface-1" style={{ padding: 24 }}>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
        <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Расклады таро
        </div>
        <Link
          href="/taro"
          className="qc-focus inline-flex items-center rounded-[10px] border border-text-accent/50 px-4 text-[14px] text-text-primary transition-colors hover:bg-accent/10"
          style={{ height: 36 }}
        >
          Сделать расклад
        </Link>
      </div>

      {rows === null && <p className="mt-4 text-text-secondary" style={{ fontSize: 14 }}>Загружаем…</p>}

      {rows !== null && rows.length === 0 && (
        <p className="mt-3 text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
          Здесь будут ваши расклады. Вопрос задаётся своими словами, карты тянутся один раз — переиграть нельзя.
          Расклад оплачивается кредитами и остаётся у вас навсегда
        </p>
      )}

      {rows !== null && rows.length > 0 && (
        <>
          <ul className="mt-4 flex flex-col" style={{ gap: 8 }}>
            {rows.map((r) => (
              <li key={r.code}>
                <Link
                  href={spreadPath(r.code)}
                  className="qc-focus flex flex-wrap items-baseline justify-between rounded-[12px] border border-border transition-colors hover:border-text-accent/60"
                  style={{ padding: "12px 14px", gap: 8 }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-text-primary" style={{ fontSize: 15 }}>
                      {r.question}
                    </span>
                    <span className="mt-0.5 block text-text-secondary" style={{ fontSize: 13 }}>
                      {r.title} · {dayLabel(r.createdAt)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-text-accent" style={{ fontSize: 14 }}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-text-secondary/80" style={{ fontSize: 13, lineHeight: 1.55 }}>
            Расклады остаются у вас навсегда: сделанные не пропадают и после отмены подписки
          </p>
        </>
      )}
    </section>
  );
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «7 сентября 2026». Время не показываем: у расклада важен день, а не час. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
