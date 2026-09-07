"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { formatBirthDate, takeProfileSaveError } from "@/lib/pendingBirth";
import { backend, type Person, type PersonPatch, type Plan, type Subscription, type ReadingRow } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import { DEMO_MODE } from "@/lib/env";
import { peopleLeft, isSubscriptionActive } from "@/lib/access";
import { formatRub } from "@/lib/plansDefault";
import { BotPanel } from "@/components/bot/BotPanel";
import { SpreadsPanel } from "@/components/tarot/SpreadsPanel";
import { AutoRenewPanel } from "@/components/billing/AutoRenewPanel";
import { MakeImageButton } from "@/components/image/MakeImageButton";
import { calculateMatrix, dayArcana, arcanaName, arcanaLine, readingPath, formatDateDots, urlDateToIso, CALC_TYPES, FORECAST_VIEW } from "@/lib/matrix";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { track } from "@/components/analytics/track";
import { InviteBlock, cardStyle, capStyle, isPlaceholderName, type Profile } from "./cabinetParts";
import { PeopleCards } from "./PeopleCards";
import { MentorFab } from "@/components/chat/MentorFab";
import { CopyButton } from "@/components/common/CopyButton";

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
  // Чья карточка сейчас в режиме правки. «Заполнить дату» в блоке
  // «Сегодня» открывает правку владельца и подводит к его карточке.
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const active = isSubscriptionActive(sub);
  const left = peopleLeft({ plan, subscription: sub, people });
  const addDate = search.get("add") ? urlDateToIso(search.get("add") as string) : null;

  /**
   * Владелец без даты: сохраняем в профиль, а карточку «Я» из него создаст
   * `reload` — так было и раньше, когда данные вводились в блоке «Профиль».
   */
  async function createOwner(patch: PersonPatch & { birth_date: string }): Promise<string | null> {
    if (!user) return "Нет пользователя";
    const fields = {
      name: patch.name ?? "Я",
      birth_date: patch.birth_date,
      birth_time: patch.birth_time ?? null,
      birth_place: patch.birth_place ?? null,
      birth_place_id: patch.birth_place_id ?? null,
      birth_lat: patch.birth_lat ?? null,
      birth_lon: patch.birth_lon ?? null,
      birth_tz: patch.birth_tz ?? null,
    };
    const res = profile
      ? await backend.profiles.update(profile.id, fields)
      : await backend.profiles.insert({ user_id: user.id, is_owner: true, referred_by: null, ...fields });
    if (res.error) return res.error.message;
    setSaveError(false);
    await reload();
    return null;
  }

  /** Правка карточки. Владельца — ещё и в профиль: это одни данные в двух местах. */
  async function savePerson(person: Person, patch: PersonPatch & { birth_date: string }): Promise<string | null> {
    const res = await backend.people.update(person.id, patch);
    if (res.error) return res.error.message;
    if (person.relation === "self" && profile) {
      await backend.profiles.update(profile.id, {
        name: patch.name ?? profile.name,
        birth_date: patch.birth_date,
        birth_time: patch.birth_time ?? null,
        birth_place: patch.birth_place ?? null,
        birth_place_id: patch.birth_place_id ?? null,
        birth_lat: patch.birth_lat ?? null,
        birth_lon: patch.birth_lon ?? null,
        birth_tz: patch.birth_tz ?? null,
      });
    }
    await reload();
    return null;
  }

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>

      {/* Отступ сверху небольшой: между шапкой и «Сегодня» не должно быть
          пустого тёмного поля. */}
      <div className="mx-auto w-[min(1320px,92vw)]" style={{ paddingTop: 16, paddingBottom: "clamp(60px, 8vh, 110px)" }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}>
              Мой кабинет
            </h1>
            {/* Три строки под заголовком — разведены кеглем и цветом, а не
                свалены в одну: дата крупнее и светлее, почта тише, ID —
                моноширинным с кнопкой копирования. */}
            <div className="mt-3 flex flex-col" style={{ gap: 4 }}>
              <div className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)" }}>
                {self?.birth_date ? formatBirthDate(self.birth_date) : "Дата рождения не заполнена"}
              </div>
              {email && (
                <div className="text-text-secondary" style={{ fontSize: 14 }}>
                  {email}
                </div>
              )}
              {profile?.client_id && (
                <div className="flex items-center gap-2 text-text-secondary" style={{ fontSize: 13 }}>
                  <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 11, opacity: 0.8 }}>ID</span>
                  <span className="font-mono text-text-primary" data-copy-text={profile.client_id} style={{ fontSize: 13, letterSpacing: "0.04em", opacity: 0.85 }}>
                    {profile.client_id}
                  </span>
                  <CopyButton text={profile.client_id} compact className="rounded-full px-1" />
                </div>
              )}
            </div>
          </div>
          <PlanBadge plan={plan} active={active} credits={credits} />
        </div>

        {saveError && (
          <p className="mt-6 rounded-[10px] bg-surface-1 p-[14px] text-[14px] text-text-danger">Не удалось сохранить дату рождения. Заполни её в профиле</p>
        )}
        {DEMO_MODE && <p className="mt-4 text-[13px] text-text-danger">Демо-режим: база не подключена, данные живут в этом браузере.</p>}

        {/* Сегодня */}
        <div className="mt-5">
          {self ? (
            <TodayBlock person={self} />
          ) : (
            <NeedDate
              loading={loading}
              onFill={() => document.getElementById("person-self")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          )}
        </div>

        {/* Мои люди — главный блок: карточки с шестью системами каждая */}
        <div className="mt-8">
          {loading && people.length === 0 ? (
            <div style={cardStyle} className="!p-5 md:!p-7">
              <div className="text-text-secondary" style={capStyle}>Мои люди</div>
              <p className="mt-3 text-[15px] text-text-secondary">Загружаем…</p>
            </div>
          ) : (
            <PeopleCards
              people={people}
              self={self}
              left={left}
              active={active}
              planTitle={plan?.title ?? null}
              prefillDate={addDate}
              editingId={editingId}
              onEditingChange={setEditingId}
              onCreateOwner={createOwner}
              onSave={savePerson}
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
          )}
        </div>

        {/* Телеграм-бот — единственное место на сайте, где о нём сказано */}
        <BotPanel people={people.map((p) => ({ id: p.id, name: p.name }))} />

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
        <div className="mt-10" id="plan">
          <PlanBlock
            plan={plan}
            plans={plans}
            sub={sub}
            active={active}
            credits={credits}
            onCancel={async () => {
              if (!user) return false;
              const ok = await backend.billing.cancel(user.id);
              if (ok) await reload();
              return ok;
            }}
          />
        </div>

        <InviteBlock code={profile?.referral_code ?? null} userId={user?.id ?? ""} />
      </div>

      <Footer />
      <MentorFab />
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
    // «Сегодня» — сцена, а не карточка: без рамки и фона-коробки, чтобы
    // глаз отличал информационный блок от карточек людей, с которыми
    // работают. Свечение за иллюстрацией и линия снизу живут в CSS
    // (.today-scene в globals.css).
    <section className="today-scene relative">
      <div aria-hidden="true" className="today-glow" />

      <div className="relative flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-text-accent" style={capStyle}>
          Сегодня · {formatBirthDate(t.date)}
          {!isPlaceholderName(person.name) ? ` · ${person.name}` : ""}
        </div>
        <button type="button" onClick={() => setCalendar((c) => !c)} className="text-[14px] text-text-accent underline-offset-4 hover:underline" aria-expanded={calendar}>
          {calendar ? "Скрыть календарь" : "Календарь месяца →"}
        </button>
      </div>

      <div className="relative mt-5 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8">
        <div className="today-card justify-self-start">
          <ArcanaImage n={t.dayArcana} width="clamp(120px, 11vw, 150px)" size="md" rounded={10} priority />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(34px, 4.2vw, 52px)", lineHeight: 1.05 }}>
            <span className="text-text-accent" style={{ marginRight: "0.2em" }}>{t.dayArcana}</span>
            {arcanaName(t.dayArcana)}
          </h2>
          <p className="mt-3 text-[16px] leading-[1.65] text-text-secondary" style={{ maxWidth: "56ch" }}>{text ?? arcanaLine(t.dayArcana)}</p>
          <p className="mt-3 text-[13px] text-text-secondary/80">
            Завтра — {t.tomorrowArcana}, {arcanaName(t.tomorrowArcana)}
          </p>
        </div>
        {/* Период и личный год — две строки с тонкой чертой слева, а не две коробки */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:w-[250px] md:grid-cols-1">
          <TodayStat label={`Период ${t.from}–${t.to} лет`} value={`${t.arcana} · ${arcanaName(t.arcana)}`} sub={`смена через ${t.yearsToChange.toFixed(1)} г.`} />
          <TodayStat label={`Личный год ${t.year}`} value={`${t.yearArcana} · ${arcanaName(t.yearArcana)}`} sub={`новый через ${yearChange} дн.`} />
        </div>
      </div>

      {calendar && <MonthCalendar periodArcana={t.arcana} today={t.date} />}

      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        <Link href={readingPath("prognoz", [person.birth_date])} className="rounded-full bg-accent px-4 py-2 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90">Прогноз и личный год</Link>
        <Link href="/nastavnik" className="rounded-full border border-border px-4 py-2 text-[14px] text-text-secondary hover:border-text-accent/60 hover:text-text-primary">Спросить наставника</Link>
        {/* Образ по любой из семи тем. «Я» — это подпись строки в списке
            людей, а не имя: на карточку такое не ставим. */}
        <MakeImageButton
          birthIso={person.birth_date}
          name={!isPlaceholderName(person.name) ? person.name : null}
          className="qc-focus rounded-full border border-border px-4 text-[14px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
          style={{ height: 38 }}
        />
      </div>

      {/* Граница между «сегодня» и «людьми»: тонкая линия, уходящая в темноту */}
      <div aria-hidden="true" className="today-rule" />
    </section>
  );
}

