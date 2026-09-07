"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { MentorFab } from "@/components/chat/MentorFab";
import { OtherDirections } from "@/components/landing/OtherDirections";
import { directions, type Direction } from "@/lib/directions";
import { directionLines } from "@/lib/directionLines";
import { arcana, centralArcanum } from "@/lib/arcana";
import { ArcanaImage } from "@/components/arcana/ArcanaImage";
import { lifePath, lifePathNumber } from "@/lib/numerology";
import { sunSign } from "@/lib/natal";
import { dayCardArcanum, moscowDay } from "@/lib/tarot";
import { backend } from "@/lib/backend";
import { useAuth } from "@/lib/useAuth";
import { NatalReading } from "@/components/natal/NatalReading";
import { HdReading } from "@/components/humandesign/HdReading";
import { placeFromFields } from "@/lib/geo/birthPlace";


type Profile = {
  id: string;
  name: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_place_id: number | null;
  birth_lat: number | null;
  birth_lon: number | null;
  birth_tz: string | null;
};

function parseDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { day: d, month: m, year: y };
}

type Head =
  | { kind: "value"; number: string | null; name: string; arcanum?: number }
  | { kind: "note"; note: string };

const pad = (n: number) => String(n).padStart(2, "0");
const birthIso = (b: { day: number; month: number; year: number }) => `${b.year}-${pad(b.month)}-${pad(b.day)}`;

