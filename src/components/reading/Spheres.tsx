"use client";

import { useState } from "react";
import type { SectionData } from "@/lib/matrix/contentPositions";
import { arcanaName } from "@/lib/matrix";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import type { SlotText } from "./useReadingTexts";
import { ResearchCard, type ResearchCardProps } from "./ResearchCard";

export type SpheresProps = {
  sections: SectionData[];
  texts: Record<string, SlotText>;
  busy: Set<string>;
  onOpenSlot: (slotId: string) => void;
  onLocked: () => void;
  research?: (sectionId: string) => ResearchCardProps | null;
  /** id раздела, который надо раскрыть (переход с октаграммы) */
  openSectionId?: string | null;
};

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="text-text-secondary">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-[16px] leading-[1.7] text-text-secondary [&:not(:first-child)]:mt-3">
            {p}
          </p>
        ))}
    </>
  );
}

export function Spheres({ sections, texts, busy, onOpenSlot, onLocked, research, openSectionId }: SpheresProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const freeCount = section.slots.filter((s) => !s.locked).length;
        const isOpen = open === section.id || openSectionId === section.id;
        const card = research?.(section.id) ?? null;
        return (
          <section key={section.id} id={`sphere-${section.id}`} className="scroll-mt-24 rounded-[20px] border border-border/60 bg-surface-1/40">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : section.id)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left md:px-7"
            >
              <div className="min-w-0">
                <h3 className="font-display text-[clamp(22px,2.4vw,30px)] leading-tight text-text-primary">{section.title}</h3>
                <p className="mt-1.5 text-[15px] leading-[1.5] text-text-secondary">{section.lead}</p>
                <p className="mt-2 text-[13px] text-text-secondary/80">
                  {section.slots.length} {plural(section.slots.length, "вопрос", "вопроса", "вопросов")}
                  {freeCount < section.slots.length && ` · открыто ${freeCount}`}
                </p>
              </div>
              <span className="mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border text-text-accent" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border/40 px-2 pb-3 md:px-4">
                {section.slots.map((slot) => (
                  <QuestionRow key={slot.id} slot={slot} state={texts[slot.id]} loading={busy.has(slot.id)} onOpen={() => (slot.locked ? onLocked() : onOpenSlot(slot.id))} />
                ))}
                {card && (
                  <div className="px-3 pb-2 pt-4 md:px-3">
                    <ResearchCard {...card} />
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function QuestionRow({
  slot,
  state,
  loading,
  onOpen,
}: {
  slot: SectionData["slots"][number];
  state: SlotText | undefined;
  loading: boolean;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locked = slot.locked || (state && "locked" in state);

  const toggle = () => {
    if (locked) {
      onOpen();
      return;
    }
    const next = !expanded;
    setExpanded(next);
    if (next && !state) onOpen();
  };

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button type="button" onClick={toggle} aria-expanded={!locked && expanded} className="flex w-full items-center gap-3 px-3 py-4 text-left md:px-3">
        <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[13px] ${locked ? "border-border text-text-secondary" : "border-text-accent/50 text-text-accent"}`}>
          {slot.arcana}
        </span>
        <span className={`flex-1 text-[16px] ${locked ? "text-text-secondary" : "text-text-primary"}`}>{slot.label}</span>
        {locked ? <LockIcon /> : <span className="text-text-secondary" aria-hidden="true">{expanded ? "−" : "+"}</span>}
      </button>

      {!locked && expanded && (
        <div className="px-3 pb-5 md:px-3">
          <div className="flex flex-col gap-4 md:flex-row">
            <ArcanaCard n={slot.arcana} />
            <div className="min-w-0 flex-1">
              {loading || !state ? (
                <p className="text-[15px] text-text-secondary">Подбираю слова…</p>
              ) : "locked" in state ? null : (
                <Paragraphs text={state.text} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Иллюстрация аркана с подписью. Запасной вариант — внутри `ArcanaImage`. */
export function ArcanaCard({ n, size = 120 }: { n: number; size?: number }) {
  return (
    <div className="flex-shrink-0" style={{ width: size }}>
      <ArcanaImage n={n} width={size} />
      <div className="mt-1.5 text-[12px] text-text-secondary">
        {n} · {arcanaName(n)}
      </div>
    </div>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
