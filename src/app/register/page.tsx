import type { Metadata } from "next";
import RegisterPage from "./RegisterPage";

export const metadata: Metadata = {
  title: "Создать профиль — Моя Эра",
  description: "Регистрация в Моя Эра: профиль хранит расчёты по шести системам, дневник и профили близких.",
  openGraph: {
    title: "Создать профиль — Моя Эра",
    description: "Профиль хранит твои расчёты, дневник и профили близких.",
    type: "website",
  },
};

export default function Page() {
  return <RegisterPage />;
}
