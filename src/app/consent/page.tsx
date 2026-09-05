import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { DocPage } from "@/components/legal/DocPage";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных — Моя Эра",
  description: "Согласие на обработку персональных данных в сервисе Моя Эра.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Согласие на обработку персональных данных — Моя Эра",
    description: "Согласие на обработку персональных данных в сервисе Моя Эра.",
    type: "website",
  },
};

export default function Page() {
  return (
    <DocPage
      title="Согласие на обработку персональных данных"
      body="Текст документа готовится к публикации."
      draftNotice
    />
  );
}
