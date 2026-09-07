"use client";

import { useState } from "react";
import Link from "next/link";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { DateSelects, type DateParts } from "@/components/direction/DateCalculator";
import { PlaceField } from "@/components/common/PlaceField";
import { useGoToReading } from "@/components/reading/CalcTheater";
import { RELATION_LABELS, type Person, type PersonInsert, type PersonPatch, type Relation } from "@/lib/backend";
import { arcanaName, calculateMatrix, readingPath } from "@/lib/matrix";
import { buildChartQuery, buildNameQuery, buildPairQuery, chartPath, isoToChartUrlDate } from "@/lib/chartUrl";
import { isFutureDate, isValidDate } from "@/lib/arcana";
import { formatBirthDate, toIsoDate } from "@/lib/pendingBirth";
import { birthPlaceFields, hasResolvedPlace, placeFromFields } from "@/lib/geo/birthPlace";
import type { Place } from "@/lib/geo/placesIndex";
import { capStyle, displayName, isPlaceholderName, parseDate } from "./cabinetParts";

/**
 * МОИ ЛЮДИ — ГЛАВНЫЙ БЛОК КАБИНЕТА.
 *
 * Кабинет собран вокруг людей, а не вокруг систем: каждый человек — своя
 * карточка с иллюстрацией центрального аркана, датой, временем и местом
 * рождения, и всеми шестью системами внизу. Первая карточка — сам
 * владелец. Данные правятся на месте карандашом — без отдельной формы
 * профиля где-то внизу страницы.
 *
 * Последняя карточка в ряду — пустая, с плюсом: «Добавить человека». Она
 * есть всегда, и на исчерпанном лимите тоже: пустое место продаёт, а
 * отсутствие места — нет. По нажатию там либо форма, либо короткое
 * объяснение, какой тариф открывает больше людей.
 */

const RELATIONS: Relation[] = ["partner", "child", "mother", "father", "friend", "colleague", "other"];

const inputClass =
  "qc-focus h-12 w-full rounded-[12px] border border-border bg-bg-page px-4 text-[16px] text-text-primary transition-colors focus:border-text-accent";
const selectClass =
  "qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-bg-page px-4 text-[16px] text-text-primary transition-colors focus:border-text-accent";
const chipClass =
  "qc-focus inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[13px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary";

const cardClass = "flex flex-col rounded-[20px] border border-border bg-surface-1";
const cardPad = { padding: "clamp(16px, 1.6vw, 22px)" } as const;

/** Что человек вводит в форме — одно и то же для правки и добавления. */
type Draft = {
  name: string;
  relation: Relation;
  date: DateParts;
  hour: string;
  minute: string;
  place: Place | null;
  placeText: string;
};

function draftFrom(p: Person | null, relation: Relation = "partner"): Draft {
  const d = parseDate(p?.birth_date ?? null);
  const [hh, mm] = (p?.birth_time ?? "").slice(0, 5).split(":");
  return {
    name: p && !isPlaceholderName(p.name) ? p.name : "",
    relation: p?.relation ?? relation,
    date: { day: d ? String(d.day) : "", month: d ? String(d.month) : "", year: d ? String(d.year) : "" },
    hour: hh ?? "",
    minute: mm ?? "",
    place: p ? placeFromFields(p) : null,
    placeText: p?.birth_place ?? "",
  };
}

/** Проверка черновика: дата обязательна, время — либо целиком, либо никак. */
function validate(d: Draft): string | null {
  if (d.date.day === "" || d.date.month === "" || d.date.year === "") return "Укажите дату рождения";
  const day = Number(d.date.day);
  const month = Number(d.date.month);
  const year = Number(d.date.year);
  if (!isValidDate(day, month, year)) return "Такой даты не существует";
  if (isFutureDate(day, month, year)) return "Эта дата ещё не наступила";
  if ((d.hour === "") !== (d.minute === "")) return "Выберите и час, и минуты — или не выбирайте вовсе";
  return null;
}

function toPatch(d: Draft, fallbackName: string): PersonPatch & { birth_date: string } {
  return {
    name: d.name.trim() || fallbackName,
    relation: d.relation,
    birth_date: toIsoDate(Number(d.date.day), Number(d.date.month), Number(d.date.year)),
    birth_time: d.hour !== "" && d.minute !== "" ? `${d.hour}:${d.minute}` : null,
    ...birthPlaceFields(d.place, d.placeText),
  };
}

/* ─── форма ──────────────────────────────────────────────────────── */

