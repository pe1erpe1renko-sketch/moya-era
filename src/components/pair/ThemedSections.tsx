"use client";

import { useState } from "react";
import { THEMES, type PairSection, type PairSlot, type ThemeId } from "@/lib/pair";
import type { SlotText } from "@/components/reading/useReadingTexts";

/**
 * РАЗБОР ПАРЫ ПО ТЕМАМ.
 *
 * Аспекты, дома и каналы не сваливаются одним списком по точности, а
 * раскладываются по пяти житейским темам: чувства, общение, страсть, быт,
 * деньги. Каждая тема — свёрнутый список; рядом с термином стоит
 * человеческое пояснение («квадрат — трение, которое растит»).
 *
 * Позиции без темы (пара типов, определение композита) остаются обычным
 * разделом сверху: это не про одну сторону жизни, а про устройство пары
 * целиком.
 *
 * Механика доступа та же, что была: главный абзац бесплатно, остальное по
 * подписке — открытие строки с замком показывает, что входит.
 */

type Texts = Record<string, SlotText | { locked: true }>;

export function ThemedSections({
  title,
  lead,
  sections,
  texts,
  busy,
  unlocked,
  onPaywall,
  load,
}: {
  title: string;
  lead: string;
  sections: PairSection[];
  texts: Texts;
  busy: Set<string>;
  unlocked: boolean;
  onPaywall: () => void;
  load: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // По умолчанию раскрыта первая тема, остальные свёрнуты. Пока человек
  // ничего не трогал — состояние не хранится, и первая тема выбирается по
  // данным (у другой пары она может быть другой).
  const [themesOpen, setThemesOpen] = useState<Record<string, boolean> | null>(null);

  const paid = sections.flatMap((s) => s.slots.filter((x) => !x.free));
  const plain = sections.filter((s) => s.slots.some((x) => !x.free && !x.theme));
  const groups = THEMES.map((theme) => ({ theme, slots: paid.filter((x) => x.theme === theme.id) })).filter(
    (g) => g.slots.length > 0,
  );
  const isThemeOpen = (id: ThemeId, index: number) => (themesOpen ? Boolean(themesOpen[id]) : index === 0);
  const toggleTheme = (id: ThemeId, index: number) => {
    const current = isThemeOpen(id, index);
    const base = themesOpen ?? Object.fromEntries(groups.map((g, i) => [g.theme.id, i === 0]));
    setThemesOpen({ ...base, [id]: !current });
  };

  const toggleSlot = (slot: PairSlot) => {
    const next = open === slot.id ? null : slot.id;
    setOpen(next);
    if (next) load([slot.id]);
    const value = texts[slot.id];
    if (next && value && "locked" in value) onPaywall();
  };

  const row = (slot: PairSlot) => (
    <SlotRow
      key={slot.id}
      slot={slot}
      value={texts[slot.id]}
      isOpen={open === slot.id}
      busy={busy.has(slot.id)}
      unlocked={unlocked}
      onToggle={() => toggleSlot(slot)}
      onPaywall={onPaywall}
    />
  );

  return (
    <div className="mt-12">
      <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.2vw, 38px)", lineHeight: 1.1 }}>
        {title}
      </h2>
      <p className="mt-2 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
        {lead}
      </p>

      {plain.map((section) => (
        <section key={section.id} className="mt-8">
          <h3 className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 26px)", lineHeight: 1.15 }}>
            {section.title}
          </h3>
          <p className="mt-1.5 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.55 }}>
            {section.lead}
          </p>
          <div className="mt-4 flex flex-col" style={{ gap: 10 }}>
            {section.slots.filter((x) => !x.free && !x.theme).map(row)}
          </div>
        </section>
      ))}

      {groups.length > 0 && (
        <div className="mt-8 flex flex-col">
          {groups.map(({ theme, slots }, index) => {
            const opened = isThemeOpen(theme.id, index);
            return (
              <section key={theme.id} className="pair-theme">
                <button
                  type="button"
                  onClick={() => toggleTheme(theme.id, index)}
                  aria-expanded={opened}
                  className="qc-focus flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-text-primary" style={{ fontSize: "clamp(22px, 1.8vw, 28px)", lineHeight: 1.15 }}>
                        {theme.title}
                      </span>
                      <span className="text-text-accent" style={{ fontSize: 15 }}>
                        {slots.length}
                      </span>
                    </span>
                    <span className="mt-1 block text-text-secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
                      {theme.lead}
                    </span>
                  </span>
                  <Chevron open={opened} />
                </button>
                {opened && (
                  <div className="flex flex-col pb-5" style={{ gap: 10 }}>
                    {slots.map(row)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="18"
      height="18"
      aria-hidden="true"
      className="shrink-0 text-text-accent"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
    >
      <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Одна позиция: заголовок, пояснение термина, раскрывающийся текст. */
function SlotRow({
  slot,
  value,
  isOpen,
  busy,
  unlocked,
  onToggle,
  onPaywall,
}: {
  slot: PairSlot;
  value: SlotText | { locked: true } | undefined;
  isOpen: boolean;
  busy: boolean;
  unlocked: boolean;
  onToggle: () => void;
  onPaywall: () => void;
}) {
  const locked = Boolean(value && "locked" in value);
  return (
    <div className="rounded-[14px] border border-border bg-surface-1" style={{ padding: "0 18px" }}>
      <button
        type="button"
        onClick={onToggle}
        className="qc-focus flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="block text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.4 }}>
            {slot.label}
            {slot.hint && (
              <span className="ml-2 text-text-secondary" style={{ fontSize: 13 }}>
                · {slot.hint}
              </span>
            )}
          </span>
          {slot.gloss && (
            <span className="mt-1 block text-text-secondary" style={{ fontSize: 13, lineHeight: 1.45 }}>
              {slot.gloss}
            </span>
          )}
        </span>
        <span className="shrink-0 text-text-accent" style={{ fontSize: 13 }}>
          {locked ? "замок" : isOpen ? "свернуть" : unlocked ? "открыть" : "открыть"}
        </span>
      </button>

      {isOpen && (
        <div className="pb-4">
          {busy ? (
            <p className="text-text-secondary" style={{ fontSize: 15 }}>
              Пишем разбор…
            </p>
          ) : locked ? (
            <p className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
              Этот вопрос открывается по подписке.{" "}
              <button type="button" onClick={onPaywall} className="text-text-accent underline-offset-4 hover:underline">
                Что входит
              </button>
            </p>
          ) : value && "text" in value ? (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {value.text.split("\n\n").map((p, i) => (
                <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary" style={{ fontSize: 15 }}>
              Не удалось загрузить текст. Попробуйте ещё раз
            </p>
          )}
        </div>
      )}
    </div>
  );
}
