import type { Metadata } from "next";
import { Suspense } from "react";
import MentorPage from "./MentorPage";

export const metadata: Metadata = {
  title: "Наставник — Моя Эра",
  description: "Разговор с наставником, который видит ваши числа и отвечает на вопрос, а не на аркан.",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-bg-page" aria-busy="true" />}>
      <MentorPage />
    </Suspense>
  );
}
