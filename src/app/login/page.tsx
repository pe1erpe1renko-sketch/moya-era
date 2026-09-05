import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import LoginPage from "./LoginPage";

export const metadata: Metadata = {
  title: "Вход — Моя Эра",
  description: "Вход в профиль Моя Эра: расчёты, дневник и профили близких в одном месте.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Вход — Моя Эра",
    description: "Профиль хранит твои расчёты и дневник наблюдений.",
    type: "website",
  },
};

export default function Page() {
  return <LoginPage />;
}
