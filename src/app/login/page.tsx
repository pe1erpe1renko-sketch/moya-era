import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import LoginPage from "./LoginPage";

export const metadata: Metadata = {
  title: "Вход — Моя Эра",
  description: "Вход в профиль Моя Эра: расчёты, люди рядом и расклады в одном месте.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Вход — Моя Эра",
    description: "Профиль хранит ваши расчёты, людей рядом и расклады.",
    type: "website",
  },
};

export default function Page() {
  return <LoginPage />;
}
