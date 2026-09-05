"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { directions } from "@/lib/directions";
import { formatBirthDate, takeProfileSaveError } from "@/lib/pendingBirth";
import { backend, RELATION_LABELS, type Person, type PersonInsert, type Plan, type Relation, type Subscription, type ReadingRow } from "@/lib/backend";
import { PlaceField } from "@/components/common/PlaceField";
import { birthPlaceFields } from "@/lib/geo/birthPlace";
import type { Place } from "@/lib/geo/placesIndex";
import { useAuth } from "@/lib/useAuth";
import { DEMO_MODE } from "@/lib/env";
import { peopleLeft, isSubscriptionActive } from "@/lib/access";
import { formatRub } from "@/lib/plansDefault";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { BotPanel } from "@/components/bot/BotPanel";
import { SpreadsPanel } from "@/components/tarot/SpreadsPanel";
import { MakeImageButton } from "@/components/image/MakeImageButton";
import { calculateMatrix, dayArcana, arcanaName, arcanaLine, readingPath, formatDateDots, urlDateToIso, CALC_TYPES, FORECAST_VIEW } from "@/lib/matrix";
import { ArcanaCard } from "@/components/reading/Spheres";
import { DateField } from "@/components/reading/DateField";
import { useGoToReading } from "@/components/reading/CalcTheater";
import { track } from "@/components/analytics/track";
import { ProfileCard, InviteBlock, DirectionTile, parseDate, cardStyle, capStyle, type Profile } from "./cabinetParts";

/* ────────────────────────────────────────────────────────────────── */

