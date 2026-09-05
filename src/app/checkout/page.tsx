import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { Suspense } from "react";
import CheckoutPage from "./CheckoutPage";

export const metadata: Metadata = {
  title: "Оформление подписки — Моя Эра",
  description: "Оформление подписки на Мою Эру: выбор периода оплаты, промокод и электронный чек на почту.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
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
