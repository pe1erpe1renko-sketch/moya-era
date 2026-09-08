"use client";

import { useState, type KeyboardEvent } from "react";
const cardBack = "/images/card-back.jpg";
const face1 = "/images/step-1.jpg";
const face2 = "/images/step-2.jpg";
const face3 = "/images/step-3.jpg";
import { Section } from "./Section";
import { useReducedMotion } from "@/hooks/use-reduced-motion";


const STEPS = [
  {
    numeral: "I",
    title: "ТОЧКА",
    face: face1,
    flips: false,
    tilt: -2.5,
    text: "Вы вводите дату, время и место рождения",
  },
  {
    numeral: "II",
    title: "РАСЧЁТ",
    face: face2,
    flips: true,
    tilt: 0,
    text: "Шесть систем считают вас независимо друг от друга",
  },
  {
    numeral: "III",
    title: "РАЗБОР",
    face: face3,
    flips: true,
    tilt: 2.5,
    text: "Вы получаете один текст, в котором они сходятся",
  },
];

const FACE_GRADIENT =
  "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 46%, rgba(0,0,0,0.82) 72%, rgba(0,0,0,0.95) 100%)";

function TarotCard({ step }: { step: (typeof STEPS)[number] }) {
  const [pinned, setPinned] = useState(false);

  const toggle = () => {
    if (!step.flips) return;
    setPinned((p) => !p);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!step.flips) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const classes = [
    "tarot-hit",
    step.flips ? "is-interactive" : "",
    !step.flips || pinned ? "is-flipped" : "",
    pinned ? "is-pinned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ ["--tilt" as string]: `${step.tilt}deg` }}
      role={step.flips ? "button" : undefined}
      tabIndex={step.flips ? 0 : undefined}
      aria-expanded={step.flips ? pinned : undefined}
      aria-label={step.flips ? `${step.title}: ${step.text}` : undefined}
      onClick={toggle}
      onKeyDown={onKeyDown}
    >
      <div className="tarot-tilt">
        <div className="tarot-flip">

        {/* Back */}
        <div className="tarot-side tarot-back">
          <img
            src={cardBack}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            className="pointer-events-none absolute rounded-[8px]"
            style={{
              inset: 10,
              border: "1px solid color-mix(in srgb, var(--border) 40%, transparent)",
            }}
          />
        </div>

        {/* Face */}
        <div className="tarot-side tarot-face">
          <img
            src={step.face}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            className="pointer-events-none absolute inset-0"
            style={{ background: FACE_GRADIENT }}
          />
          <span
            className="pointer-events-none absolute rounded-[8px]"
            style={{
              inset: 10,
              border:
                "1px solid color-mix(in srgb, var(--text-accent) 45%, transparent)",
            }}
          />

          <div className="relative flex h-full flex-col items-center justify-between">
            <span
              className="font-display text-text-accent"
              style={{
                marginTop: 26,
                fontSize: "clamp(20px, 1.6vw, 28px)",
                letterSpacing: "0.14em",
              }}
            >
              {step.numeral}
            </span>

            <div
              className="flex w-full flex-col items-center"
              style={{ paddingBottom: 26, paddingLeft: 22, paddingRight: 22 }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "block",
                  width: 40,
                  height: 1,
                  marginBottom: 12,
                  background: "var(--text-accent)",
                  opacity: 0.5,
                }}
              />
              <h3
                className="text-center font-display text-text-primary"
                style={{
                  fontSize: "clamp(20px, 1.7vw, 30px)",
                  fontWeight: 400,
                  letterSpacing: "0.1em",
                }}
              >
                {step.title}
              </h3>
              <p
                className="text-center text-text-secondary"
                style={{ marginTop: 10, fontSize: "clamp(13px, 0.95vw, 15px)" }}
              >
                {step.text}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

  );
}

export function HowItWorks() {
  const reducedMotion = useReducedMotion();

  const scrollToDirections = () => {
    const section = document.getElementById("directions");
    if (!section) return;
    const title = section.querySelector("h2") as HTMLHeadingElement | null;
    section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    if (title) {
      title.setAttribute("tabIndex", "-1");
      title.focus({ preventScroll: true });
    }
  };


  return (
    <Section
      id="how"
      title="Три шага"
      subtitle="Как устроен путь от даты рождения до разбора"
      className="how-gradient"
    >
      <div
        className="mt-12 flex flex-col items-center justify-center md:flex-row md:items-start"
        style={{ gap: "clamp(24px, 3vw, 56px)" }}
      >
        {STEPS.map((s) => (
          <TarotCard key={s.title} step={s} />
        ))}
      </div>

      <div className="mt-10 flex w-full justify-center md:mt-14">
        <button
          type="button"
          onClick={scrollToDirections}
          className="inline-flex w-[70vw] items-center justify-center rounded-[12px] border border-[color-mix(in_srgb,var(--text-accent)_50%,transparent)] bg-transparent px-9 text-[--text-accent] transition-all duration-300 hover:border-[color-mix(in_srgb,var(--text-accent)_100%,transparent)] hover:bg-[rgba(122,93,168,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--text-accent] focus-visible:outline-offset-[3px] md:w-auto"
          style={{
            height: 52,
            fontSize: "clamp(15px, 1.1vw, 18px)",
          }}
        >
          Какие шесть систем?
        </button>
      </div>

    </Section>
  );
}

