import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = { title: "Оплата — Моя Эра", robots: { index: false } };

/** Сюда ЮKassa возвращает после оплаты. Подписку включает вебхук — обычно за секунды. */
export default function Page() {
  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[90px] w-full md:h-[110px]">
        <Header />
      </div>
      <div className="mx-auto w-[min(720px,92vw)] pb-20 pt-10 text-center">
        <h1 className="font-display text-text-primary" style={{ fontSize: "clamp(30px, 3vw, 48px)", lineHeight: 1.08 }}>Спасибо</h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-text-secondary">Платёж обрабатывается. Подписка включится в кабинете в течение минуты — если не видите её, обновите страницу или напишите нам.</p>
        <Link href="/cabinet" className="mt-8 inline-flex h-12 items-center rounded-[12px] bg-accent px-6 text-[16px] font-medium text-primary-foreground">В кабинет</Link>
      </div>
      <Footer />
    </main>
  );
}
