import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutPage from "./CheckoutPage";

export const metadata: Metadata = {
  title: "Оформление подписки — Моя Эра",
  description: "Оформление подписки на Мою Эру: выбор периода оплаты, промокод и электронный чек на почту.",
  openGraph: {
    title: "Оформление подписки — Моя Эра",
    description: "Выберите период оплаты и оформите доступ ко всем шести системам.",
    type: "website",
  },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-bg-page" aria-busy="true" />}>
      <CheckoutPage />
    </Suspense>
  );
}
