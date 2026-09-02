"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { directions, type Direction } from "@/lib/directions";
import { Section } from "./Section";
const avatar1 = "/images/avatar-1.jpg";
const avatar2 = "/images/avatar-2.jpg";
const avatar3 = "/images/avatar-3.jpg";
const avatar4 = "/images/avatar-4.jpg";
const avatar5 = "/images/avatar-5.jpg";
const avatar6 = "/images/avatar-6.jpg";

const REVIEWS = [
  {
    name: "Анна К.",
    topic: "Матрица судьбы",
    avatar: avatar1,
    text: "Понравилось, что видно, откуда взялось каждое число. Это не «поверь мне», это можно проверить самой",
  },
  {
    name: "Дарья М.",
    topic: "Совместимость",
    avatar: avatar2,
    text: "Считали с мужем. Читали разбор вслух и половину вечера обсуждали — давно так не разговаривали",
  },
  {
    name: "Ольга В.",
    topic: "Натальная карта",
    avatar: avatar3,
    text: "Веду дневник третью неделю. Интереснее всего сравнивать, что совпадает, а что нет",
  },
  {
    name: "Марина Т.",
    topic: "Дизайн человека",
    avatar: avatar4,
    text: "Оказалось, я не ленивая, а просто работаю рывками. Перестала себя за это грызть",
  },
  {
    name: "Евгения Р.",
    topic: "Нумерология",
    avatar: avatar5,
    text: "Отнеслась скептически, если честно. Но описание оказалось точнее, чем я ожидала",
  },
  {
    name: "Кирилл Д.",
    topic: "Таро",
    avatar: avatar6,
    text: "Задаю вопрос вечером, когда не могу решиться. Помогает не предсказанием, а тем, что приходится сформулировать проблему",
  },
];

type ReviewsProps = { directionId?: Direction["id"] };

export function Reviews({ directionId }: ReviewsProps = {}) {
  const ordered = useMemo(() => {
    if (!directionId) return REVIEWS;
    const topic = directions.find((d) => d.id === directionId)?.title;
    if (!topic) return REVIEWS;
    const first = REVIEWS.filter((r) => r.topic === topic);
    const rest = REVIEWS.filter((r) => r.topic !== topic);
    return [...first, ...rest];
  }, [directionId]);

  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(2);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const total = el.scrollWidth;
    const view = el.clientWidth;
    const count = Math.max(1, Math.round(total / view));
    setPages(count);
    const max = total - view;
    const ratio = max > 0 ? el.scrollLeft / max : 0;
    setPage(Math.round(ratio * (count - 1)));
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const goToPage = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = pages > 1 ? (max * i) / (pages - 1) : 0;
    el.scrollTo({ left, behavior: "smooth" });
  };

  const atStart = page <= 0;
  const atEnd = page >= pages - 1;

  return (
    <Section title="Что говорят">
      <div
        ref={trackRef}
        tabIndex={0}
        className="reviews-track mx-auto mt-12 w-full max-w-[1240px]"
      >
        {ordered.map((r) => (
          <figure
            key={r.name}
            className="group relative aspect-square rounded-[20px] border border-border bg-surface-1 transition duration-300 hover:border-text-accent/50 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
            style={{ padding: "clamp(24px, 2.2vw, 36px)", scrollSnapAlign: "start" }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-5 font-display text-text-accent"
              style={{ fontSize: "clamp(48px, 4.5vw, 84px)", opacity: 0.18, lineHeight: 1 }}
            >
              «
            </span>

            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center">
                <img
                  src={r.avatar}
                  alt={r.name}
                  loading="lazy"
                  width={96}
                  height={96}
                  className="h-16 w-16 shrink-0 rounded-full border border-border object-cover md:h-[clamp(64px,6vw,96px)] md:w-[clamp(64px,6vw,96px)]"
                />
                <div className="ml-4">
                  <div className="text-text-primary" style={{ fontSize: "clamp(15px, 1.2vw, 19px)" }}>
                    {r.name}
                  </div>
                  <div
                    className="mt-[3px] text-text-secondary"
                    style={{ fontSize: "clamp(12px, 0.95vw, 14px)" }}
                  >
                    {r.topic}
                  </div>
                </div>
              </div>

              <blockquote
                className="text-text-secondary"
                style={{ fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.55 }}
              >
                {r.text}
              </blockquote>
            </div>
          </figure>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label="Предыдущие отзывы"
          onClick={() => scrollByPage(-1)}
          disabled={atStart}
          className="reviews-arrow hidden md:flex"
        >
          ←
        </button>

        <div className="flex items-center gap-5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Страница ${i + 1}`}
              aria-current={i === page}
              onClick={() => goToPage(i)}
              className="reviews-dot"
              data-active={i === page}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Следующие отзывы"
          onClick={() => scrollByPage(1)}
          disabled={atEnd}
          className="reviews-arrow hidden md:flex"
        >
          →
        </button>
      </div>
    </Section>
  );
}
