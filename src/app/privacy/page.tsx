import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { DocPage } from "@/components/legal/DocPage";

export const metadata: Metadata = {
  title: "Политика обработки персональных данных — Моя Эра",
  description: "Политика обработки персональных данных сервиса Моя Эра.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Политика обработки персональных данных — Моя Эра",
    description: "Политика обработки персональных данных сервиса Моя Эра.",
    type: "website",
  },
};

export default function Page() {
  return (
    <DocPage
      title="Политика обработки персональных данных"
      body="Текст документа готовится к публикации."
      draftNotice
    />
  );
}
