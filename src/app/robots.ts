import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

/**
 * Поисковику даём одну ссылку — на индекс карт сайта. В нём перечислены и
 * базовые страницы, и файлы с адресами карт по датам.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cabinet", "/checkout", "/nastavnik", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap-index.xml`,
  };
}
