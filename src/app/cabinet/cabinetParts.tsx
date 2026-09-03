"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import { DateSelects, type DateParts } from "@/components/direction/DateCalculator";
import { directions } from "@/lib/directions";
import { formatBirthDate, takeProfileSaveError, toIsoDate } from "@/lib/pendingBirth";
import { arcana, centralArcanum, isValidDate, MONTHS } from "@/lib/arcana";
import { lifePath, lifePathNumber } from "@/lib/numerology";
import { sunSign } from "@/lib/natal";
import { backend } from "@/lib/backend";
import { dayArcanum, todayIso } from "@/lib/dayCard";
import { useAuth } from "@/lib/useAuth";
import { referralLink } from "@/lib/referral";
import { TarotFlipCard } from "@/components/tarot/TarotFlipCard";

export type Profile = {
  id: string;
  name: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  referral_code: string | null;
};

export const cardStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: "28px",
} as const;

export const capStyle = {
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

export type Birth = { day: number; month: number; year: number } | null;

export function parseDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { day: d, month: m, year: y };
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4"
      style={{ fontSize: "clamp(14px, 1.05vw, 16px)" }}
    >
      <span className="text-text-secondary">{label}</span>
      {value ? (
        <span className="text-text-primary">{value}</span>
      ) : (
        <span className="text-text-secondary opacity-50">не указано</span>
      )}
    </div>
  );
}

export function ProfileCard({
  profile,
  loading,
  editing,
  onEdit,
  onCancel,
  onSaved,
}: {
  profile: Profile | null;
  loading: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (next: Profile) => void;
}) {
  const [name, setName] = useState(profile?.name ?? "Мой профиль");
  const [place, setPlace] = useState(profile?.birth_place ?? "");
  const parsed = parseDate(profile?.birth_date ?? null);
  const [date, setDate] = useState<DateParts>({
    day: parsed ? String(parsed.day) : "",
    month: parsed ? String(parsed.month) : "",
    year: parsed ? String(parsed.year) : "",
  });
  const time = (profile?.birth_time ?? "").slice(0, 5).split(":");
  const [hour, setHour] = useState(time[0] ?? "");
  const [minute, setMinute] = useState(time[1] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setName(profile?.name ?? "Мой профиль");
    setPlace(profile?.birth_place ?? "");
    const p = parseDate(profile?.birth_date ?? null);
    setDate({
      day: p ? String(p.day) : "",
      month: p ? String(p.month) : "",
      year: p ? String(p.year) : "",
    });
    const t = (profile?.birth_time ?? "").slice(0, 5).split(":");
    setHour(t[0] ?? "");
    setMinute(t[1] ?? "");
    setError(null);
  }, [editing, profile]);

  async function save() {
    if (!profile) return;
    const d = Number(date.day);
    const m = Number(date.month);
    const y = Number(date.year);
    const hasDate = date.day !== "" && date.month !== "" && date.year !== "";
    if (hasDate && !isValidDate(d, m, y)) {
      setError("Такой даты не существует");
      return;
    }
    setBusy(true);
    const next = {
      name: name.trim() || "Мой профиль",
      birth_date: hasDate ? toIsoDate(d, m, y) : null,
      birth_time: hour !== "" && minute !== "" ? `${hour}:${minute}` : null,
      birth_place: place.trim() || null,
    };
    const { error: updateError } = await backend.profiles.update(profile.id, next);
    setBusy(false);
    if (updateError) {
      setError("Не удалось сохранить. Попробуй ещё раз");
      return;
    }
    onSaved({ ...profile, ...next });
  }

  const timeSelect =
    "qc-focus h-14 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 text-[17px] text-text-primary transition-colors focus:border-text-accent";
  const inputClass =
    "qc-focus h-14 w-full rounded-[12px] border border-border bg-surface-1 px-4 text-[17px] text-text-primary transition-colors focus:border-text-accent";

  return (
    <div style={cardStyle} className="h-full">
      <div className="text-text-secondary" style={capStyle}>
        Профиль
      </div>

      {editing && profile ? (
        <div className="mt-4 flex flex-col gap-3">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Имя профиля"
            maxLength={60}
          />
          <DateSelects idPrefix="cab-date" value={date} onChange={setDate} />
          <div className="flex gap-3">
            <select
              className={timeSelect}
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              aria-label="Часы"
            >
              <option value="">Часы</option>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <select
              className={timeSelect}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              aria-label="Минуты"
            >
              <option value="">Минуты</option>
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <input
            className={inputClass}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Место рождения"
            aria-label="Место рождения"
            maxLength={120}
          />
          {error && <p className="text-[13px]" style={{ color: "var(--text-danger)" }}>{error}</p>}
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex h-[50px] items-center justify-center px-6 text-[16px] transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                background: "var(--accent)",
                color: "var(--accent-foreground, #12100e)",
                borderRadius: "12px",
              }}
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-[15px] text-text-secondary hover:text-text-primary"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="mt-[10px] font-display text-text-primary"
            style={{ fontSize: "clamp(20px, 1.6vw, 26px)" }}
          >
            {loading ? "…" : (profile?.name ?? "Мой профиль")}
          </div>

          <div className="mt-4 flex flex-col" style={{ gap: 10 }}>
            <Row
              label="Дата"
              value={profile?.birth_date ? formatBirthDate(profile.birth_date) : null}
            />
            <Row label="Время" value={profile?.birth_time?.slice(0, 5) ?? null} />
            <Row label="Место" value={profile?.birth_place ?? null} />
          </div>

          <button
            type="button"
            onClick={onEdit}
            className="mt-[18px] block text-[15px] text-text-accent hover:opacity-80"
          >
            Изменить
          </button>

          {(!profile?.birth_time || !profile?.birth_place) && (
            <p className="mt-2 text-[13px] text-text-secondary">
              Добавь время и место — откроются натальная карта и дизайн человека
            </p>
          )}
        </>
      )}
    </div>
  );
}

