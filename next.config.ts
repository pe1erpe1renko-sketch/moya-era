import type { NextConfig } from "next";

/**
 * СТАРЫЕ АДРЕСА КАБИНЕТА ПО НАПРАВЛЕНИЯМ → НОВЫЕ СТРАНИЦЫ.
 *
 * В первой версии у вошедшего были свои страницы /cabinet/<направление>
 * с картой дня и пятью вопросами под замком. Их больше нет: вошедший
 * попадает на те же страницы, что и все, а его данные подставляются
 * сами. Сохранённые ссылки не должны упираться в «не найдено», поэтому
 * шесть адресов перенаправляются навсегда. Список сверяется тестом с
 * `src/lib/directions.ts`.
 */
const CABINET_REDIRECTS: Array<[string, string]> = [
  ["matrix", "/matrica-sudby"],
  ["natal", "/natalnaya-karta"],
  ["humandesign", "/dizayn-cheloveka"],
  ["numerology", "/numerologiya"],
  ["tarot", "/taro"],
  ["synastry", "/sovmestimost"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return CABINET_REDIRECTS.map(([id, path]) => ({ source: `/cabinet/${id}`, destination: path, permanent: true }));
  },
  /**
   * ЗАГОЛОВОК ПРОТИВ ИНДЕКСАЦИИ РАСКЛАДОВ.
   *
   * На самой странице `/rasklad/<код>` стоит `noindex` в метаданных, и
   * весь раздел закрыт в robots.txt. Заголовок — третий рубеж, и он
   * сильнее двух первых: работает до разбора вёрстки и не зависит от
   * того, как Next сложит метаданные соседних сегментов.
   *
   * Три рубежа здесь не перестраховка. За этим адресом лежит вопрос,
   * который человек задал картам, — часто такой, какого он не задавал
   * никому живому. Попасть в поиск он не должен ни при каких условиях.
   */
  async headers() {
    return [
      {
        source: "/rasklad/:code*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