function buildReading(
  id: Direction["id"],
  birth: { day: number; month: number; year: number },
): { head: Head; openText: string | null } {
  if (id === "matrix") {
    const n = centralArcanum(birth.day, birth.month, birth.year);
    const card = arcana.find((a) => a.n === n);
    return {
      head: { kind: "value", number: String(n), name: card?.name ?? "", arcanum: n },
      openText: card?.detail ?? null,
    };
  }
  if (id === "numerology") {
    const n = lifePathNumber(birth.day, birth.month, birth.year);
    const item = lifePath.find((l) => l.n === n);
    return {
      head: { kind: "value", number: String(n), name: item?.title ?? "" },
      openText: item?.detail ?? null,
    };
  }
  if (id === "natal") {
    // Натальная карта считается по-настоящему и рисуется отдельным блоком.
    const { sign } = sunSign(birth.day, birth.month);
    return { head: { kind: "value", number: null, name: sign.name }, openText: null };
  }
  if (id === "tarot") {
    // Та же карта, что на /taro/26-07-1990: та же дата рождения, те же
    // московские сутки. Иначе человек видел бы в кабинете одну карту, а
    // на странице другую и справедливо решил бы, что мы гадаем наугад.
    const n = dayCardArcanum(birthIso(birth), moscowDay());
    const card = arcana.find((a) => a.n === n);
    return {
      head: { kind: "value", number: String(n), name: card?.name ?? "", arcanum: n },
      openText: card?.draw ?? null,
    };
  }
  if (id === "synastry") {
    return {
      head: {
        kind: "note",
        note: "Аркан пары считается по двум датам рождения. Второй профиль пока не добавлен",
      },
      openText: null,
    };
  }
  return {
    head: {
      kind: "note",
      note: "Бодиграф считается по двум картам и требует точного времени рождения",
    },
    openText: null,
  };
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: "var(--text-secondary)", opacity: 0.5, flexShrink: 0 }}
    >
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function ReadingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const direction = directions.find((d) => d.id === id)!;
  const lines = directionLines[direction.id];

  useEffect(() => {
    if (!user) return;
    let alive = true;
    backend.profiles.getOwner(user.id).then(({ data }) => {
      if (!alive) return;
      setProfile(data ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const birth = parseDate(profile?.birth_date ?? null);
  const chartBirth =
    (direction.id === "natal" || direction.id === "humandesign") && profile?.birth_date
      ? {
          date: profile.birth_date,
          time: profile.birth_time?.slice(0, 5) ?? null,
          place: placeFromFields(profile),
          placeText: profile.birth_place ?? "",
        }
      : null;
  const natalBirth = direction.id === "natal" ? chartBirth : null;
  const hdBirth = direction.id === "humandesign" ? chartBirth : null;

  const reading = useMemo(
    () => (birth ? buildReading(direction.id, birth) : null),
    [direction.id, birth?.day, birth?.month, birth?.year, user?.id],
  );

  const openSection = reading?.openText ? lines[0] : null;
  const lockedSections = openSection ? lines.slice(1) : lines;

  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[110px] w-full">
        <Header />
      </div>

      <div
        className="mx-auto w-full max-w-[860px] px-[clamp(20px,5vw,40px)]"
        style={{
          paddingTop: "clamp(60px, 8vh, 110px)",
          paddingBottom: "clamp(60px, 8vh, 110px)",
        }}
      >
        <Link
          href="/cabinet"
          className="inline-block text-text-accent hover:opacity-80"
          style={{ fontSize: 14 }}
        >
          ← Все направления
        </Link>

        {!loading && !birth ? (
          <div className="mt-8">
            <h1
              className="font-display text-text-primary"
              style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}
            >
              {direction.title}
            </h1>
            <p
              className="mt-4 text-text-secondary"
              style={{ fontSize: "clamp(15px, 1.2vw, 18px)" }}
            >
              Заполни дату рождения в профиле
            </p>
            <Link
              href="/cabinet"
              className="mt-4 inline-block text-text-accent hover:opacity-80"
              style={{ fontSize: 15 }}
            >
              Перейти в кабинет
            </Link>
          </div>
        ) : (
          <>
            <h1
              className="mt-8 font-display text-text-primary"
              style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}
            >
              {direction.title}
            </h1>

            {reading && reading.head.kind === "value" ? (
              <div className="flex items-center gap-4" style={{ marginTop: 14 }}>
                {reading.head.arcanum && <ArcanaImage n={reading.head.arcanum} width={72} rounded={10} />}
                {reading.head.number && (
                  <span
                    className="text-text-accent"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(36px, 3.2vw, 56px)",
                      lineHeight: 1,
                    }}
                  >
                    {reading.head.number}
                  </span>
                )}
                <span
                  className="font-display text-text-primary"
                  style={{ fontSize: "clamp(22px, 1.9vw, 32px)", lineHeight: 1.15 }}
                >
                  {reading.head.name}
                </span>
              </div>
            ) : (
              <p
                className="text-text-secondary"
                style={{ marginTop: 14, fontSize: "clamp(15px, 1.2vw, 18px)", lineHeight: 1.6 }}
              >
                {reading?.head.kind === "note" ? reading.head.note : "…"}
              </p>
            )}

            {natalBirth && (
              <div className="mt-8">
                <NatalReading birth={natalBirth} />
              </div>
            )}

            {hdBirth && (
              <div className="mt-8">
                <HdReading birth={hdBirth} />
              </div>
            )}

            {openSection && (
              <section>
                <h2
                  className="font-display text-text-primary"
                  style={{ marginTop: 44, fontSize: "clamp(22px, 1.8vw, 30px)", lineHeight: 1.2 }}
                >
                  {openSection.title}
                </h2>
                <p
                  className="text-text-primary"
                  style={{
                    marginTop: 16,
                    fontSize: "clamp(16px, 1.25vw, 20px)",
                    lineHeight: 1.7,
                  }}
                >
                  {reading?.openText}
                </p>
              </section>
            )}

            <div className="flex flex-col" style={{ marginTop: 32, gap: 14 }}>
              {(chartBirth ? [] : lockedSections).map((l) => (
                <div
                  key={l.n}
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3
                      className="font-display text-text-primary"
                      style={{
                        fontSize: "clamp(18px, 1.4vw, 24px)",
                        lineHeight: 1.2,
                        opacity: 0.7,
                      }}
                    >
                      {l.title}
                    </h3>
                    <LockIcon />
                  </div>
                  <p
                    className="text-text-secondary"
                    style={{
                      marginTop: 10,
                      fontSize: "clamp(14px, 1.05vw, 16px)",
                      lineHeight: 1.6,
                      opacity: 0.6,
                    }}
                  >
                    {l.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Блок перехода к оплате */}
            <div
              style={{
                marginTop: 44,
                background: "var(--surface-1)",
                border: "1px solid var(--text-accent)",
                borderRadius: 20,
                padding: "clamp(24px, 2.4vw, 40px)",
                boxShadow: "0 0 44px rgba(122, 93, 168, 0.18)",
              }}
            >
              <h2
                className="font-display text-text-primary"
                style={{ fontSize: "clamp(22px, 1.9vw, 32px)", lineHeight: 1.15 }}
              >
                Открыть разбор целиком
              </h2>
              <p
                className="text-text-secondary"
                style={{ marginTop: 12, fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.6 }}
              >
                {chartBirth
                  ? "Все позиции разбора — и полные разборы по остальным пяти системам"
                  : `Ещё ${numWord(lockedSections.length)} ${sectionWord(lockedSections.length)} по этому направлению и полные разборы по остальным пяти системам`}
              </p>
              <div className="flex items-baseline gap-3" style={{ marginTop: 20 }}>
                <span
                  className="text-text-primary"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(28px, 2.4vw, 40px)",
                    lineHeight: 1,
                  }}
                >
                  249 ₽
                </span>
                <span className="text-text-secondary" style={{ fontSize: 14 }}>
                  за три дня полного доступа
                </span>
              </div>
              <button
                type="button"
                onClick={() => {}}
                className="inline-flex h-[54px] items-center justify-center px-7 text-[16px] transition-opacity hover:opacity-90"
                style={{
                  marginTop: 20,
                  background: "var(--accent)",
                  color: "var(--accent-foreground, #12100e)",
                  borderRadius: 12,
                }}
              >
                Открыть пробный доступ
              </button>
              <p
                className="text-text-secondary"
                style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}
              >
                Через три дня — 690 ₽ в месяц, если не отменить
              </p>
            </div>
          </>
        )}
      </div>

      <OtherDirections currentId={direction.id} cabinetLinks />

      <Footer />
      <MentorFab />
    </main>
  );
}

const WORDS = ["ноль", "один", "два", "три", "четыре", "пять", "шесть"];

function numWord(n: number) {
  return WORDS[n] ?? String(n);
}

function sectionWord(n: number) {
  if (n === 1) return "раздел";
  if (n >= 2 && n <= 4) return "раздела";
  return "разделов";
}
