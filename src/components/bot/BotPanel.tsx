"use client";

import { useCallback, useEffect, useState } from "react";
import { LockBody } from "@/components/reading/Paywall";

/**
 * ПАНЕЛЬ БОТА В КАБИНЕТЕ.
 *
 * Единственное место на сайте, где человек узнаёт о боте. По остальным
 * страницам это не размазываем: бот — не главное, что мы предлагаем, а
 * тем, кому он нужен, хватит одного видного места.
 *
 * Бот выключен (нет токена) — панель не показывается вовсе, а не пишет
 * «скоро будет». Обещать то, чего нет, хуже, чем промолчать.
 */

type Link = { id: string; personId: string; url: string; bound: boolean; live: boolean };
type Limit = { ok: true; left: number } | { ok: false; limit: number; reason: "no_plan" | "full" };

export function BotPanel({ people }: { people: Array<{ id: string; name: string }> }) {
  const [enabled, setEnabled] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [limit, setLimit] = useState<Limit | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((data: { enabled: boolean; links?: Link[]; limit?: Limit }) => {
    setEnabled(data.enabled);
    setLinks(data.links ?? []);
    setLimit(data.limit ?? null);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/bot/links", { cache: "no-store" });
    if (res.ok) apply((await res.json()) as { enabled: boolean; links?: Link[]; limit?: Limit });
  }, [apply]);

  useEffect(() => {
    let alive = true;
    fetch("/api/bot/links", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) apply(data as { enabled: boolean; links?: Link[]; limit?: Limit });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [apply]);

  async function connect(personId: string) {
    setBusy(personId);
    setError(null);
    const res = await fetch("/api/bot/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    setBusy(null);
    if (res.status === 402) {
      const d = (await res.json()) as { limit: number; reason?: "no_plan" | "full" };
      setError(
        d.reason === "no_plan"
          ? "Бот подключается по подписке — она же открывает всё остальное"
          : `По вашему тарифу к боту подключается ${d.limit} ${plural(d.limit)}. Отзовите одну привязку или смените тариф`,
      );
      return;
    }
    if (!res.ok) {
      setError("Не удалось создать ссылку. Попробуйте ещё раз");
      return;
    }
    await load();
  }

  async function revoke(id: string) {
    setBusy(id);
    await fetch("/api/bot/links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(null);
    await load();
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
    } catch {
      setCopied(null);
    }
  }

  if (!enabled) return null;

  const byPerson = new Map(links.map((l) => [l.personId, l]));

  return (
    <section id="bot" className="mt-8 rounded-[18px] border border-border bg-surface-1" style={{ padding: 24 }}>
      <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Телеграм-бот
      </div>
      <p className="mt-3 text-text-primary" style={{ fontSize: 15, lineHeight: 1.6 }}>
        Утром около восьми присылает сводку на сегодня: аркан дня, карту дня и число дня. Одна ссылка — на одного
        человека; тот, кто её откроет, и будет получать сводку.
      </p>

      <div className="mt-5 flex flex-col" style={{ gap: 10 }}>
        {people.map((person) => {
          const link = byPerson.get(person.id);
          return (
            <div
              key={person.id}
              className="flex flex-wrap items-center justify-between rounded-[12px] border border-border"
              style={{ padding: "12px 14px", gap: 10 }}
            >
              <div className="min-w-0">
                <div className="text-text-primary" style={{ fontSize: 15 }}>
                  {person.name}
                </div>
                {link && (
                  <div className="mt-1 truncate text-text-secondary" style={{ fontSize: 13, maxWidth: 420 }}>
                    {link.live
                      ? "Подключён, сводка приходит"
                      : link.bound
                        ? "Подключён, сводка выключена в боте"
                        : link.url}
                  </div>
                )}
              </div>

              <div className="flex flex-shrink-0 items-center" style={{ gap: 8 }}>
                {!link && (
                  <button
                    type="button"
                    onClick={() => connect(person.id)}
                    disabled={busy === person.id}
                    className="qc-focus rounded-[10px] border border-text-accent/50 px-4 text-[14px] text-text-primary transition-colors hover:bg-accent/10"
                    style={{ height: 36 }}
                  >
                    {busy === person.id ? "Создаём…" : "Получить ссылку"}
                  </button>
                )}
                {link && !link.bound && (
                  <button
                    type="button"
                    onClick={() => copy(link.url, link.id)}
                    className="qc-focus rounded-[10px] border border-text-accent/50 px-4 text-[14px] text-text-primary transition-colors hover:bg-accent/10"
                    style={{ height: 36 }}
                  >
                    {copied === link.id ? "Скопировано" : "Скопировать"}
                  </button>
                )}
                {link && (
                  <button
                    type="button"
                    onClick={() => revoke(link.id)}
                    disabled={busy === link.id}
                    className="qc-focus rounded-[10px] border border-border px-4 text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
                    style={{ height: 36 }}
                  >
                    Отозвать
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[14px] text-text-danger">{error}</p>}

      {limit && !limit.ok && limit.reason === "no_plan" && (
        <div className="mt-4 rounded-[14px] border border-border/60" style={{ padding: "14px 16px" }}>
          <LockBody system="bot" compact />
        </div>
      )}
      {limit && limit.ok && (
        <p className="mt-3 text-text-secondary" style={{ fontSize: 14 }}>
          Можно подключить ещё {limit.left} {plural(limit.left)}
        </p>
      )}
      <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
        Отозванная ссылка гаснет навсегда, и чат отписывается. Отписаться можно и в самом боте
      </p>
    </section>
  );
}

function plural(n: number): string {
  const last = n % 10;
  if (n >= 11 && n <= 14) return "человек";
  if (last === 1) return "человека";
  if (last >= 2 && last <= 4) return "человек";
  return "человек";
}
