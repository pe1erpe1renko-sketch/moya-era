import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { DocPage } from "@/components/legal/DocPage";

export const metadata: Metadata = {
  title: "Условия подписки и возврата — Моя Эра",
  description: "Условия подписки и возврата средств в сервисе Моя Эра.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Условия подписки и возврата — Моя Эра",
    description: "Условия подписки и возврата средств в сервисе Моя Эра.",
    type: "website",
  },
};

export default function Page() {
  return (
    <DocPage
      title="Условия подписки и возврата"
      body="Текст документа готовится к публикации."
      draftNotice
    />
  );
}
