"use client";

import { useCallback } from "react";

const ENTRIES = [
  {
    date: "14 авг · Аркан 5",
    note: "Весь день искал систему в хаосе",
    mark: "совпало",
    match: true,
  },
  {
    date: "11 авг · Луна в Раке",
    note: "Потянуло разобрать старые письма",
    mark: "совпало",
    match: true,
  },
  {
    date: "07 авг · Аркан 15",
    note: "Ничего особенного не заметил",
    mark: "не совпало",
    match: false,
  },
];

const RIGHT_ITEMS = [
  {
    title: "Каждый день",
    text: "Карта дня и состояние по твоей карте — коротко, утром, по делу",
  },
  {
    title: "Telegram",
    text: "Короткий инсайт приходит сам. Не нужно заходить на сайт",
  },
  {
    title: "Близкие люди",
    text: "Профили партнёра, ребёнка, коллеги — и совместимость между ними",
  },
];

export function WhatsNext() {
  const scrollToPricing = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <section
      id="whats-next"
      className="relative w-full bg-bg-page"
      style={{
        paddingTop: "clamp(80px, 10vh, 160px)",
        paddingBottom: "clamp(80px, 10vh, 160px)",
      }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2
          className="text-center font-display text-text-primary"
          style={{
            fontSize: "clamp(32px, 3.4vw, 64px)",
            letterSpacing: "0.01em",
            lineHeight: 1.08,
          }}
        >
          Что происходит дальше
        </h2>
        <p
          className="mx-auto mt-4 max-w-[760px] text-center text-text-secondary"
          style={{ fontSize: "clamp(16px, 1.2vw, 20px)" }}
        >
          Разбор — не финал. С него всё начинается
        </p>

        <div className="mt-12 flex flex-col gap-8 md:flex-row md:items-start md:gap-[4%]">
          {/* Left column — diary */}
          <div className="w-full rounded-[20px] border border-border bg-surface-1 p-[22px] md:w-[58%] md:p-8">
            <h3
              className="font-display text-text-primary"
              style={{
                fontSize: "clamp(22px, 1.8vw, 30px)",
                letterSpacing: "0.01em",
                lineHeight: 1.1,
              }}
            >
              Дневник наблюдений
            </h3>
            <p
              className="font-sans text-text-secondary"
              style={{ fontSize: "clamp(14px, 1.05vw, 17px)", marginTop: 10, lineHeight: 1.5 }}
            >
              Отмечай, что совпало, а что нет. Через месяц ты видишь свой рисунок не в тексте, а в собственном поведении
            </p>

            <div
              className="w-full border-b border-border/40"
              style={{ marginTop: 24 }}
            />

            <div className="flex flex-col" style={{ marginTop: 20, gap: 18 }}>
              {ENTRIES.map((entry, index) => (
                <div key={entry.date}>
                  <div className="flex flex-col gap-1 md:flex-row md:items-start md:gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-mono text-text-secondary"
                        style={{ fontSize: "clamp(12px, 0.95vw, 14px)" }}
                      >
                        {entry.date}
                      </p>
                      <p
                        className="font-sans text-text-primary"
                        style={{
                          fontSize: "clamp(14px, 1.05vw, 16px)",
                          marginTop: 4,
                          lineHeight: 1.45,
                        }}
                      >
                        {entry.note}
                      </p>
                    </div>
                    <span
                      className="font-sans shrink-0"
                      style={{
                        fontSize: 12,
                        color: entry.match ? "var(--text-accent)" : "var(--text-secondary)",
                        opacity: entry.match ? 1 : 0.6,
                        lineHeight: 1.45,
                        marginTop: "auto",
                      }}
                    >
                      {entry.mark}
                    </span>
                  </div>
                  {index < ENTRIES.length - 1 && (
                    <div
                      className="w-full border-b border-border/25"
                      style={{ marginTop: 18 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right column — three rows */}
          <div className="w-full md:w-[38%] md:pt-8">
            {RIGHT_ITEMS.map((item, index) => (
              <div
                key={item.title}
                className={index > 0 ? "border-t border-border/35 pt-6" : ""}
                style={index > 0 ? { marginTop: 24 } : undefined}
              >
                <h3
                  className="font-display text-text-primary"
                  style={{
                    fontSize: "clamp(18px, 1.4vw, 24px)",
                    letterSpacing: "0.01em",
                    lineHeight: 1.15,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="font-sans text-text-secondary"
                  style={{
                    fontSize: "clamp(13px, 1vw, 16px)",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#pricing"
          onClick={scrollToPricing}
          className="inline-flex items-center gap-2 font-sans text-text-accent transition-opacity hover:opacity-80"
          style={{
            fontSize: "clamp(15px, 1.1vw, 18px)",
            marginTop: 40,
          }}
        >
          Что входит в подписку
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
