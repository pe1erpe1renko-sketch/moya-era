"use client";

import { useState } from "react";
import { DateField } from "./DateField";
import { readingPath } from "@/lib/matrix";
import { useGoToReading } from "./CalcTheater";

type Tile = {
  id: string;
  label: string;
  hint: string;
  /** какой тип открыть и как составить даты */
  build: (myDate: string, other: string) => { slug: string; dates: string[] };
};

const TILES: Tile[] = [
  { id: "partner", label: "Партнёр", hint: "Совместимость", build: (me, o) => ({ slug: "sovmestimost", dates: [me, o] }) },
  { id: "mother", label: "Мама", hint: "Её матрица", build: (_me, o) => ({ slug: "matrica", dates: [o] }) },
  { id: "father", label: "Папа", hint: "Его матрица", build: (_me, o) => ({ slug: "matrica", dates: [o] }) },
  { id: "child", label: "Ребёнок", hint: "Детская матрица", build: (_me, o) => ({ slug: "detskaya", dates: [o] }) },
  { id: "friend", label: "Друг", hint: "Его матрица", build: (_me, o) => ({ slug: "matrica", dates: [o] }) },
  { id: "business", label: "Деловой партнёр", hint: "Бизнес-совместимость", build: (me, o) => ({ slug: "biznes", dates: [me, o] }) },
  { id: "mother-child", label: "Мама и ребёнок", hint: "Связь с ребёнком", build: (me, o) => ({ slug: "mama-rebenok", dates: [me, o] }) },
];

/** «Кого посмотрим дальше?» — в конце всего разбора. */
export function ExploreNext({ myDate }: { myDate: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const go = useGoToReading();
  const tile = TILES.find((t) => t.id === open) ?? null;

  return (
    <div className="rounded-[20px] border border-border/60 bg-surface-1/40 p-5 md:p-7">
      <h3 className="font-display text-[clamp(24px,2.6vw,34px)] text-text-primary">Кого посмотрим дальше?</h3>
      <p className="mt-2 text-[15px] text-text-secondary">Достаточно даты рождения. Совместимость считается с вашей матрицей.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={open === t.id}
            onClick={() => setOpen(open === t.id ? null : t.id)}
            className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${open === t.id ? "border-text-accent bg-accent/20 text-text-primary" : "border-border text-text-secondary hover:border-text-accent/50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tile && (
        <div className="mt-5 max-w-[560px]">
          <DateField
            label={`Дата рождения · ${tile.hint.toLowerCase()}`}
            submitLabel="Смотреть"
            onSubmit={(iso) => {
              const { slug, dates } = tile.build(myDate, iso);
              go(readingPath(slug, dates));
            }}
          />
        </div>
      )}
    </div>
  );
}