function tileResult(id: string, birth: Birth): { value: string; mono?: boolean } | { status: string } {
  if (id === "tarot") return { status: "Расклад доступен" };
  if (id === "humandesign") return { status: "Нужен полный расчёт" };
  if (!birth) return { status: "Заполни дату рождения" };

  if (id === "matrix") {
    const n = centralArcanum(birth.day, birth.month, birth.year);
    const card = arcana.find((a) => a.n === n);
    return { value: `${n} · ${card?.name ?? ""}`, mono: true };
  }
  if (id === "numerology") {
    const n = lifePathNumber(birth.day, birth.month, birth.year);
    const item = lifePath.find((l) => l.n === n);
    return { value: `${n} · ${item?.title ?? ""}`, mono: true };
  }
  if (id === "natal") {
    const { sign } = sunSign(birth.day, birth.month);
    return { value: sign.name };
  }
  return { status: "Добавь профиль близкого" };
}

export function DirectionTile({
  id,
  title,
  birth,
  onFill,
}: {
  id: string;
  title: string;
  birth: Birth;
  onFill: () => void;
}) {
  const res = tileResult(id, birth);
  const needsDate = !birth && id !== "tarot";

  const body = (
    <>
      <div className="font-display text-text-primary" style={{ fontSize: "clamp(18px, 1.4vw, 24px)" }}>
        {title}
      </div>
      <div className="mt-3">
        {"value" in res ? (
          <span
            className="text-text-accent"
            style={{
              fontSize: "clamp(20px, 1.7vw, 28px)",
              fontFamily: res.mono ? "var(--font-mono)" : undefined,
            }}
          >
            {res.value}
          </span>
        ) : (
          <span
            className="text-text-secondary"
            style={{ fontSize: "clamp(14px, 1.05vw, 16px)" }}
          >
            {res.status}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className="absolute bottom-4 right-5 text-text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        →
      </span>
    </>
  );

  const className =
    "group relative block w-full text-left transition-all duration-300 hover:-translate-y-1";
  const style = {
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    borderRadius: "18px",
    padding: "24px",
  } as const;

  if (needsDate) {
    return (
      <button type="button" onClick={onFill} className={`${className} cab-tile`} style={style}>
        {body}
      </button>
    );
  }

  return (
    <Link href={`/cabinet/${id}`} className={`${className} cab-tile`} style={style}>
      {body}
    </Link>
  );
}

export function InviteBlock({ code, userId }: { code: string | null; userId: string }) {
  const [invited, setInvited] = useState(0);
  const [copied, setCopied] = useState(false);
  const link = code ? referralLink(code) : "";

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    backend.profiles.myReferralCount(userId).then((n) => {
      if (alive) setInvited(n);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* буфер недоступен */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="mt-6"
      style={{
        background: "var(--surface-1)",
        border: "1px solid color-mix(in srgb, var(--text-accent) 40%, transparent)",
        borderRadius: "20px",
        padding: "clamp(24px, 2.4vw, 36px)",
      }}
    >
      <div className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 27px)" }}>
        Пригласить друга
      </div>
      <p
        className="text-text-secondary"
        style={{ fontSize: "clamp(14px, 1.1vw, 17px)", marginTop: 10, maxWidth: 620 }}
      >
        Друг регистрируется по твоей ссылке — вы оба получаете семь дней полного доступа.
        Считается после того, как он заполнит дату рождения
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center" style={{ marginTop: 20 }}>
        <input
          readOnly
          value={link}
          aria-label="Ссылка-приглашение"
          className="min-w-0 flex-1 text-text-primary"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(13px, 1.05vw, 15px)",
            background: "var(--bg-page)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px",
          }}
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-[50px] shrink-0 items-center justify-center px-6 text-[16px] text-text-accent transition-opacity hover:opacity-80"
          style={{
            background: "transparent",
            border: "1px solid color-mix(in srgb, var(--text-accent) 50%, transparent)",
            borderRadius: "12px",
          }}
        >
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </div>

      <p className="text-text-secondary" style={{ fontSize: 13, marginTop: 16 }}>
        Приглашено: {invited}
      </p>
    </div>
  );
}