function PersonForm({
  initial,
  isSelf,
  submitLabel,
  onSubmit,
  onCancel,
  onRemove,
  removeName,
}: {
  initial: Draft;
  isSelf: boolean;
  submitLabel: string;
  onSubmit: (draft: Draft) => Promise<string | null>;
  onCancel?: () => void;
  onRemove?: () => Promise<void>;
  removeName?: string;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  async function submit() {
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit(draft);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={`grid gap-3 ${isSelf ? "" : "sm:grid-cols-2"}`}>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-text-secondary">{isSelf ? "Как вас зовут" : "Имя"}</span>
          <input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={isSelf ? "Имя — как к вам обращаться" : "Как называть"}
            maxLength={60}
            className={inputClass}
          />
        </label>
        {!isSelf && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-text-secondary">Кто это</span>
            <select value={draft.relation} onChange={(e) => set({ relation: e.target.value as Relation })} className={selectClass}>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATION_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-[13px] text-text-secondary">Дата рождения</span>
        <DateSelects idPrefix={`person-${isSelf ? "self" : "new"}-${initial.name.length}`} value={draft.date} onChange={(date) => set({ date })} gap={10} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-[13px] text-text-secondary">Время рождения, если известно</span>
          <div className="flex gap-2">
            <select value={draft.hour} onChange={(e) => set({ hour: e.target.value })} aria-label="Часы" className={selectClass}>
              <option value="">Часы</option>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <select value={draft.minute} onChange={(e) => set({ minute: e.target.value })} aria-label="Минуты" className={selectClass}>
              <option value="">Минуты</option>
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
            value={draft.place}
            text={draft.placeText}
            onChange={({ value, text }) => set({ place: value, placeText: text })}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-[14px] text-text-danger">{error}</p>}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="qc-focus inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Сохраняем…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="qc-focus py-2 text-[15px] text-text-secondary hover:text-text-primary">
            Отмена
          </button>
        )}
        {/* Удаление — внутри режима правки, с подтверждением, не на виду. */}
        {onRemove && !confirmRemove && (
          <button type="button" onClick={() => setConfirmRemove(true)} className="qc-focus ml-auto py-2 text-[14px] text-text-secondary/70 hover:text-text-danger">
            Удалить
          </button>
        )}
      </div>

      {onRemove && confirmRemove && (
        <div className="rounded-[12px] border border-text-danger/40" style={{ padding: 14 }}>
          <p className="text-text-primary" style={{ fontSize: 14, lineHeight: 1.55 }}>
            Удалить {removeName ? `«${removeName}»` : "этого человека"} из списка? Разборы по этой дате останутся открыты по своим ссылкам,
            но из кабинета человек исчезнет.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                await onRemove();
              }}
              disabled={busy}
              className="qc-focus inline-flex h-10 items-center rounded-[10px] border border-text-danger/60 px-4 text-[14px] text-text-danger hover:bg-text-danger/10 disabled:opacity-50"
            >
              Да, удалить
            </button>
            <button type="button" onClick={() => setConfirmRemove(false)} disabled={busy} className="qc-focus inline-flex h-10 items-center rounded-[10px] border border-border px-4 text-[14px] text-text-secondary">
              Оставить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── карточка человека ──────────────────────────────────────────── */

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3" style={{ fontSize: 14 }}>
      <span className="text-text-secondary">{label}</span>
      {value ? <span className="text-right text-text-primary">{value}</span> : <span className="text-text-secondary opacity-50">не указано</span>}
    </div>
  );
}

