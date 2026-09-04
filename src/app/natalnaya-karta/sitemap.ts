import type { MetadataRoute } from "next";
import { chartPath, chartSitemapChunk, chartSitemapCount } from "@/lib/chartUrl";
import { SITE_URL } from "@/lib/env";

/**
 * Карта сайта для страниц натальной карты по датам.
 * Файлы: /natalnaya-karta/sitemap/0.xml и дальше по номерам.
 *
 * Разбивка нужна из-за предела поисковиков — 50 000 адресов в файле.
 * Сейчас дат около тридцати одной тысячи, то есть файл один; каждый год
 * прибавляется по 365 адресов, и когда их станет больше 45 000, файлов
 * станет два. Считать это руками не нужно: количество выводится из
 * диапазона дат, а собирает их всех sitemap-index.xml.
 */

export async function generateSitemaps() {
  return Array.from({ length: chartSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id) || 0;
  return chartSitemapChunk(index).map((iso) => ({
    url: `${SITE_URL}${chartPath("natal", iso)}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));
}
