import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { DocPage } from "@/components/legal/DocPage";

export const metadata: Metadata = {
  title: "О сервисе — Моя Эра",
  description: "О сервисе Моя Эра: шесть систем расчёта складываются в один профиль.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "О сервисе — Моя Эра",
    description: "О сервисе Моя Эра: шесть систем расчёта складываются в один профиль.",
    type: "website",
  },
};

export default function Page() {
  return (
    <DocPage title="О сервисе" body="Текст страницы готовится." />
  );
}
