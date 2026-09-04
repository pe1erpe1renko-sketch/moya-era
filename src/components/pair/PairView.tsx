"use client";

import { useEffect, useMemo, useState } from "react";
import { buildNatalChart } from "@/lib/natal";
import { buildHumanDesignChart } from "@/lib/humandesign";
import {
  DEFAULT_VIEW,
  PAIR_VIEWS,
  buildComposite,
  buildSynastry,
  compositeSections,
  synastrySections,
  viewByAnchor,
  type PairSection,
  type PairViewId,
} from "@/lib/pair";
import { Bodygraph } from "@/components/humandesign/Bodygraph";
import { Paywall } from "@/components/reading/Paywall";
import { ReadingView } from "@/components/reading/ReadingView";
import type { SlotText } from "@/components/reading/useReadingTexts";
import { formatBirthDate } from "@/lib/pendingBirth";
import type { BirthValue } from "@/components/natal/BirthForm";
import { CompositeCenters, ConnectionSummary } from "./CompositeCenters";
import { PairPerson } from "./PairPerson";
import { SynastryWheel } from "./SynastryWheel";
import { usePairTexts } from "./usePairTexts";

/**
 * СТРАНИЦА ПАРЫ — /sovmestimost/13-07-1998/09-04-1992
 *
 * Один расчёт, три взгляда: совместимость по матрице, синастрия и
 * композит. Переключение — на месте, без перезагрузки и без повторного
 * ввода дат; выбранный взгляд отражается якорем адреса.
 *
 * Бесплатно: схема пары и один абзац о главном по каждому взгляду.
 * Остальное под замком. Так второй человек, которому прислали ссылку,
 * открывает живой результат, а не замок с порога.
 */

export type PairInitialTexts = Partial<Record<PairViewId, Record<string, string>>>;

export type MatrixReadingProps = React.ComponentProps<typeof ReadingView>;

