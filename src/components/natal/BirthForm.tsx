"use client";

import { useState } from "react";
import { DateSelects, type DateParts } from "@/components/direction/DateCalculator";
import { PlaceField } from "@/components/common/PlaceField";
import { isValidDate } from "@/lib/arcana";
import { toIsoDate } from "@/lib/pendingBirth";
import type { Place } from "@/lib/geo/placesIndex";

export type BirthValue = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM или null, если время неизвестно */
  time: string | null;
  place: Place | null;
  /** то, что человек набрал в поле места */
  placeText: string;
};

/**
 * Данные рождения: дата, время и место. Время и место необязательны —
 * без них карта считается на полдень, а дома и асцендент честно
 * помечаются как неопределённые.
 */
export function BirthForm({
  submitLabel = "Построить карту",
  busy = false,
  initial,
  onSubmit,
}: {
  submitLabel?: string;
  busy?: boolean;
  initial?: Partial<BirthValue>;
  onSubmit: (value: BirthValue) => void;
}) {
  const parsed = initial?.date?.split("-").map(Number);
  const [date, setDate] = useState<DateParts>({
    day: parsed ? String(parsed[2]) : "",
    month: parsed ? String(parsed[1]) : "",
    year: parsed ? String(parsed[0]) : "",
  });
  const initialTime = initial?.time?.split(":") ?? [];
  const [hour, setHour] = useState(initialTime[0] ?? "");
  const [minute, setMinute] = useState(initialTime[1] ?? "");
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null);
  const [placeText, setPlaceText] = useState(initial?.placeText ?? initial?.place?.label ?? "");

  const complete = date.day !== "" && date.month !== "" && date.year !== "";
  const dateInvalid = complete && !isValidDate(Number(date.day), Number(date.month), Number(date.year));
  const timeIncomplete = (hour === "") !== (minute === "");
  const disabled = !complete || dateInvalid || timeIncomplete || busy;

  const selectClass =
    "qc-focus h-14 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 text-[17px] text-text-primary transition-colors focus:border-text-accent";

  return (
    <div style={{ marginTop: 28 }}>
      <DateSelects idPrefix="natal-birth" value={date} onChange={setDate} />

      <div className="mt-3 flex flex-col gap-3 md:flex-row">
        <select className={selectClass} value={hour} onChange={(e) => setHour(e.target.value)} aria-label="Час рождения">
          <option value="">Час рождения</option>
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select className={selectClass} value={minute} onChange={(e) => setMinute(e.target.value)} aria-label="Минуты">
          <option value="">Минуты</option>
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <PlaceField
          value={place}
          text={placeText}
          onChange={({ value, text }) => {
            setPlace(value);
            setPlaceText(text);
          }}
          hint={false}
        />
      </div>

      {dateInvalid ? (
        <p className="text-text-secondary" style={{ marginTop: 10, fontSize: 14 }}>
          Такой даты не существует
        </p>
      ) : null}
      {timeIncomplete ? (
        <p className="text-text-secondary" style={{ marginTop: 10, fontSize: 14 }}>
          Выберите и час, и минуты — или оставьте оба поля пустыми
        </p>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          !disabled &&
          onSubmit({
            date: toIsoDate(Number(date.day), Number(date.month), Number(date.year)),
            time: hour !== "" && minute !== "" ? `${hour}:${minute}` : null,
            place,
            placeText,
          })
        }
        className="qc-focus rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity"
        style={{ marginTop: 20, height: 54, paddingInline: 40, opacity: disabled ? 0.4 : 1 }}
      >
        {busy ? "Считаем" : submitLabel}
      </button>

      <p className="text-text-secondary" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5 }}>
        Время и место — по желанию. Без них посчитаются знаки планет, но не дома и не асцендент: они меняются
        каждые два часа, и выдумывать их мы не будем
      </p>
    </div>
  );
}
