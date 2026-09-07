import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

/**
 * Поисковику даём одну ссылку — на индекс карт сайта. В нём перечислены и
 * базовые страницы, и файлы с адресами карт по датам.
 *
 * `/rasklad/` закрыт весь: там лежат вопросы людей, часто тяжёлые, и в
 * поиске им не место. На самих страницах стоит noindex — здесь то же
 * самое сказано ещё раз, чтобы их даже не обходили. Витрина раскладов
 * живёт на `/taro` и остаётся открытой.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cabinet", "/checkout", "/nastavnik", "/rasklad/", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap-index.xml`,
  };
}