export function PairView({
  isoDates,
  initialTexts,
  matrixReading,
  people,
  loading,
  onRefine,
}: {
  isoDates: [string, string];
  /** бесплатные абзацы всех трёх взглядов, посчитанные на сервере */
  initialTexts: PairInitialTexts;
  /** пропсы матричного разбора пары — он остаётся как был */
  matrixReading: MatrixReadingProps;
  people: [BirthValue, BirthValue];
  loading: boolean;
  onRefine: (who: 0 | 1, next: BirthValue) => void;
}) {
  const [view, setView] = useState<PairViewId>(DEFAULT_VIEW);
  const [paywall, setPaywall] = useState(false);

  // Взгляд из якоря адреса — после гидратации, чтобы разметка совпала.
  useEffect(() => {
    const apply = () => setView(viewByAnchor(window.location.hash).id);
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function choose(next: PairViewId) {
    setView(next);
    const anchor = PAIR_VIEWS.find((v) => v.id === next)?.anchor ?? "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${anchor}`);
  }

  const toInput = (b: BirthValue) => ({
    date: b.date,
    time: b.time,
    tz: b.place?.tz ?? null,
    latitude: b.place?.lat ?? null,
    longitude: b.place?.lon ?? null,
    placeName: b.place?.label ?? b.placeText ?? null,
  });

  // Схемы считаются только для открытого взгляда: два расчёта вместо шести.
  const synastry = useMemo(
    () => (view === "synastry" ? buildSynastry(buildNatalChart(toInput(people[0])), buildNatalChart(toInput(people[1]))) : null),
    [view, people],
  );
  const composite = useMemo(
    () =>
      view === "composite"
        ? buildComposite(buildHumanDesignChart(toInput(people[0])), buildHumanDesignChart(toInput(people[1])))
        : null,
    [view, people],
  );

  const sections: PairSection[] = useMemo(() => {
    if (synastry) return synastrySections(synastry);
    if (composite) return compositeSections(composite);
    return [];
  }, [synastry, composite]);

  const refined = people.some((p) => p.time !== null || p.place !== null);
  const { texts, busy, unlocked, reason, peopleLeft, loggedIn, load, reset } = usePairTexts({
    first: { date: people[0].date, time: people[0].time, placeId: people[0].place?.id ?? null },
    second: { date: people[1].date, time: people[1].time, placeId: people[1].place?.id ?? null },
    view,
  });

  // Бесплатный абзац подгружаем, только когда серверного нет: после
  // уточнения это уже другая пара.
  useEffect(() => {
    const free = sections.flatMap((s) => s.slots.filter((x) => x.free).map((x) => x.id));
    if (free.length > 0 && refined) load(free);
  }, [sections, refined, load]);

  useEffect(() => {
    if (unlocked) reset();
  }, [unlocked, reset]);

  const briefText = (slotId: string): string | null => {
    const value = texts[slotId];
    if (value && "text" in value) return value.text;
    return refined ? null : (initialTexts[view]?.[slotId] ?? null);
  };

  const current = PAIR_VIEWS.find((v) => v.id === view) ?? PAIR_VIEWS[0];

  return (
    <div className="w-full">
      <header>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(28px, 2.8vw, 48px)", lineHeight: 1.08 }}>
          Совместимость {formatBirthDate(isoDates[0])} и {formatBirthDate(isoDates[1])}
        </h1>
        <p className="mt-3 text-text-secondary" style={{ fontSize: "clamp(15px, 1.2vw, 19px)", lineHeight: 1.55 }}>
          Три взгляда на одну пару: матрица судьбы, синастрия по натальным картам и композит по дизайну человека. Даты
          вводить заново не нужно — они в адресе страницы
        </p>
      </header>

      <div className="mt-6 flex flex-wrap" style={{ gap: 8 }} role="tablist" aria-label="Взгляд на пару">
        {PAIR_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === view}
            onClick={() => choose(v.id)}
            className="qc-focus rounded-[12px] border px-5 text-[15px] transition-colors"
            style={{
              height: 44,
              borderColor: v.id === view ? "var(--text-accent)" : "var(--border)",
              color: v.id === view ? "var(--text-primary)" : "var(--text-secondary)",
              background: v.id === view ? "rgba(122, 93, 168, 0.12)" : "transparent",
            }}
          >
            {v.tab}
          </button>
        ))}
      </div>

      <p className="mt-4 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}>
        {current.lead}
      </p>

      <PairPeople people={people} loading={loading} onRefine={onRefine} view={view} peopleLeft={peopleLeft} loggedIn={loggedIn} />

      {view === "matrix" && (
        <section className="mt-8">
          <Brief title="Что вас связывает" text={briefText("pair_brief_matrix")} busy={busy.has("pair_brief_matrix")} />
          {/* Матричный разбор приносит собственный контейнер с отступами,
              поэтому выводим его из нашего — иначе поля складываются и на
              телефоне страница уезжает вбок. */}
          <div className="mt-8 -mx-[4vw] md:mx-0">
            <ReadingView {...matrixReading} />
          </div>
        </section>
      )}

      {view === "synastry" && synastry && (
        <section className="mt-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <SynastryWheel synastry={synastry} className="mx-auto w-full max-w-[520px]" />
            <div>
              <Brief
                title={sections[0]?.slots[0]?.label ?? "Что вас связывает"}
                text={briefText("syn_brief")}
                busy={busy.has("syn_brief")}
              />
              <p className="mt-5 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
                Аспектов между картами: {synastry.aspects.length}
                {synastry.unknown.houses
                  ? ". Домов нет: для них нужны время и место рождения обоих"
                  : `. Наложений домов: ${synastry.overlays.length}`}
              </p>
            </div>
          </div>
          <LockedSections
            sections={sections}
            texts={texts}
            busy={busy}
            unlocked={unlocked}
            onPaywall={() => setPaywall(true)}
            load={load}
          />
        </section>
      )}

      {view === "composite" && composite && (
        <section className="mt-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <Bodygraph
              chart={{
                gates: [...composite.first.gates, ...composite.second.gates],
                definedCenters: composite.definedCenters,
                channels: composite.channels.map((c) => c.channel),
              }}
              className="mx-auto w-full max-w-[320px]"
            />
            <div>
              <Brief
                title={`${composite.first.type.name} и ${composite.second.type.name}`}
                text={briefText("hdc_brief")}
                busy={busy.has("hdc_brief")}
              />
              <div className="mt-5">
                <ConnectionSummary composite={composite} />
              </div>
              <div className="mt-5 text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Центры пары
              </div>
              <div className="mt-3">
                <CompositeCenters composite={composite} />
              </div>
            </div>
          </div>
          <LockedSections
            sections={sections}
            texts={texts}
            busy={busy}
            unlocked={unlocked}
            onPaywall={() => setPaywall(true)}
            load={load}
          />
        </section>
      )}

      <Paywall
        open={paywall}
        onClose={() => setPaywall(false)}
        date={isoDates[0]}
        freeCount={1}
        totalCount={sections.reduce((n, s) => n + s.slots.length, 0)}
        reason={reason ?? undefined}
      />
    </div>
  );
}

