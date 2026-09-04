"use client";

import { useMemo, useState } from "react";
import { buildNatalChart, natalDayVariation } from "@/lib/natal";
import { hdDayVariation } from "@/lib/humandesign";
import { moscowClock } from "@/lib/geo/dayScan";
import { RefineBirth } from "@/components/common/RefineBirth";
import { backend } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import { birthPlaceFields } from "@/lib/geo/birthPlace";
import { formatBirthDate } from "@/lib/pendingBirth";
import type { BirthValue } from "@/components/natal/BirthForm";
import type { PairViewId } from "@/lib/pair";

/**
 * Карточка одного из двоих: что про него известно, чего не хватает и
 * кнопка уточнить время и место с пересчётом на месте.
 *
 * Даты здесь не спрашиваются: они в адресе страницы. Если за сутки
 * рождения разбор меняется, рядом стоит «предварительно» и назван час
 * перехода — по московскому времени или по времени указанного места.
 *
 * Второго человека вошедшему в аккаунт предлагаем сохранить в свои люди,
 * если в тарифе есть свободное место.
 */

export function PairPerson({
  who,
  person,
  view,
  loading,
  canSave,
  onRefine,
}: {
  who: 0 | 1;
  person: BirthValue;
  view: PairViewId;
  loading: boolean;
  /** в тарифе есть свободное место, и человек вошёл в аккаунт */
  canSave: boolean;
  onRefine: (who: 0 | 1, next: BirthValue) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const chart = useMemo(
    () =>
      buildNatalChart({
        date: person.date,
        time: person.time,
        tz: person.place?.tz ?? null,
        latitude: person.place?.lat ?? null,
        longitude: person.place?.lon ?? null,
      }),
    [person],
  );

  // Проверка суток стоит десятки миллисекунд — считаем только когда нужна.
  const variation = useMemo(() => {
    if (chart.moment.precision === "exact") return { preliminary: false, facts: [] as string[] };
    const tz = person.place?.tz ?? null;
    const name = person.place?.label ?? null;
    const v = view === "composite" ? hdDayVariation(person.date, tz, name) : natalDayVariation(person.date, tz, name);
    return { preliminary: !v.stable, facts: v.facts };
  }, [chart.moment.precision, person.date, person.place?.tz, person.place?.label, view]);

  const exact = chart.moment.precision === "exact";

  async function saveAsPerson() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await backend.people.insert(user.id, {
      name: `Партнёр, ${formatBirthDate(person.date)}`,
      relation: "partner",
      birth_date: person.date,
      birth_time: person.time,
      sex: null,
      ...birthPlaceFields(person.place, person.placeText),
    });
    setSaving(false);
    if (error) {
      setSaveError("Не удалось сохранить. Попробуйте ещё раз");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="w-full max-w-full rounded-[16px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
      <div className="flex flex-wrap items-baseline" style={{ gap: 10 }}>
        <span className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {who === 0 ? "Первый" : "Второй"}
        </span>
        <span className="text-text-primary" style={{ fontSize: 16 }}>
          {formatBirthDate(person.date)}
        </span>
        <span className="text-text-secondary" style={{ fontSize: 14 }}>
          {person.time ?? "время не указано"}
          {person.place ? `, ${person.place.name}` : ""}
        </span>
        {variation.preliminary && (
          <span
            className="inline-flex items-center rounded-full border border-text-accent/50 px-3 py-1 text-text-accent"
            style={{ fontSize: 12, letterSpacing: "0.04em" }}
          >
            предварительно
          </span>
        )}
      </div>

      <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
        {loading
          ? "Пересчитываем…"
          : exact
            ? "Момент рождения известен точно — расчёт полный"
            : person.place
              ? "Времени рождения нет: расчёт сделан на полдень по местному времени, и часть связей может отличаться"
              : `Ни времени, ни места: расчёт сделан на полдень по всемирному времени, это ${moscowClock(chart.moment.utc)} (мск). Аспекты к асценденту и наложение домов не считаются вовсе`}
      </p>

      {variation.facts.length > 0 && (
        <ul className="mt-2 flex flex-col" style={{ gap: 6 }}>
          {variation.facts.map((f) => (
            <li key={f} className="text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
              · {f}
            </li>
          ))}
        </ul>
      )}

      <RefineBirth
        birth={person}
        onRefine={(next) => onRefine(who, next)}
        label={exact ? "Изменить время и место" : "Уточнить время и место"}
      />

      {canSave && !saved && (
        <div className="mt-3">
          <button
            type="button"
            onClick={saveAsPerson}
            disabled={saving}
            className="qc-focus inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10"
            style={{ height: 44 }}
          >
            {saving ? "Сохраняю…" : "Сохранить как человека"}
          </button>
          <p className="mt-2 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Появится в кабинете — не придётся вводить дату снова
          </p>
        </div>
      )}

      {saved && (
        <p className="mt-3 text-text-accent" style={{ fontSize: 14 }}>
          Сохранено в ваших людей
        </p>
      )}
      {saveError && <p className="mt-2 text-[13px] text-text-danger">{saveError}</p>}
      {who === 1 && isAuthenticated && !canSave && !saved && (
        <p className="mt-3 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Свободных мест в тарифе нет — сохранить этого человека не получится
        </p>
      )}
    </div>
  );
}
