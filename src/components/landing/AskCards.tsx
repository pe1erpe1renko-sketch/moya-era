"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "./Section";
import { arcanaImage } from "@/lib/arcanaImage";
import { ASK_MAX, rememberAsk } from "@/lib/tarot/ask";

/**
 * «СПРОСИТЕ КАРТЫ» — блок на главной.
 *
 * Без цен: пример вопроса, одна фраза о том, что человек получит, и
 * кнопка на первый экран таро. Вопрос, если его начали писать здесь,
 * уезжает вместе с человеком: на /taro он уже стоит в поле.
 *
 * В стиле остальных блоков главной — заголовок по центру и одна
 * карточка, — а не баннер.
 */

const EXAMPLE = "Стоит ли мне менять работу этой осенью?";

/** Три карты веером — как на столе. */
const FAN = [17, 8, 1];

export function AskCards() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <Section
      id="ask"
      title="Спросите карты"
      subtitle="Свой вопрос своими словами — карты выпадут прямо сейчас, а трактовка будет написана под него"
    >
      <form
        className="mx-auto mt-12 w-full max-w-[880px]"
        onSubmit={(e) => {
          e.preventDefault();
          // Вопрос — личный текст: едет в черновик, а не в адрес страницы.
          rememberAsk({ q });
          router.push("/taro");
        }}
      >
        <div className="rounded-[20px] border border-border bg-surface-1 p-[22px] md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
            <div className="ask-fan" aria-hidden="true">
              {FAN.map((n, i) => (
                <img key={n} src={arcanaImage(n, "sm")} alt="" loading="lazy" decoding="async" style={{ ["--i" as string]: i }} />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="home-ask" className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Например
              </label>
              <input
                id="home-ask"
                value={q}
                onChange={(e) => setQ(e.target.value.slice(0, ASK_MAX))}
                placeholder={EXAMPLE}
                maxLength={ASK_MAX}
                className="qc-focus mt-2 h-14 w-full rounded-[12px] border border-border bg-bg-page/50 px-4 text-text-primary placeholder:text-text-secondary/80 focus:border-text-accent"
                style={{ fontSize: "clamp(16px, 1.2vw, 18px)" }}
              />
              <p className="mt-3 text-text-secondary" style={{ fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.55 }}>
                Три карты и разбор под ваш вопрос: что происходит, что мешает и что делать. Без предсказаний событий
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <button type="submit" className="qc-focus ask-btn">
              Спросить карты
            </button>
            <span className="text-center text-text-secondary sm:text-left" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              Можно с пустым полем — вопрос допишете там
            </span>
          </div>
        </div>
      </form>
    </Section>
  );
}
