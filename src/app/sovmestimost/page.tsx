import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import SovmestimostPage from "./SovmestimostPage";

export const metadata: Metadata = {
  title: "Совместимость по дате рождения: аркан пары — Моя Эра",
  description: "Бесплатный расчёт совместимости по датам рождения двоих. Аркан пары и то, какая задача возникает именно в этом сочетании.",
  alternates: { canonical: "/sovmestimost" },
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: "Совместимость по дате рождения: аркан пары — Моя Эра",
    description: "Бесплатный расчёт совместимости по датам рождения двоих. Аркан пары и то, какая задача возникает именно в этом сочетании.",
    type: "website",
  },
};

export default function Page() {
  return <SovmestimostPage />;
}