/** Бесплатный абзац о главном. */
function Brief({ title, text, busy }: { title: string; text: string | null; busy: boolean }) {
  return (
    <div className="rounded-[16px] border border-border bg-surface-1" style={{ padding: "18px 20px" }}>
      <h2 className="font-display text-text-primary" style={{ fontSize: "clamp(19px, 1.5vw, 24px)", lineHeight: 1.2 }}>
        {title}
      </h2>
      {busy ? (
        <p className="mt-3 text-text-secondary" style={{ fontSize: 15 }}>
          Пишем разбор…
        </p>
      ) : text ? (
        <div className="mt-3 flex flex-col" style={{ gap: 12 }}>
          {text.split("\n\n").map((p, i) => (
            <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
              {p}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
          Схема пары посчитана. Текст этого абзаца готовится
        </p>
      )}
      <p className="mt-3 text-text-accent" style={{ fontSize: 13 }}>
        бесплатно
      </p>
    </div>
  );
}

/** Разделы разбора: всё, кроме главного абзаца, — по подписке. */
function LockedSections({
  sections,
  texts,
  busy,
  unlocked,
  onPaywall,
  load,
}: {
  sections: PairSection[];
  texts: Record<string, SlotText | { locked: true }>;
  busy: Set<string>;
  unlocked: boolean;
  onPaywall: () => void;
  load: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const paid = sections.filter((s) => s.slots.some((x) => !x.free));

  return (
    <div className="mt-10 flex flex-col" style={{ gap: 28 }}>
      {paid.map((section) => (
        <section key={section.id}>
          <h3 className="font-display text-text-primary" style={{ fontSize: "clamp(20px, 1.6vw, 28px)", lineHeight: 1.15 }}>
            {section.title}
          </h3>
          <p className="mt-1.5 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.55 }}>
            {section.lead}
          </p>
          <div className="mt-4 flex flex-col" style={{ gap: 10 }}>
            {section.slots
              .filter((slot) => !slot.free)
              .map((slot) => {
                const value = texts[slot.id];
                const locked = value && "locked" in value;
                const isOpen = open === slot.id;
                return (
                  <div key={slot.id} className="rounded-[14px] border border-border bg-surface-1" style={{ padding: "16px 18px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = isOpen ? null : slot.id;
                        setOpen(next);
                        if (next) load([slot.id]);
                        if (next && value && "locked" in value) onPaywall();
                      }}
                      className="flex w-full items-center justify-between gap-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.4 }}>
                        {slot.label}
                        {slot.hint && (
                          <span className="ml-2 text-text-secondary" style={{ fontSize: 13 }}>
                            · {slot.hint}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-text-accent" style={{ fontSize: 13 }}>
                        {locked ? "замок" : isOpen ? "свернуть" : unlocked ? "открыть" : "открыть"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-3">
                        {busy.has(slot.id) ? (
                          <p className="text-text-secondary" style={{ fontSize: 15 }}>
                            Пишем разбор…
                          </p>
                        ) : locked ? (
                          <p className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                            Этот вопрос открывается по подписке.{" "}
                            <button type="button" onClick={onPaywall} className="text-text-accent underline-offset-4 hover:underline">
                              Что входит
                            </button>
                          </p>
                        ) : value && "text" in value ? (
                          <div className="flex flex-col" style={{ gap: 12 }}>
                            {value.text.split("\n\n").map((p, i) => (
                              <p key={i} className="text-text-primary" style={{ fontSize: "clamp(15px, 1.15vw, 17px)", lineHeight: 1.7 }}>
                                {p}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-text-secondary" style={{ fontSize: 15 }}>
                            Не удалось загрузить текст. Попробуйте ещё раз
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Двое: что известно про каждого и чего не хватает для полного расчёта. */
function PairPeople({
  people,
  loading,
  onRefine,
  view,
  peopleLeft,
  loggedIn,
}: {
  people: [BirthValue, BirthValue];
  loading: boolean;
  onRefine: (who: 0 | 1, next: BirthValue) => void;
  view: PairViewId;
  peopleLeft: number | null | undefined;
  loggedIn: boolean;
}) {
  if (view === "matrix") {
    return (
      <p className="mt-5 text-text-secondary" style={{ fontSize: 14, lineHeight: 1.55 }}>
        Матрица считается полностью по двум датам: время и место здесь ничего не добавляют
      </p>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      {people.map((person, index) => (
        <PairPerson
          key={index}
          who={index as 0 | 1}
          person={person}
          view={view}
          loading={loading}
          onRefine={onRefine}
          canSave={index === 1 && loggedIn && (peopleLeft === null || (peopleLeft ?? 0) > 0)}
        />
      ))}
    </div>
  );
}
