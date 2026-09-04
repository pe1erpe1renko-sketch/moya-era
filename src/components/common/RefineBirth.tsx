"use client";

import { useState } from "react";
import { PlaceField } from "@/components/common/PlaceField";
import { backend } from "@/lib/backend";
import { birthPlaceFields } from "@/lib/geo/birthPlace";
import { useAuth } from "@/lib/useAuth";
import type { Place } from "@/lib/geo/placesIndex";
import type { BirthValue } from "@/components/natal/BirthForm";

/**
 * Уточнение времени и места прямо в блоке результата.
 *
 * Человек уже видит разбор и понимает, чего в нём не хватает, — значит и
 * дополнять данные он должен здесь же, не возвращаясь к форме наверху.
 * Дату не спрашиваем: она уже введена. После пересчёта вошедшему в
 * аккаунт предлагаем сохранить уточнение в профиль, чтобы не вводить его
 * снова.
 */

const selectClass =
  "qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-3 text-[16px] text-text-primary transition-colors focus:border-text-accent";

export function RefineBirth({
  birth,
  onRefine,
  label = "Уточнить время и место",
}: {
  birth: BirthValue;
  onRefine: (next: BirthValue) => void;
  label?: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(birth.time?.split(":")[0] ?? "");
  const [minute, setMinute] = useState(birth.time?.split(":")[1] ?? "");
  const [place, setPlace] = useState<Place | null>(birth.place ?? null);
  const [placeText, setPlaceText] = useState(birth.placeText ?? "");
  const [refined, setRefined] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const timeIncomplete = (hour === "") !== (minute === "");
  const nothingNew =
    (hour === "" || minute === "" || `${hour}:${minute}` === birth.time) && (place?.id ?? null) === (birth.place?.id ?? null);

  function apply() {
    if (timeIncomplete || nothingNew) return;
    onRefine({
      ...birth,
      time: hour !== "" && minute !== "" ? `${hour}:${minute}` : birth.time,
      place,
      placeText,
    });
    setRefined(true);
    setSaved(false);
    setSaveError(null);
  }

  async function saveToProfile() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    const { data: profile, error } = await backend.profiles.getOwner(user.id);
    if (error || !profile) {
      setSaving(false);
      setSaveError("Не удалось открыть профиль. Попробуйте ещё раз");
      return;
    }
    const patch = {
      birth_time: hour !== "" && minute !== "" ? `${hour}:${minute}` : profile.birth_time,
      ...birthPlaceFields(place, placeText),
    };
    const { error: updateError } = await backend.profiles.update(profile.id, patch);
    setSaving(false);
    if (updateError) {
      setSaveError("Не удалось сохранить. Попробуйте ещё раз");
      return;
    }
    setSaved(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="qc-focus mt-4 inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10"
        style={{ height: 46 }}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="mt-4 w-full max-w-full overflow-hidden rounded-[16px] border border-border bg-surface-1"
      style={{ padding: "16px 18px" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-text-primary" style={{ fontSize: 15 }}>
          Уточнить данные рождения
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-text-secondary hover:text-text-primary"
          style={{ fontSize: 14 }}
        >
          Свернуть
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-[13px] text-text-secondary">Время рождения</span>
          <div className="flex gap-2">
            <select className={selectClass} value={hour} onChange={(e) => setHour(e.target.value)} aria-label="Уточнить час рождения">
              <option value="">Час</option>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <select className={selectClass} value={minute} onChange={(e) => setMinute(e.target.value)} aria-label="Уточнить минуты рождения">
              <option value="">Мин</option>
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-0">
          <span className="mb-1.5 block text-[13px] text-text-secondary">Место рождения</span>
          <PlaceField
            value={place}
            text={placeText}
            onChange={({ value, text }) => {
              setPlace(value);
              setPlaceText(text);
            }}
            hint={false}
            ariaLabel="Уточнить место рождения"
            className="qc-focus h-12 w-full rounded-[12px] border border-border bg-surface-1 px-3 text-[16px] text-text-primary transition-colors focus:border-text-accent"
          />
        </div>
      </div>

      {timeIncomplete && (
        <p className="mt-2 text-[13px] text-text-secondary">Выберите и час, и минуты</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={timeIncomplete || nothingNew}
          className="qc-focus inline-flex items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground transition-opacity"
          style={{ height: 44, opacity: timeIncomplete || nothingNew ? 0.4 : 1 }}
        >
          Уточнить
        </button>

        {refined && isAuthenticated && !saved && (
          <button
            type="button"
            onClick={saveToProfile}
            disabled={saving}
            className="qc-focus inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10"
            style={{ height: 44 }}
          >
            {saving ? "Сохраняю…" : "Сохранить в профиль"}
          </button>
        )}

        {saved && (
          <span className="text-text-accent" style={{ fontSize: 14 }}>
            Сохранено в профиль
          </span>
        )}
      </div>

      {saveError && <p className="mt-2 text-[13px] text-text-danger">{saveError}</p>}

      {refined && !saved && (
        <p className="mt-3 text-[13px] leading-snug text-text-secondary">
          Разбор пересчитан по новым данным
          {isAuthenticated ? ". Сохраните их в профиль, чтобы не вводить снова" : ""}
        </p>
      )}
    </div>
  );
}
