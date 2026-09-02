import type { Metadata } from "next";
import { DocPage } from "@/components/legal/DocPage";

export const metadata: Metadata = {
  title: "Публичная оферта — Моя Эра",
  description: "Публичная оферта сервиса Моя Эра. Документ готовится к публикации.",
  openGraph: {
    title: "Публичная оферта — Моя Эра",
    description: "Публичная оферта сервиса Моя Эра. Документ готовится к публикации.",
    type: "website",
  },
};

export default function Page() {
  return (
    <DocPage
      title="Публичная оферта"
      body="Текст документа готовится к публикации. До его размещения оформление платных тарифов недоступно."
      draftNotice
    />
  );
}
