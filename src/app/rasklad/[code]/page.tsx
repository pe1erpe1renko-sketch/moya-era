import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartShell } from "@/components/chart/ChartShell";
import { SpreadCard } from "@/components/tarot/SpreadCard";
import { loadSpread } from "@/server/spreadStore";
import { loadAccess } from "@/server/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * СОХРАНЁННЫЙ РАСКЛАД — /rasklad/k7m2q9xw4tzp
 *
 * Человек заплатил кредитами и должен иметь возможность вернуться и
 * перечитать. Расклад остаётся у него навсегда, в том числе после
 * отмены подписки: подписка открывает новые расклады, а купленное
 * остаётся купленным.
 *
 * СТРАНИЦА ЗАКРЫТА ОТ ИНДЕКСАЦИИ. Это личный вопрос человека, часто
 * тяжёлый, и в поиске ему не место. Код случайный: подобрать чужой
 * перебором нельзя.
 *
 * Страница динамическая, без кэша: чужой расклад не должен осесть в
 * кэше и достаться следующему по тому же адресу.
 */

type Params = { code: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { code } = await params;
  const spread = await loadSpread(code);
  return {
    title: spread ? `${spread.title} — Моя Эра` : "Расклад не найден — Моя Эра",
    // noindex здесь не перестраховка, а суть: вопрос человека — не наш
    // контент, и в выдаче ему делать нечего.
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { code } = await params;
  const spread = await loadSpread(code);
  if (!spread) notFound();

  // Смотреть расклад может только тот, кто его сделал. Код случайный, но
  // ссылку можно переслать по ошибке — а вопрос бывает очень личный.
  const access = await loadAccess();
  const mine = access.demo || (spread.userId !== null && spread.userId === access.userId);
  if (!mine) notFound();

  return (
    <ChartShell>
      <main className="mx-auto w-full max-w-[860px] px-[4vw] md:px-6" style={{ paddingTop: "clamp(32px, 5vh, 72px)", paddingBottom: "clamp(56px, 8vh, 110px)" }}>
        <div className="text-text-secondary" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {spread.title}
        </div>
        <h1 className="mt-3 font-display text-text-primary" style={{ fontSize: "clamp(24px, 2.6vw, 38px)", lineHeight: 1.15 }}>
          {spread.question}
        </h1>

        <div className="mt-8 flex flex-wrap justify-center" style={{ gap: 18 }}>
          {spread.cards.map((card, i) => (
            <SpreadCard key={`${card.position.id}-${i}`} card={card} width={120} />
          ))}
        </div>

        <div className="mt-10 flex flex-col" style={{ gap: 14 }}>
          {spread.body.split("\n\n").filter(Boolean).map((p, i) => (
            <p key={i} className="text-text-primary" style={{ fontSize: "clamp(16px, 1.2vw, 18px)", lineHeight: 1.7 }}>
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center" style={{ gap: 12 }}>
          <Link
            href="/taro/rasklad"
            className="qc-focus inline-flex items-center rounded-[12px] border border-text-accent/50 px-5 text-[15px] text-text-primary transition-colors hover:bg-accent/10"
            style={{ height: 46 }}
          >
            Сделать ещё расклад
          </Link>
          <Link
            href="/cabinet#spreads"
            className="qc-focus inline-flex items-center rounded-[12px] border border-border px-5 text-[15px] text-text-secondary transition-colors hover:border-text-accent/60 hover:text-text-primary"
            style={{ height: 46 }}
          >
            Все мои расклады
          </Link>
        </div>
      </main>
    </ChartShell>
  );
}