/** Строка сцены «Сегодня»: тонкая черта слева, без коробки. */
function TodayStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="today-stat">
      <div className="text-[10px] uppercase tracking-[0.12em] text-text-secondary">{label}</div>
      <div className="mt-0.5 text-[15px] text-text-primary">{value}</div>
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

function PlanBlock({
  plan,
  plans,
  sub,
  active,
  credits,
  onCancel,
}: {
  plan: Plan | null;
  plans: Plan[];
  sub: Subscription | null;
  active: boolean;
  credits: number;
  onCancel: () => Promise<boolean>;
}) {
  const end = sub ? new Date(sub.current_period_end) : null;
  const endLabel = end ? end.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";
  const canceled = Boolean(sub?.canceled_at);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    const ok = await onCancel();
    setBusy(false);
    if (!ok) setError("Не удалось отменить. Попробуйте ещё раз");
    else setConfirming(false);
  }

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
              ? canceled
                ? `Отменена. Доступ сохраняется до ${endLabel}, дальше — бесплатный режим. Всё накопленное остаётся.`
                : `Действует до ${endLabel}. Отменить можно в любой день.`
              : plans.length
                ? `От ${formatRub(Math.min(...plans.map((p) => p.price_month)))} в месяц. Открывает все системы, все типы разбора и аркан дня.`
                : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/tarify" className="inline-flex h-11 items-center rounded-[12px] bg-accent px-5 text-[15px] font-medium text-primary-foreground">
              {active ? "Сменить тариф" : "Выбрать тариф"}
            </Link>
            {/* Кнопка отмены — видная, рядом со сменой тарифа, а не
                спрятанная. Слова «отменить можно в любой день» без
                кнопки — обещание, которое нечем выполнить. */}
            {active && !canceled && !confirming && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="qc-focus inline-flex h-11 items-center rounded-[12px] border border-border px-5 text-[15px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
              >
                Отменить подписку
              </button>
            )}
          </div>

          {confirming && (
            <div className="mt-4 rounded-[14px] border border-border/60" style={{ padding: 16 }}>
              <div className="text-text-primary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                Отменить подписку «{plan?.title}»?
              </div>
              <p className="mt-2 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
                Доступ сохранится до {endLabel} — всё, что оплачено, остаётся вашим до конца этого срока. Потом доступ
                перейдёт в бесплатный режим: карта дня и бесплатные части разборов останутся, платные закроются.
                Кредиты на счету, сделанные расклады и образы никуда не денутся. Списаний больше не будет.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="qc-focus inline-flex h-11 items-center rounded-[12px] border border-text-danger/60 px-5 text-[15px] text-text-danger transition-colors hover:bg-text-danger/10 disabled:opacity-50"
                >
                  {busy ? "Отменяем…" : "Да, отменить"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="qc-focus inline-flex h-11 items-center rounded-[12px] border border-border px-5 text-[15px] text-text-secondary transition-colors hover:text-text-primary"
                >
                  Оставить
                </button>
              </div>
              {error && <p className="mt-2 text-[14px] text-text-danger">{error}</p>}
            </div>
          )}

          {/* Автопродление: что спишется, когда, и видная кнопка отказа —
              отдельно от отмены, как и было */}
          {active && !canceled && <AutoRenewPanel />}
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