function PersonCard({
  person,
  people,
  editing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  person: Person;
  people: Person[];
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: PersonPatch & { birth_date: string }) => Promise<string | null>;
  onRemove: () => Promise<void>;
}) {
  const go = useGoToReading();
  const isSelf = person.relation === "self";
  const core = calculateMatrix(person.birth_date).core.C;
  const name = displayName(person);
  const others = people.filter((p) => p.id !== person.id);
  const chart = buildChartQuery({ time: person.birth_time ? person.birth_time.slice(0, 5) : null, placeId: hasResolvedPlace(person) ? person.birth_place_id : null });

  function pairWith(otherId: string) {
    const other = people.find((p) => p.id === otherId);
    if (!other) return;
    const q = buildPairQuery(
      { time: person.birth_time ? person.birth_time.slice(0, 5) : null, placeId: hasResolvedPlace(person) ? person.birth_place_id : null },
      { time: other.birth_time ? other.birth_time.slice(0, 5) : null, placeId: hasResolvedPlace(other) ? other.birth_place_id : null },
    );
    go(`/sovmestimost/${isoToChartUrlDate(person.birth_date)}/${isoToChartUrlDate(other.birth_date)}${q}`);
  }

  return (
    <div id={`person-${person.id}`} className={`${cardClass} scroll-mt-28 ${isSelf ? "border-text-accent/40" : ""}`} style={cardPad}>
      <div className="flex items-start gap-4">
        <ArcanaImage n={core} width={88} rounded={12} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 26px)", lineHeight: 1.15 }}>
                {name}
              </div>
              <div className="mt-1 text-[13px] text-text-secondary">
                {isSelf ? "Вы" : RELATION_LABELS[person.relation]} · аркан {core}, {arcanaName(core)}
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Изменить: ${name}`}
                title="Изменить"
                className="qc-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.5 3.5l3 3L7 16H4v-3z" />
                  <path d="M11.5 5.5l3 3" />
                </svg>
              </button>
            )}
          </div>
          {isSelf && isPlaceholderName(person.name) && !editing && (
            <button type="button" onClick={onEdit} className="qc-focus mt-2 py-1 text-[14px] text-text-accent underline-offset-4 hover:underline">
              Ввести имя
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-5">
          <PersonForm
            initial={draftFrom(person)}
            isSelf={isSelf}
            submitLabel="Сохранить"
            onSubmit={(d) => onSave(toPatch(d, isSelf ? "Я" : RELATION_LABELS[d.relation]))}
            onCancel={onCancel}
            onRemove={isSelf ? undefined : onRemove}
            removeName={name}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col" style={{ gap: 8 }}>
            <Row label="Дата" value={formatBirthDate(person.birth_date)} />
            <Row label="Время" value={person.birth_time ? person.birth_time.slice(0, 5) : null} />
            <Row label="Место" value={person.birth_place ?? null} />
          </div>
          {person.birth_place && !hasResolvedPlace(person) && (
            <p className="mt-2 text-[13px] text-text-secondary">Место записано словами, без координат. Выберите его из списка — посчитаются дома и асцендент</p>
          )}
          {(!person.birth_time || !person.birth_place) && (
            <p className="mt-2 text-[13px] text-text-secondary">Добавьте время и место — откроются натальная карта и дизайн человека целиком</p>
          )}
        </>
      )}

      {/* Шесть систем — для этого человека */}
      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="text-text-secondary" style={{ ...capStyle, fontSize: 11 }}>
          Шесть систем
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={() => go(readingPath("matrica", [person.birth_date]))} className={chipClass}>
            Матрица
          </button>
          <Link href={`${chartPath("natal", person.birth_date)}${chart}`} className={chipClass}>
            Натальная карта
          </Link>
          <Link href={`${chartPath("humandesign", person.birth_date)}${chart}`} className={chipClass}>
            Дизайн человека
          </Link>
          <Link href={`${chartPath("numerology", person.birth_date)}${buildNameQuery(isPlaceholderName(person.name) ? null : person.name)}`} className={chipClass}>
            Нумерология
          </Link>
          <Link href={`/taro/${isoToChartUrlDate(person.birth_date)}`} className={chipClass}>
            Карта дня
          </Link>
          {person.relation === "child" && (
            <button type="button" onClick={() => go(readingPath("detskaya", [person.birth_date]))} className={chipClass}>
              Детская матрица
            </button>
          )}
          {/* Совместимость: второго выбирают тут же, потом — страница пары */}
          <label className="relative inline-flex">
            <span className="sr-only">Совместимость: с кем</span>
            <select
              aria-label={`Совместимость: с кем сравнить ${name}`}
              className="qc-focus h-[34px] appearance-none rounded-full border border-border bg-transparent pl-3 pr-7 text-[13px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
              value=""
              onChange={(e) => e.target.value && pairWith(e.target.value)}
              disabled={others.length === 0}
              title={others.length === 0 ? "Добавьте второго человека" : undefined}
            >
              <option value="">{others.length === 0 ? "Совместимость · добавьте второго" : "Совместимость с…"}</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {displayName(o)}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" style={{ fontSize: 10 }}>
              ▾
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ─── карточка владельца без даты ────────────────────────────────── */

function OwnerEmptyCard({ onCreate }: { onCreate: (draft: Draft) => Promise<string | null> }) {
  return (
    <div id="person-self" className={`${cardClass} scroll-mt-28 border-text-accent/40`} style={cardPad}>
      <div className="flex items-start gap-4">
        <div className="flex h-[117px] w-[88px] shrink-0 items-center justify-center rounded-[12px] border border-dashed border-border text-text-secondary" style={{ fontSize: 28 }}>
          ?
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 26px)", lineHeight: 1.15 }}>
            Вы
          </div>
          <p className="mt-1 text-[14px] text-text-secondary" style={{ lineHeight: 1.5 }}>
            Введите имя и дату рождения — и кабинет соберётся вокруг вас: аркан дня, все шесть систем, люди рядом
          </p>
        </div>
      </div>
      <div className="mt-5">
        <PersonForm initial={draftFrom(null, "self")} isSelf submitLabel="Сохранить" onSubmit={onCreate} />
      </div>
    </div>
  );
}

/* ─── пустая карточка с плюсом ───────────────────────────────────── */

function AddCard({
  canAdd,
  hasPlan,
  planTitle,
  prefill,
  onAdd,
}: {
  canAdd: boolean;
  hasPlan: boolean;
  planTitle: string | null;
  prefill: string | null;
  onAdd: (row: PersonInsert) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(Boolean(prefill));
  const initial = draftFrom(null);
  if (prefill) {
    const d = parseDate(prefill);
    if (d) initial.date = { day: String(d.day), month: String(d.month), year: String(d.year) };
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="qc-focus group flex min-h-[220px] flex-col items-center justify-center rounded-[20px] border border-dashed border-border text-text-secondary transition-colors hover:border-text-accent/70 hover:bg-accent/5 hover:text-text-primary"
        style={cardPad}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-[30px] leading-none transition-colors group-hover:border-text-accent/70 group-hover:text-text-accent" aria-hidden="true">
          +
        </span>
        <span className="mt-3 text-[15px]">Добавить человека</span>
      </button>
    );
  }

  if (!canAdd) {
    return (
      <div className={cardClass} style={cardPad}>
        <div className="text-text-secondary" style={capStyle}>
          Добавить человека
        </div>
        <p className="mt-3 text-text-primary" style={{ fontSize: 15, lineHeight: 1.6 }}>
          {hasPlan
            ? `На тарифе «${planTitle}» все места заняты. «Семейный» открывает пятерых — партнёра, детей, родителей; «Практик» — без ограничений.`
            : "Люди рядом — по подписке. «Семейный» открывает пятерых — партнёра, детей, родителей — и совместимость между ними; «Практик» — без ограничений."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/tarify" className="qc-focus inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground">
            {hasPlan ? "Сменить тариф" : "Тарифы"}
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="qc-focus py-2 text-[15px] text-text-secondary hover:text-text-primary">
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass} style={cardPad}>
      <div className="text-text-secondary" style={capStyle}>
        Новый человек
      </div>
      <div className="mt-4">
        <PersonForm
          initial={initial}
          isSelf={false}
          submitLabel="Добавить"
          onSubmit={async (d) => {
            const err = await onAdd({ ...toPatch(d, RELATION_LABELS[d.relation]), sex: null } as PersonInsert);
            if (!err) setOpen(false);
            return err;
          }}
          onCancel={() => setOpen(false)}
        />
      </div>
    </div>
  );
}

/* ─── блок целиком ───────────────────────────────────────────────── */

export function PeopleCards({
  people,
  self,
  left,
  active,
  planTitle,
  prefillDate,
  editingId,
  onEditingChange,
  onCreateOwner,
  onSave,
  onAdd,
  onRemove,
}: {
  people: Person[];
  self: Person | null;
  left: number | null;
  active: boolean;
  planTitle: string | null;
  prefillDate: string | null;
  /** чья карточка в режиме правки — состояние живёт у страницы */
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  onCreateOwner: (patch: PersonPatch & { birth_date: string }) => Promise<string | null>;
  onSave: (person: Person, patch: PersonPatch & { birth_date: string }) => Promise<string | null>;
  onAdd: (row: PersonInsert) => Promise<string | null>;
  onRemove: (id: string) => Promise<void>;
}) {
  const setEditingId = onEditingChange;
  const ordered = self ? [self, ...people.filter((p) => p.id !== self.id)] : people;
  const canAdd = active && (left === null || left > 0);

  return (
    <div id="people" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-text-secondary" style={capStyle}>
          Мои люди
        </div>
        <p className="text-[13px] text-text-secondary">
          {active
            ? left === null
              ? `Тариф «${planTitle}»: без ограничений`
              : `Тариф «${planTitle}»: можно добавить ещё ${left}`
            : "По подписке открываются полные разборы людей из этого списка и совместимости между ними"}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!self && (
          <OwnerEmptyCard onCreate={async (d) => onCreateOwner(toPatch(d, "Я"))} />
        )}
        {ordered.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            people={ordered}
            editing={editingId === p.id}
            onEdit={() => setEditingId(p.id)}
            onCancel={() => setEditingId(null)}
            onSave={async (patch) => {
              const err = await onSave(p, patch);
              if (!err) setEditingId(null);
              return err;
            }}
            onRemove={async () => {
              await onRemove(p.id);
              setEditingId(null);
            }}
          />
        ))}
        <AddCard canAdd={canAdd} hasPlan={active} planTitle={planTitle} prefill={prefillDate} onAdd={onAdd} />
      </div>
    </div>
  );
}
