import { CHART_SYSTEMS, chartSitemapCount, type ChartSystem } from "@/lib/chartUrl";
import { SITE_URL } from "@/lib/env";

/**
 * ИНДЕКС КАРТ САЙТА — /sitemap-index.xml
 *
 * Один файл со списком остальных: базовые страницы и по файлу (или
 * нескольким) на каждую систему карт. Так соблюдается предел в 50 000
 * адресов на файл, и поисковику достаточно одной ссылки — она стоит в
 * robots.txt.
 *
 * Написан вручную, а не через file convention Next: `sitemap.ts` умеет
 * отдавать только список адресов (urlset), а нужен индекс (sitemapindex).
 */

export const runtime = "nodejs";
export const revalidate = 86400;

function chartSitemaps(system: ChartSystem): string[] {
  const slug = CHART_SYSTEMS[system].slug;
  return Array.from({ length: chartSitemapCount() }, (_, i) => `${SITE_URL}/${slug}/sitemap/${i}.xml`);
}

export function GET() {
  const files = [
    `${SITE_URL}/sitemap.xml`,
    ...chartSitemaps("natal"),
    ...chartSitemaps("humandesign"),
    ...chartSitemaps("numerology"),
  ];
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`).join("\n")}
</sitemapindex>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
