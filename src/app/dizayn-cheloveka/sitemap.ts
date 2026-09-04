import type { MetadataRoute } from "next";
import { chartPath, chartSitemapChunk, chartSitemapCount } from "@/lib/chartUrl";
import { SITE_URL } from "@/lib/env";

/**
 * Карта сайта для страниц дизайна человека по датам.
 * Файлы: /dizayn-cheloveka/sitemap/0.xml и дальше по номерам.
 * Устроена так же, как у натальной карты, — см. соседний файл.
 */

export async function generateSitemaps() {
  return Array.from({ length: chartSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id) || 0;
  return chartSitemapChunk(index).map((iso) => ({
    url: `${SITE_URL}${chartPath("humandesign", iso)}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
}
