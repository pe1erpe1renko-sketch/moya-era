"use client";

import { FullReadingButton } from "@/components/direction/FullReadingButton";
import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/landing/Section";

export function DirectionSample({
  title,
  subtitle,
  paragraphs,
  footer,
}: {
  title: string;
  subtitle: string;
  paragraphs: string[];
  footer: string;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [clipH, setClipH] = useState<number | null>(null);

  // Гарантирует обрыв: если текст короче контейнера, контейнер сжимается так,
  // чтобы последние строки ушли под градиент. Если текст длиннее — обрезка
  // работает за счёт фиксированной высоты и overflow: hidden.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => {
      const spec = Math.min(Math.max(360, window.innerHeight * 0.42), 520);
      const content = el.scrollHeight;
      setClipH(content > spec ? spec : Math.max(220, content - 100));
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [paragraphs]);

  return (
    <Section
      id="sample"
      title={title}
      className="!pt-[clamp(80px,9vh,140px)] !pb-[clamp(80px,9vh,140px)]"
    >
      <div className="mx-auto mt-14 w-full max-w-[860px]">
        <p
          className="text-center text-text-secondary"
          style={{ fontSize: "clamp(15px, 1.2vw, 19px)" }}
        >
          {subtitle}
        </p>

        <div
          className="relative mt-9 overflow-hidden"
          style={{ height: clipH ?? "clamp(360px, 42vh, 520px)" }}
        >
          <div
            ref={innerRef}
            className="flex flex-col text-text-primary"
            style={{
              fontSize: "clamp(16px, 1.25vw, 20px)",
              lineHeight: 1.75,
              gap: 18,
            }}
          >
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1]"
            style={{
              height: clipH ? Math.min(180, Math.round(clipH * 0.45)) : 180,
              background: "linear-gradient(to bottom, rgba(3,25,30,0), var(--bg-page))",
            }}
          />
        </div>

        <p
          className="text-center text-text-secondary"
          style={{ marginTop: 8, fontSize: "clamp(15px, 1.15vw, 18px)" }}
        >
          {footer}
        </p>

        <div className="mt-5 flex justify-center">
          <FullReadingButton style={{ height: 54, paddingInline: 40 }} />
        </div>
      </div>
    </Section>
  );
}
