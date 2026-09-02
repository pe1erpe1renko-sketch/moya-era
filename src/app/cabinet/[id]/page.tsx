import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directions } from "@/lib/directions";
import ReadingPage from "./ReadingPage";

export const metadata: Metadata = {
  title: "Разбор — Моя Эра",
  description: "Разбор по направлению в личном кабинете Моя Эра: открытая часть и разделы полного разбора.",
  openGraph: {
    title: "Разбор — Моя Эра",
    description: "Открытая часть разбора и состав полного разбора.",
    type: "website",
  },
};

export function generateStaticParams() {
  return directions.map((d) => ({ id: d.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!directions.some((d) => d.id === id)) notFound();
  return <ReadingPage />;
}
