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
    // Витрина живого расклада. Сами расклады (/rasklad/<код>) сюда не
    // попадают никогда: это личные вопросы людей, и они закрыты от
    // индексации и в метаданных страницы, и в robots.txt.
    { url: `${SITE_URL}/taro/rasklad`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
  ];
  // Страницы карт по датам (/natalnaya-karta/26-07-1990) перечислены в
  // отдельных файлах: /natalnaya-karta/sitemap/0.xml и /dizayn-cheloveka/…
  // Все файлы собраны в /sitemap-index.xml, на него и указывает robots.txt.
  // Разборы матрицы по датам пока индексируются по внутренним ссылкам.
  // Пары (/sovmestimost/дата/дата) в карту сайта не кладём вовсе:
  // комбинаций дат порядка миллиарда. Их индексируют ссылки, которыми
  // делятся со вторым человеком, — ровно так ими и пользуются.
  return base;
}
