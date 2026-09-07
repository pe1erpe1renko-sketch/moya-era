import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import SupportPage from "./SupportPage";

export const metadata: Metadata = {
  title: "Поддержка — Моя Эра",
  description: "Как связаться с поддержкой Моя Эра: Telegram, Max, почта. Отправьте вместе с вопросом ваш ID — ответим быстрее.",
  alternates: { canonical: "/podderzhka" },
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Поддержка — Моя Эра",
    description: "Telegram, Max и почта. Отправьте вместе с вопросом ваш ID — ответим быстрее.",
    type: "website",
  },
};

export default function Page() {
  return <SupportPage />;
}
