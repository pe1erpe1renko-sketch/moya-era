import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { directions } from "@/lib/directions";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/tarify`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...directions.map((d) => ({ url: `${SITE_URL}${d.path}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
  // Страницы разборов по датам (/matrica/13-07-1998) индексируются по внутренним
  // ссылкам; отдельный индекс по датам — следующий шаг, когда появится трафик.
  return base;
}
