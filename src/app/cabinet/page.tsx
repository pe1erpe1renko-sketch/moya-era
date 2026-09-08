import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { Suspense } from "react";
import CabinetPage from "./CabinetPage";

export const metadata: Metadata = {
  title: "Мой кабинет — Моя Эра",
  description: "Личный кабинет Моя Эра: расчёты по шести системам, карта дня и профиль.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Мой кабинет — Моя Эра",
    description: "Ваш профиль, карта дня и расчёты по шести системам.",
    type: "website",
  },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-bg-page" aria-busy="true" />}>
      <CabinetPage />
    </Suspense>
  );
}
