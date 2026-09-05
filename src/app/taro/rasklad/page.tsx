import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import SpreadMaker from "./SpreadMaker";

/**
 * ЖИВОЙ РАСКЛАД — /taro/rasklad
 *
 * Страница, где человек выбирает вид, пишет вопрос и тянет карты.
 * Сам расклад после этого живёт по своему адресу /rasklad/<код> и в
 * поиск не попадает; эта страница — обычная, её описание в выдаче
 * уместно.
 *
 * Статический сегмент побеждает соседний динамический `/taro/[date]`:
 * адрес «rasklad» никогда не будет разобран как дата.
 */
export const metadata: Metadata = {
  title: "Расклад Таро на вопрос — Моя Эра",
  description:
    "Четыре расклада на старших арканах: одна карта, три карты, отношения и большой расклад. Свой вопрос своими словами, разбор пишется под него.",
  alternates: { canonical: "/taro/rasklad" },
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Расклад Таро на вопрос — Моя Эра",
    description: "Выберите вид расклада, задайте вопрос своими словами и вытяните карты.",
    type: "website",
  },
};

export default function Page() {
  return <SpreadMaker />;
}