export default function CabinetPage() {
  const { user, email } = useAuth();
  const search = useSearchParams();
  const [saveError, setSaveError] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [credits, setCredits] = useState(0);
  const [readings, setReadings] = useState<ReadingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (takeProfileSaveError()) setSaveError(true);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const [prof, ppl, s, allPlans, bal, rds] = await Promise.all([
      backend.profiles.getOwner(user.id),
      backend.people.list(user.id),
      backend.billing.subscription(user.id),
      backend.billing.plans(),
      backend.billing.creditBalance(user.id),
      backend.readings.list(user.id),
    ]);
    const p = prof.data ?? null;
    let list = ppl.data ?? [];

    // «Я» создаётся из даты профиля один раз
    if (p?.birth_date && !list.some((x) => x.relation === "self")) {
      const created = await backend.people.insert(user.id, {
        name: p.name && p.name !== "Мой профиль" ? p.name : "Я",
        relation: "self",
        birth_date: p.birth_date,
        birth_time: p.birth_time,
        birth_place: p.birth_place,
        birth_place_id: p.birth_place_id,
        birth_lat: p.birth_lat,
        birth_lon: p.birth_lon,
        birth_tz: p.birth_tz,
        sex: null,
      });
      if (created.data) list = [created.data, ...list];
    }

    setProfile(p);
    setPeople(list);
    setSub(s);
    setPlans(allPlans);
    setPlan(s ? allPlans.find((x) => x.id === s.plan_id) ?? null : null);
    setCredits(bal);
    setReadings(rds);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const self = people.find((p) => p.relation === "self") ?? null;
  const birth = parseDate(self?.birth_date ?? profile?.birth_date ?? null);
  const active = isSubscriptionActive(sub);
  const left = peopleLeft({ plan, subscription: sub, people });
  const addDate = search.get("add") ? urlDateToIso(search.get("add") as string) : null;

  function startEditing() {
    setEditing(true);
    profileRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[90px] w-full md:h-[110px]">
        <Header />
      </div>

      <div className="mx-auto w-[min(1320px,92vw)]" style={{ paddingTop: "clamp(32px, 6vh, 90px)", paddingBottom: "clamp(60px, 8vh, 110px)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}>
              Мой кабинет
            </h1>
            <p className="mt-[10px] text-text-secondary" style={{ fontSize: "clamp(14px, 1.1vw, 17px)" }}>
              {self?.birth_date ? formatBirthDate(self.birth_date) : "Дата рождения не заполнена"}
              {email ? ` · ${email}` : ""}
            </p>
          </div>
          <PlanBadge plan={plan} active={active} credits={credits} />
        </div>

        {saveError && (
          <p className="mt-6 rounded-[10px] bg-surface-1 p-[14px] text-[14px] text-text-danger">Не удалось сохранить дату рождения. Заполни её в профиле</p>
        )}
        {DEMO_MODE && <p className="mt-4 text-[13px] text-text-danger">Демо-режим: база не подключена, данные живут в этом браузере.</p>}

        {/* Сегодня */}
        <div className="mt-8">
          {self ? <TodayBlock person={self} /> : <NeedDate loading={loading} onFill={startEditing} />}
        </div>

        {/* Люди */}
        <div className="mt-8">
          <PeopleBlock
            people={people}
            self={self}
            left={left}
            planTitle={plan?.title ?? null}
            active={active}
            prefillDate={addDate}
            onAdd={async (row) => {
              if (!user) return "Нет пользователя";
              const res = await backend.people.insert(user.id, row);
              if (res.error) return res.error.message;
              track("person_add", { relation: row.relation });
              await reload();
              return null;
            }}
            onRemove={async (id) => {
              await backend.people.remove(id);
              await reload();
            }}
          />
        </div>

        {/* Телеграм-бот — единственное место на сайте, где о нём сказано */}
        <BotPanel people={people.map((p) => ({ id: p.id, name: p.name }))} />

        {/* Шесть систем */}
        <div className="mt-8">
          <div className="text-text-secondary" style={capStyle}>Шесть систем</div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {directions.map((d) =>
              d.id === "matrix" && self ? (
                <Link key={d.id} href={readingPath("matrica", [self.birth_date])} className="group relative block w-full text-left transition-all duration-300 hover:-translate-y-1" style={{ ...cardStyle, padding: 24, borderRadius: 18 }}>
                  <div className="font-display text-text-primary" style={{ fontSize: "clamp(18px, 1.4vw, 24px)" }}>{d.title}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <ArcanaImage n={calculateMatrix(self.birth_date).core.C} width={48} rounded={8} />
                    <span className="text-text-accent" style={{ fontSize: "clamp(20px, 1.7vw, 28px)", fontFamily: "var(--font-mono)" }}>
                      {calculateMatrix(self.birth_date).core.C} · {arcanaName(calculateMatrix(self.birth_date).core.C)}
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] text-text-secondary">12 сфер · 92 вопроса · постоянная ссылка</div>
                  <span aria-hidden="true" className="absolute bottom-4 right-5 text-text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">→</span>
                </Link>
              ) : d.id === "synastry" && self ? (
                <Link key={d.id} href="#people" className="group relative block w-full text-left transition-all duration-300 hover:-translate-y-1" style={{ ...cardStyle, padding: 24, borderRadius: 18 }}>
                  <div className="font-display text-text-primary" style={{ fontSize: "clamp(18px, 1.4vw, 24px)" }}>{d.title}</div>
                  <div className="mt-3 text-[15px] text-text-secondary">Считается с любым человеком из списка</div>
                </Link>
              ) : (
                <DirectionTile key={d.id} id={d.id} title={d.title} birth={birth} onFill={startEditing} />
              ),
            )}
          </div>
        </div>

        {/* Разборы */}
        {readings.length > 0 && (
          <div className="mt-8">
            <div className="text-text-secondary" style={capStyle}>Недавние разборы</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {readings.slice(0, 12).map((r) => {
                const t = [...CALC_TYPES, FORECAST_VIEW].find((x) => x.slug === r.calc_type);
                return (
                  <Link key={r.id} href={readingPath(r.calc_type, r.dates)} className="rounded-full border border-border px-4 py-2 text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary">
                    {t?.title ?? r.calc_type} · {r.dates.map(formatDateDots).join(" + ")}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Расклады таро — сделанные остаются и без подписки */}
        <SpreadsPanel />

        {/* Подписка и кредиты */}
        <div className="mt-10">
          <PlanBlock plan={plan} plans={plans} sub={sub} active={active} credits={credits} />
        </div>

        {/* Данные рождения — для натальной карты и дизайна человека */}
        <div className="mt-8 md:w-[60%]" ref={profileRef}>
          <ProfileCard
            profile={profile}
            loading={loading}
            editing={editing}
            onEdit={startEditing}
            onCancel={() => setEditing(false)}
            onSaved={async (next) => {
              setProfile(next);
              setEditing(false);
              const changed =
                next.birth_date !== self?.birth_date ||
                next.birth_time !== self?.birth_time ||
                next.birth_place !== self?.birth_place ||
                next.birth_place_id !== self?.birth_place_id;
              if (self && next.birth_date && changed) {
                await backend.people.update(self.id, {
                  birth_date: next.birth_date,
                  birth_time: next.birth_time,
                  birth_place: next.birth_place,
                  birth_place_id: next.birth_place_id,
                  birth_lat: next.birth_lat,
                  birth_lon: next.birth_lon,
                  birth_tz: next.birth_tz,
                });
              }
              await reload();
            }}
          />
        </div>

        <InviteBlock code={profile?.referral_code ?? null} userId={user?.id ?? ""} />
      </div>

      <Footer />
    </main>
  );
}

/* ─── Сегодня ────────────────────────────────────────────────────── */

function TodayBlock({ person }: { person: Person }) {
  const matrix = useMemo(() => calculateMatrix(person.birth_date, new Date()), [person.birth_date]);
  const t = matrix.today;
  const [text, setText] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/content/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "prognoz", dates: [formatUrl(person.birth_date)], slots: ["day_energy"] }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { answers?: Array<{ slotId: string; locked: boolean; text?: string }> } | null) => {
        if (!alive) return;
        const a = d?.answers?.find((x) => x.slotId === "day_energy");
        if (a && !a.locked && a.text) setText(a.text);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [person.birth_date]);

  const yearChange = useMemo(() => {
    const [, m, d] = person.birth_date.split("-").map(Number);
    const now = new Date();
    let next = new Date(now.getFullYear(), m - 1, d);
    if (next <= now) next = new Date(now.getFullYear() + 1, m - 1, d);
    return Math.ceil((next.getTime() - now.getTime()) / 86400000);
  }, [person.birth_date]);

  return (
    <div style={cardStyle} className="!p-5 md:!p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-text-secondary" style={capStyle}>
          Сегодня · {formatDateDots(t.date)}
          {person.name !== "Я" ? ` · ${person.name}` : ""}
        </div>
        <button type="button" onClick={() => setCalendar((c) => !c)} className="text-[14px] text-text-accent underline-offset-4 hover:underline" aria-expanded={calendar}>
          {calendar ? "Скрыть календарь" : "Календарь месяца"}
        </button>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-start">
        <ArcanaCard n={t.dayArcana} size={96} />
        <div className="min-w-0">
          <div className="font-display text-text-primary" style={{ fontSize: "clamp(26px, 2.6vw, 40px)", lineHeight: 1.05 }}>
            {t.dayArcana} · {arcanaName(t.dayArcana)}
          </div>
          <p className="mt-2 text-[16px] leading-[1.65] text-text-secondary">{text ?? arcanaLine(t.dayArcana)}</p>
          <p className="mt-3 text-[14px] text-text-secondary/80">
            Завтра — аркан {t.tomorrowArcana}, {arcanaName(t.tomorrowArcana)}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:w-[260px] md:grid-cols-1">
          <Stat label={`Период ${t.from}–${t.to} лет`} value={`${t.arcana} · ${arcanaName(t.arcana)}`} sub={`смена через ${t.yearsToChange.toFixed(1)} г.`} />
          <Stat label={`Личный год ${t.year}`} value={`${t.yearArcana} · ${arcanaName(t.yearArcana)}`} sub={`новый через ${yearChange} дн.`} />
        </div>
      </div>

      {calendar && <MonthCalendar periodArcana={t.arcana} today={t.date} />}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={readingPath("prognoz", [person.birth_date])} className="rounded-full border border-text-accent/50 px-4 py-2 text-[14px] text-text-primary hover:bg-accent/10">Прогноз и личный год</Link>
        <Link href="/nastavnik" className="rounded-full border border-border px-4 py-2 text-[14px] text-text-secondary hover:border-text-accent/60 hover:text-text-primary">Спросить наставника</Link>
        {/* Образ по любой из семи тем. «Я» — это подпись строки в списке
            людей, а не имя: на карточку такое не ставим. */}
        <MakeImageButton
          birthIso={person.birth_date}
          name={person.name && person.name !== "Я" ? person.name : null}
          className="qc-focus rounded-full border border-border px-4 text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
          style={{ height: 38 }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[14px] border border-border/60 bg-bg-page/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">{label}</div>
      <div className="mt-1 text-[15px] text-text-primary">{value}</div>
      <div className="mt-0.5 text-[12px] text-text-secondary/80">{sub}</div>
    </div>
  );
}

function MonthCalendar({ periodArcana, today }: { periodArcana: number; today: string }) {
  const [y, m] = today.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // понедельник — первый
  const cells: Array<{ day: number; iso: string; arcana: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso, arcana: dayArcana(iso, periodArcana) });
  }
  const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  return (
    <div className="mt-5 rounded-[16px] border border-border/60 p-4">
      <div className="text-[14px] text-text-secondary">{MONTHS[m - 1]} {y} · аркан каждого дня</div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-text-secondary">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
        {cells.map((c, i) =>
          c ? (
            <div key={c.iso} title={`${c.day}: аркан ${c.arcana} — ${arcanaName(c.arcana)}`} className={`rounded-[8px] border py-1.5 ${c.iso === today ? "border-text-accent bg-accent/20 text-text-primary" : "border-border/40 text-text-secondary"}`}>
              <div className="text-[11px]">{c.day}</div>
              <div className="text-[13px] font-medium text-text-primary">{c.arcana}</div>
            </div>
          ) : (
            <div key={`e${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

function NeedDate({ loading, onFill }: { loading: boolean; onFill: () => void }) {
  return (
    <div style={cardStyle}>
      <div className="text-text-secondary" style={capStyle}>Сегодня</div>
      <p className="mt-3 text-[16px] text-text-secondary">{loading ? "Загружаю…" : "Заполните дату рождения — и здесь появится аркан дня, период жизни и личный год."}</p>
      {!loading && (
        <button type="button" onClick={onFill} className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground">
          Заполнить дату
        </button>
      )}
    </div>
  );
}

/* ─── Люди ───────────────────────────────────────────────────────── */

const RELATIONS: Relation[] = ["partner", "child", "mother", "father", "friend", "colleague", "other"];

function PeopleBlock({
  people,
  self,
  left,
  planTitle,
  active,
  prefillDate,
  onAdd,
  onRemove,
}: {
  people: Person[];
  self: Person | null;
  left: number | null;
  planTitle: string | null;
  active: boolean;
  prefillDate: string | null;
  onAdd: (row: PersonInsert) => Promise<string | null>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(Boolean(prefillDate));
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("partner");
  const [date, setDate] = useState<string | null>(prefillDate);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [place, setPlace] = useState("");
  const [placeValue, setPlaceValue] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = useGoToReading();

  const canAdd = active && (left === null || left > 0);

  async function submit() {
    if (!date) {
      setError("Укажите дату рождения");
      return;
    }
    setBusy(true);
    const err = await onAdd({
      name: name.trim() || RELATION_LABELS[relation],
      relation,
      birth_date: date,
      birth_time: hour !== "" && minute !== "" ? `${hour}:${minute}` : null,
      ...birthPlaceFields(placeValue, place),
      sex: null,
    });
    setBusy(false);
    if (err) setError(err);
    else {
      setAdding(false);
      setName("");
      setDate(null);
      setHour("");
      setMinute("");
      setPlace("");
      setPlaceValue(null);
      setError(null);
    }
  }

  return (
    <div id="people" style={cardStyle} className="scroll-mt-24 !p-5 md:!p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-text-secondary" style={capStyle}>Мои люди</div>
          <p className="mt-1 text-[14px] text-text-secondary">
            {active
              ? left === null
                ? `Тариф «${planTitle}»: без ограничений`
                : `Тариф «${planTitle}»: можно добавить ещё ${left}`
              : "По подписке открываются полные разборы людей из этого списка и совместимости между ними"}
          </p>
        </div>
        {canAdd ? (
          <button type="button" onClick={() => setAdding((a) => !a)} className="inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground">
            {adding ? "Отмена" : "Добавить человека"}
          </button>
        ) : (
          <Link href="/tarify" className="inline-flex h-11 items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary hover:bg-accent/10">
            {active ? "Расширить тариф" : "Выбрать тариф"}
          </Link>
        )}
      </div>

      {adding && canAdd && (
        <div className="mt-5 rounded-[16px] border border-border/60 bg-bg-page/40 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-text-secondary">Имя</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как называть" className="qc-focus h-12 w-full rounded-[12px] border border-border bg-surface-1 px-4 text-[16px] text-text-primary focus:border-text-accent" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-text-secondary">Кто это</span>
              <select value={relation} onChange={(e) => setRelation(e.target.value as Relation)} className="qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 text-[16px] text-text-primary focus:border-text-accent">
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>{RELATION_LABELS[r]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3">
            {date ? (
              <p className="text-[15px] text-text-primary">
                Дата рождения: {formatDateDots(date)}{" "}
                <button type="button" onClick={() => setDate(null)} className="ml-2 text-[13px] text-text-accent underline-offset-4 hover:underline">изменить</button>
              </p>
            ) : (
              <DateField label="Дата рождения" submitLabel="Выбрать" onSubmit={(iso) => setDate(iso)} />
            )}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-[13px] text-text-secondary">Время рождения, если известно</span>
              <div className="flex gap-3">
                <select value={hour} onChange={(e) => setHour(e.target.value)} aria-label="Часы" className="qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 text-[16px] text-text-primary focus:border-text-accent">
                  <option value="">Часы</option>
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select value={minute} onChange={(e) => setMinute(e.target.value)} aria-label="Минуты" className="qc-focus h-12 w-full appearance-none rounded-[12px] border border-border bg-surface-1 px-4 text-[16px] text-text-primary focus:border-text-accent">
                  <option value="">Минуты</option>
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] text-text-secondary">Место рождения</span>
              <PlaceField
                value={placeValue}
                text={place}
                onChange={({ value, text }) => {
                  setPlaceValue(value);
                  setPlace(text);
                }}
                className="qc-focus h-12 w-full rounded-[12px] border border-border bg-surface-1 px-4 text-[16px] text-text-primary focus:border-text-accent"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-[14px] text-text-danger">{error}</p>}
          <button type="button" onClick={submit} disabled={busy || !date} className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground disabled:opacity-40">
            {busy ? "Сохраняю…" : "Сохранить"}
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => {
          const c = calculateMatrix(p.birth_date).core.C;
          return (
            <div key={p.id} className="rounded-[16px] border border-border/60 bg-bg-page/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[16px] text-text-primary">{p.name}</div>
                  <div className="text-[13px] text-text-secondary">{RELATION_LABELS[p.relation]} · {formatDateDots(p.birth_date)}</div>
                </div>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-text-accent/50 font-display text-[16px] text-text-accent" title={`Центральный аркан ${c} — ${arcanaName(c)}`}>{c}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => go(readingPath("matrica", [p.birth_date]))} className="rounded-full border border-border px-3 py-1 text-[13px] text-text-secondary hover:border-text-accent/60 hover:text-text-primary">Матрица</button>
                {p.relation === "child" && (
                  <button type="button" onClick={() => go(readingPath("detskaya", [p.birth_date]))} className="rounded-full border border-border px-3 py-1 text-[13px] text-text-secondary hover:border-text-accent/60 hover:text-text-primary">Детская</button>
                )}
                {self && p.relation !== "self" && (
                  <button type="button" onClick={() => go(readingPath(p.relation === "colleague" ? "biznes" : p.relation === "child" ? "mama-rebenok" : "sovmestimost", [self.birth_date, p.birth_date]))} className="rounded-full border border-border px-3 py-1 text-[13px] text-text-secondary hover:border-text-accent/60 hover:text-text-primary">
                    {p.relation === "colleague" ? "Бизнес" : p.relation === "child" ? "Мама и ребёнок" : "Совместимость"}
                  </button>
                )}
                {p.relation !== "self" && (
                  <button type="button" onClick={() => onRemove(p.id)} className="rounded-full px-2 py-1 text-[13px] text-text-secondary/70 hover:text-text-danger" aria-label={`Удалить ${p.name}`}>
                    удалить
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {people.length === 0 && <p className="text-[15px] text-text-secondary">Пока никого. Заполните свою дату — появится «Я».</p>}
      </div>
    </div>
  );
}

/* ─── Тариф ──────────────────────────────────────────────────────── */

function PlanBadge({ plan, active, credits }: { plan: Plan | null; active: boolean; credits: number }) {
  return (
    <div className="flex items-center gap-2 text-[14px]">
      <span className={`rounded-full border px-3 py-1 ${active ? "border-text-accent/60 text-text-primary" : "border-border text-text-secondary"}`}>
        {active && plan ? plan.title : "Без подписки"}
      </span>
      <span className="rounded-full border border-border px-3 py-1 text-text-secondary">{credits} кредитов</span>
    </div>
  );
}

function PlanBlock({ plan, plans, sub, active, credits }: { plan: Plan | null; plans: Plan[]; sub: Subscription | null; active: boolean; credits: number }) {
  const end = sub ? new Date(sub.current_period_end) : null;
  return (
    <div style={cardStyle} className="!p-5 md:!p-7">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-text-secondary" style={capStyle}>Подписка</div>
          <div className="mt-1 font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 28px)" }}>
            {active && plan ? plan.title : "Не оформлена"}
          </div>
          <p className="mt-2 text-[14px] text-text-secondary">
            {active && end
              ? `Действует до ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}. Отменить можно в любой день.`
              : plans.length
                ? `От ${formatRub(Math.min(...plans.map((p) => p.price_month)))} в месяц. Открывает все системы, все типы разбора и аркан дня.`
                : ""}
          </p>
          <Link href="/tarify" className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground">
            {active ? "Сменить тариф" : "Выбрать тариф"}
          </Link>
        </div>
        <div>
          <div className="text-text-secondary" style={capStyle}>Кредиты наставника</div>
          <div className="mt-1 font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 28px)" }}>{credits}</div>
          <p className="mt-2 text-[14px] text-text-secondary">Один кредит — одно сообщение наставнику. Чтение разборов кредитов не тратит.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/nastavnik" className="inline-flex h-11 items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary hover:bg-accent/10">Открыть чат</Link>
            <Link href="/tarify#credits" className="inline-flex h-11 items-center rounded-[12px] border border-border px-5 text-[15px] text-text-secondary hover:text-text-primary">Докупить</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatUrl(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
