import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import { CalcTheaterProvider } from "@/components/reading/CalcTheater";
import { Metrika } from "@/components/analytics/Metrika";
import { SITE_URL } from "@/lib/env";


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Моя Эра — матрица судьбы, натальная карта, нумерология и таро по дате рождения", template: "%s" },
  description: "Шесть систем самопознания в одном сервисе: матрица судьбы, натальная карта, дизайн человека, нумерология, таро, совместимость. Расчёт по дате рождения с объяснением каждого числа.",
  openGraph: {
    title: "Моя Эра",
    description: "Шесть систем самопознания в одном сервисе. Расчёт по дате рождения с объяснением каждого числа.",
    type: "website",
    locale: "ru_RU",
    siteName: "Моя Эра",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
  /**
   * ROBOTS ЗДЕСЬ НЕ ЗАДАЁТСЯ НАРОЧНО.
   *
   * `index, follow` — и так поведение поисковика по умолчанию, так что
   * строка ничего не добавляла. Зато мешала: этот Next не заменяет
   * robots из корневого макета тем, что просит страница, а дописывает
   * второй тег рядом. Страницы с `noindex` — наставник, страница оплаты
   * и, главное, сохранённый расклад — выходили с двумя противоречащими
   * указаниями сразу. Поисковик в таком случае берёт строгое, но
   * держаться на этом нельзя: у расклада за адресом личный вопрос
   * человека. Без строки в макете каждая страница говорит только своё.
   */
  /**
   * ЗАГОЛОВОК REFERER — только адрес сайта, без пути и параметров, и на
   * чужие сайты, и на свой собственный.
   *
   * Обычного `strict-origin-when-cross-origin` тут мало. Он режет путь
   * только при уходе на чужой домен, а свои же запросы — за картинкой, за
   * шрифтом, за куском страницы — уносят полный адрес и складывают его в
   * журнал веб-сервера. В адресе может стоять имя человека (?n= для числа
   * судьбы), и в журналах ему не место. Пути в этом заголовке мы всё
   * равно нигде не читаем: посещения считает счётчик, и адрес он получает
   * от нас уже очищенным.
   */
  referrer: "strict-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#03191e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          href="/fonts/forum-cyrillic-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/onest-cyrillic-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <CalcTheaterProvider>{children}</CalcTheaterProvider>
        <Metrika />
      </body>
    </html>
  );
}
