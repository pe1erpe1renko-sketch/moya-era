"use client";

import { useEffect, useMemo, useState } from "react";
import { buildNatalChart, pointName, ASPECTS } from "@/lib/natal";
import { buildHumanDesignChart, type CenterId } from "@/lib/humandesign";
import {
  DEFAULT_VIEW,
  HOW_TO_READ,
  PAIR_VIEWS,
  buildComposite,
  buildSynastry,
  compositeSections,
  compositeSummary,
  synastrySections,
  synastrySummary,
  viewByAnchor,
  type PairSection,
  type PairViewId,
} from "@/lib/pair";
import type { PairMatrix } from "@/lib/matrix/matrixEngine";
import { arcanaName, arcanaPairLine, formatDateLong } from "@/lib/matrix";
import { pairShowcase } from "@/lib/nextSteps";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { Bodygraph } from "@/components/humandesign/Bodygraph";
import { NextSteps } from "@/components/next/NextSteps";
import { Paywall } from "@/components/reading/Paywall";
import { ReadingView } from "@/components/reading/ReadingView";
import { formatBirthDate } from "@/lib/pendingBirth";
import type { BirthValue } from "@/components/natal/BirthForm";
import { CenterExplain, CompositeCenters, ConnectionSummary } from "./CompositeCenters";
import { PairPerson } from "./PairPerson";
import { SynastryWheel } from "./SynastryWheel";
import { ThemedSections } from "./ThemedSections";
import { usePairTexts } from "./usePairTexts";

