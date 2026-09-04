"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateSelects, type DateParts } from "@/components/direction/DateCalculator";
import { PlaceField } from "@/components/common/PlaceField";
import { isValidDate } from "@/lib/arcana";
import { buildPairQuery } from "@/lib/chartUrl";
import { isoToUrlDate } from "@/lib/matrix";
import { toIsoDate } from "@/lib/pendingBirth";
import { backend, type Person } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import type { Place } from "@/lib/geo/placesIndex";

/**
 * ОДНА ФОРМА НА ТРИ ВЗГЛЯДА.
 *
 * Две даты обязательны, время и место у каждого — по желанию. Форма ничего
 * не считает: она собирает постоянный адрес пары и уводит на него. Дальше
 * даты живут в адресе, и спрашивать их заново уже не придётся никогда.
 *
 * Вошедшему в аккаунт вместо ручного ввода предлагается выбрать человека
 * из своих: дата, время и место подставятся сами.
 */

const EMPTY: DateParts = { day: "", month: "", year: "" };

const selectClass =
  "qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-3 text-[16px] text-text-primary transition-colors focus:border-text-accent";

type Side = {
  date: DateParts;
  hour: string;
  minute: string;
  place: Place | null;
  placeText: string;
};

const emptySide = (): Side => ({ date: EMPTY, hour: "", minute: "", place: null, placeText: "" });

const filled = (d: DateParts) =>
  d.day !== "" && d.month !== "" && d.year !== "" && isValidDate(Number(d.day), Number(d.month), Number(d.year));

/** Что собрала форма: две даты и готовая строка запроса с временем и местом. */
export type PairFormValue = {
  iso: [string, string];
  /** '?t1=0940&g1=524901' или пустая строка */
  query: string;
};

export function PairForm({
  submitLabel = "Показать разбор пары",
  onSubmit,
}: {
  submitLabel?: string;
  /** Если задан, форма не уводит на страницу пары, а отдаёт собранное. */
  onSubmit?: (value: PairFormValue) => void;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [sides, setSides] = useState<[Side, Side]>([emptySide(), emptySide()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Список нужен только вошедшему; после выхода его не показывает
    // условие ниже, поэтому чистить состояние не нужно.
    if (!user?.id) return;
    let alive = true;
    backend.people
      .list(user.id)
      .then((r) => {
        if (alive && r.data) setPeople(r.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const update = (who: 0 | 1, patch: Partial<Side>) =>
    setSides((prev) => {
      const next: [Side, Side] = [prev[0], prev[1]];
      next[who] = { ...next[who], ...patch };
      return next;
    });

  /** Подставляет данные выбранного человека вместо ручного ввода. */
  function pickPerson(who: 0 | 1, id: string) {
    if (!id) return update(who, emptySide());
    const person = people.find((p) => p.id === id);
    if (!person) return;
    const [y, m, d] = person.birth_date.split("-");
    const [hh, mm] = (person.birth_time ?? "").split(":");
    update(who, {
      date: { day: String(Number(d)), month: String(Number(m)), year: y },
      hour: hh ?? "",
      minute: mm ?? "",
      place:
        person.birth_place_id && person.birth_lat !== null && person.birth_lon !== null && person.birth_tz
          ? ({
              id: person.birth_place_id,
              name: person.birth_place ?? "",
              nameEn: "",
              country: "",
              countryName: "",
              region: null,
              lat: person.birth_lat,
              lon: person.birth_lon,
              tz: person.birth_tz,
              population: 0,
              label: person.birth_place ?? "",
            } satisfies Place)
          : null,
      placeText: person.birth_place ?? "",
    });
  }

  const ready = filled(sides[0].date) && filled(sides[1].date);
  const timeBroken = sides.some((s) => (s.hour === "") !== (s.minute === ""));
  const disabled = !ready || timeBroken || busy;

  function submit() {
    if (disabled) return;
    const iso: [string, string] = [
      toIsoDate(Number(sides[0].date.day), Number(sides[0].date.month), Number(sides[0].date.year)),
      toIsoDate(Number(sides[1].date.day), Number(sides[1].date.month), Number(sides[1].date.year)),
    ];
    const query = buildPairQuery(
      { time: sides[0].hour && sides[0].minute ? `${sides[0].hour}:${sides[0].minute}` : null, placeId: sides[0].place?.id ?? null },
      { time: sides[1].hour && sides[1].minute ? `${sides[1].hour}:${sides[1].minute}` : null, placeId: sides[1].place?.id ?? null },
    );
    if (onSubmit) {
      onSubmit({ iso, query });
      return;
    }
    setBusy(true);
    router.push(`/sovmestimost/${isoToUrlDate(iso[0])}/${isoToUrlDate(iso[1])}${query}`);
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sides.map((side, index) => {
          const who = index as 0 | 1;
          return (
            <div key={who}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-text-secondary" style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {who === 0 ? "Первый" : "Второй"}
                </span>
                {isAuthenticated && people.length > 0 && (
                  <select
                    className="qc-focus rounded-[10px] border border-border bg-surface-1 px-2 py-1 text-[13px] text-text-secondary"
                    aria-label={who === 0 ? "Выбрать первого из своих людей" : "Выбрать второго из своих людей"}
                    defaultValue=""
                    onChange={(e) => pickPerson(who, e.target.value)}
                  >
                    <option value="">Из своих людей</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mt-2.5">
                <DateSelects idPrefix={`pair-${who}`} value={side.date} onChange={(d) => update(who, { date: d })} gap={10} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[13px] text-text-secondary">Время рождения</span>
                  <div className="flex gap-2">
                    <select
                      className={selectClass}
                      value={side.hour}
                      onChange={(e) => update(who, { hour: e.target.value })}
                      aria-label={`Час рождения, ${who === 0 ? "первый" : "второй"}`}
                    >
                      <option value="">Час</option>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <select
                      className={selectClass}
                      value={side.minute}
                      onChange={(e) => update(who, { minute: e.target.value })}
                      aria-label={`Минуты рождения, ${who === 0 ? "первый" : "второй"}`}
                    >
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
                    value={side.place}
                    text={side.placeText}
                    onChange={({ value, text }) => update(who, { place: value, placeText: text })}
                    hint={false}
                    ariaLabel={`Место рождения, ${who === 0 ? "первый" : "второй"}`}
                    className="qc-focus h-12 w-full rounded-[12px] border border-border bg-surface-1 px-3 text-[16px] text-text-primary transition-colors focus:border-text-accent"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {timeBroken && <p className="mt-3 text-[13px] text-text-secondary">Выберите и час, и минуты — или не выбирайте вовсе</p>}

      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="qc-focus mt-6 rounded-[12px] bg-accent text-[17px] font-medium text-primary-foreground transition-opacity"
        style={{ height: 54, paddingInline: 40, opacity: disabled ? 0.4 : 1 }}
      >
        {busy ? "Считаем" : submitLabel}
      </button>

      <p className="mt-3 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
        Матрица считается по двум датам целиком. Время и место нужны синастрии и композиту: без них асцендент, дома и
        часть связей не определяются, и мы честно об этом пишем
      </p>
    </div>
  );
}
