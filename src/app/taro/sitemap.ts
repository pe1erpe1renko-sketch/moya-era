import type { MetadataRoute } from "next";
import { chartSitemapChunk, chartSitemapCount, isoToChartUrlDate } from "@/lib/chartUrl";
import { SITE_URL } from "@/lib/env";

/**
 * Карта сайта для страниц карты дня.
 * Файлы: /taro/sitemap/0.xml и дальше по номерам.
 * Диапазон дат тот же, что у остальных систем, — см. `lib/chartUrl`.
 *
 * changeFrequency здесь daily, а не monthly: содержимое этих страниц
 * действительно меняется каждый день, и врать поисковику незачем.
 */

export async function generateSitemaps() {
  return Array.from({ length: chartSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id) || 0;
  return chartSitemapChunk(index).map((iso) => ({
    url: `${SITE_URL}/taro/${isoToChartUrlDate(iso)}`,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
}
