"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "@/lib/geo/placesIndex";

export type { Place };

export type PlaceFieldProps = {
  /** Выбранное место из справочника или null, если введён произвольный текст. */
  value: Place | null;
  /** Текст в поле: подпись выбранного места или то, что набрал человек. */
  text: string;
  onChange: (next: { value: Place | null; text: string }) => void;
  placeholder?: string;
  className?: string;
  /** Показывать ли строку-подсказку под полем. */
  hint?: boolean;
  ariaLabel?: string;
};

const defaultInputClass =
  "qc-focus h-14 w-full rounded-[12px] border border-border bg-surface-1 px-4 text-[17px] text-text-primary transition-colors focus:border-text-accent";

/**
 * Поле «Место рождения» с подсказками из справочника (/api/places).
 *
 * Человек набирает «Новосиб», выбирает «Новосибирск, Новосибирская область,
 * Россия», и вместе с названием к нему сохраняются координаты и часовой
 * пояс. Если ничего не выбрано, остаётся текст: он сохранится как есть,
 * но без координат дома и асцендент считаться не будут, и поле об этом
 * честно скажет.
 */
export function PlaceField({
  value,
  text,
  onChange,
  placeholder = "Место рождения: город или посёлок",
  className = defaultInputClass,
  hint = true,
  ariaLabel = "Место рождения",
}: PlaceFieldProps) {
  const listId = useId();
  const [options, setOptions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    },
    [],
  );

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    const query = q.trim();
    if (query.length < 2) {
      setOptions([]);
      setSearched("");
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const json = (await res.json()) as { places: Place[] };
        if (controller.signal.aborted) return;
        setOptions(json.places ?? []);
        setSearched(query);
        setActive(json.places?.length ? 0 : -1);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
  }

  function pick(place: Place) {
    onChange({ value: place, text: place.label });
    setOptions([]);
    setOpen(false);
    setActive(-1);
  }

  function onInput(next: string) {
    onChange({ value: null, text: next });
    search(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      if (active >= 0) {
        e.preventDefault();
        pick(options[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const trimmed = text.trim();
  const notFound = !value && !loading && trimmed.length >= 2 && searched === trimmed && options.length === 0;

  return (
    <div className="relative">
      <input
        className={className}
        value={text}
        onChange={(e) => onInput(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && open ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={120}
      />

      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-[12px] border border-border bg-surface-1 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
        >
          {options.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className="cursor-pointer px-4 py-2.5 text-[15px] leading-snug"
              style={{
                background: i === active ? "rgba(122, 93, 168, 0.16)" : "transparent",
                color: "var(--text-primary)",
              }}
            >
              <span>{p.name}</span>
              <span className="text-text-secondary">
                {p.label.slice(p.name.length)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hint && (
        <p className="mt-1.5 text-[12px] leading-snug text-text-secondary" aria-live="polite">
          {value
            ? "Координаты и часовой пояс определены"
            : notFound
              ? "В справочнике не нашлось. Сохраним как текст, но без координат дома и асцендент не посчитаются. Попробуйте ближайший город"
              : "Начните вводить название и выберите из списка"}
        </p>
      )}
    </div>
  );
}