/**
 * СТРАНИЦА ПАРЫ — /sovmestimost/13-07-1998/09-04-1992
 *
 * Один расчёт, три взгляда: совместимость по матрице, синастрия и
 * композит. Вкладки закреплены наверху при прокрутке; переключение — на
 * месте, без перезагрузки и без повторного ввода дат; выбранный взгляд
 * отражается якорем адреса.
 *
 * ПЕРВЫЙ ЭКРАН — РЕЗУЛЬТАТ, а не объяснение, как он получен. На матрице
 * это аркан пары крупно, с иллюстрацией и одной строкой о том, кто эти
 * двое друг для друга. На синастрии и композите — схема и сводка из пяти
 * предложений, выведенная из уже посчитанных чисел (без нейросети).
 * Служебные тексты («как это считается», «как это читать») свёрнуты.
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
  const [center, setCenter] = useState<CenterId | null>(null);

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

  const showcase = useMemo(() => pairShowcase({ system: view, slug: "sovmestimost", dates: isoDates }), [view, isoDates]);
  const pairArcana = (matrixReading.matrix as PairMatrix).core.C;

  const locked = {
    texts,
    busy,
    unlocked,
    onPaywall: () => setPaywall(true),
    load,
  };

  return (
    <div className="w-full">
      <header>
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.4vw, 40px)", lineHeight: 1.1 }}>
          Совместимость {formatBirthDate(isoDates[0])} и {formatBirthDate(isoDates[1])}
        </h1>
      </header>

      <div className="pair-tabs mt-5" role="tablist" aria-label="Взгляд на пару">
        {PAIR_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === view}
            onClick={() => choose(v.id)}
            className="qc-focus pair-tab"
          >
            {v.tab}
          </button>
        ))}
      </div>

      {view === "matrix" && (
        <section className="mt-8" aria-labelledby="pair-result">
          <div className="pair-hero">
            <ArcanaImage n={pairArcana} width="clamp(180px, 22vw, 260px)" rounded={16} priority className="pair-hero-art" />
            <div className="min-w-0">
              <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">Аркан пары · {pairArcana}</div>
              <h2 id="pair-result" className="mt-2 font-display text-text-primary" style={{ fontSize: "clamp(34px, 4.2vw, 60px)", lineHeight: 1.04 }}>
                {arcanaName(pairArcana)}
              </h2>
              <p className="mt-3 text-text-primary" style={{ fontSize: "clamp(17px, 1.4vw, 22px)", lineHeight: 1.5 }}>
                {arcanaPairLine(pairArcana)}
              </p>
              <details className="pair-how mt-4">
                <summary>Как это считается</summary>
                <p className="mt-3 text-text-secondary" style={{ fontSize: 15, lineHeight: 1.65 }}>
                  Матрица пары строится сложением двух личных матриц: {formatDateLong(isoDates[0])} и {formatDateLong(isoDates[1])}.
                  Время и место рождения здесь ничего не добавляют — матрица считается только по датам. Синастрия и композит на
                  соседних вкладках считаются иначе: по натальным картам и бодиграфам, и им время и место нужны.
                </p>
              </details>
            </div>
          </div>

          <div className="mt-8">
            <Brief title="Что вас связывает" text={briefText("pair_brief_matrix")} busy={busy.has("pair_brief_matrix")} />
          </div>

          {/* Матричный разбор приносит собственный контейнер с отступами,
              поэтому выводим его из нашего — иначе поля складываются и на
              телефоне страница уезжает вбок. */}
          <div className="mt-8 -mx-[4vw] md:mx-0">
            <ReadingView {...matrixReading} embedded />
          </div>
        </section>
      )}

      {view === "synastry" && synastry && (
        <section className="mt-8" aria-labelledby="pair-result">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
            <SynastryWheel synastry={synastry} className="mx-auto w-full max-w-[460px]" />
            <div className="min-w-0">
              <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">Синастрия</div>
              <h2 id="pair-result" className="mt-2 font-display text-text-primary" style={{ fontSize: "clamp(28px, 3vw, 44px)", lineHeight: 1.08 }}>
                {synastry.leading
                  ? `${pointName(synastry.leading.a)} первого и ${pointName(synastry.leading.b)} второго: ${ASPECTS[synastry.leading.aspect.key].name.toLowerCase()}`
                  : "Две карты рядом"}
              </h2>
              <Summary sentences={synastrySummary(synastry)} />
              <HowToRead paragraphs={HOW_TO_READ.synastry} />
            </div>
          </div>

          <PairPeople people={people} loading={loading} onRefine={onRefine} view={view} peopleLeft={peopleLeft} loggedIn={loggedIn} />

          <div className="mt-8">
            <Brief
              title={sections[0]?.slots[0]?.label ?? "Что вас связывает"}
              text={briefText("syn_brief")}
              busy={busy.has("syn_brief")}
            />
          </div>

          <ThemedSections
            title="Аспекты и дома по темам"
            lead="Планета одного и планета другого, а при известном времени рождения — и дома. Каждая связь разбирается отдельно; полный разбор открывает подписка."
            sections={sections}
            {...locked}
          />
        </section>
      )}

      {view === "composite" && composite && (
        <section className="mt-8" aria-labelledby="pair-result">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
            <div className="min-w-0">
              <Bodygraph
                chart={{
                  gates: [...composite.first.gates, ...composite.second.gates],
                  definedCenters: composite.definedCenters,
                  channels: composite.channels.map((c) => c.channel),
                }}
                active={center ? `center:${center}` : null}
                onSelect={(id) => setCenter(id.replace("center:", "") as CenterId)}
                className="mx-auto w-full max-w-[230px] lg:max-w-[300px]"
              />
              <p className="mt-3 text-text-secondary" style={{ fontSize: 13, lineHeight: 1.55 }}>
                Бодиграф пары: два человека на одной схеме. Закрашенные центры определены вдвоём, пустые открыты у обоих,
                горящие линии — каналы пары. Нажмите на центр — увидите, откуда он взялся и о чём он.
              </p>
              {center && (
                <div className="mt-4">
                  <CenterExplain composite={composite} id={center} onClose={() => setCenter(null)} />
                </div>
              )}
              <div className="mt-4">
                <CompositeCenters composite={composite} active={center} onSelect={setCenter} />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] uppercase tracking-[0.1em] text-text-accent">Композит</div>
              <h2 id="pair-result" className="mt-2 font-display text-text-primary" style={{ fontSize: "clamp(28px, 3vw, 44px)", lineHeight: 1.08 }}>
                {composite.first.type.name} и {composite.second.type.name}
              </h2>
              <Summary sentences={compositeSummary(composite)} />
              <div className="mt-5">
                <ConnectionSummary composite={composite} />
              </div>
              <HowToRead paragraphs={HOW_TO_READ.composite} />
            </div>
          </div>

          <PairPeople people={people} loading={loading} onRefine={onRefine} view={view} peopleLeft={peopleLeft} loggedIn={loggedIn} />

          <div className="mt-8">
            <Brief
              title={`${composite.first.type.name} и ${composite.second.type.name}`}
              text={briefText("hdc_brief")}
              busy={busy.has("hdc_brief")}
            />
          </div>

          <ThemedSections
            title="Каналы по темам"
            lead="Каждый горящий канал пары — отдельный вид связи. Электромагнитные существуют только вдвоём: это и притяжение, и трение. Полный разбор открывает подписка."
            sections={sections}
            {...locked}
          />
        </section>
      )}

      <NextSteps showcase={showcase} />

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

/** Сводка из пяти предложений, выведенных из чисел расчёта. */
function Summary({ sentences }: { sentences: string[] }) {
  return (
    <p className="mt-4 text-text-primary" style={{ fontSize: "clamp(16px, 1.25vw, 19px)", lineHeight: 1.6 }}>
      {sentences.join(" ")}
    </p>
  );
}

/** «Как это читать» — три абзаца, свёрнуты по умолчанию. */
function HowToRead({ paragraphs }: { paragraphs: string[] }) {
  return (
    <details className="pair-how mt-5">
      <summary>Как это читать</summary>
      <div className="mt-3 flex flex-col" style={{ gap: 12 }}>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-text-secondary" style={{ fontSize: 15, lineHeight: 1.65 }}>
            {p}
          </p>
        ))}
      </div>
    </details>
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
  return (
    <div id="lyudi" className="mt-8 grid scroll-mt-32 grid-cols-1 gap-4 md:grid-cols-2">
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
