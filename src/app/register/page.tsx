import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import RegisterPage from "./RegisterPage";

export const metadata: Metadata = {
  title: "Создать профиль — Моя Эра",
  description: "Регистрация в Моя Эра: профиль хранит расчёты по шести системам, людей рядом и расклады.",
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Создать профиль — Моя Эра",
    description: "Профиль хранит ваши расчёты, людей рядом и расклады.",
    type: "website",
  },
};

export default function Page() {
  return <RegisterPage />;
}
