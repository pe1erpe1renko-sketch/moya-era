import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateLong } from "@/lib/matrix";
import { imagePath } from "@/lib/image/code";
import { loadImage } from "@/server/imageStore";
import { SITE_URL } from "@/lib/env";

/**
 * ПУБЛИЧНАЯ СТРАНИЦА ОБРАЗА — /obraz/k7m2q9xw4t
 *
 * Ради неё всё и затевалось: карточку выкладывают, ссылку пересылают, и
 * по ней должны приходить. Поэтому страница индексируется, у неё свои
 * заголовок с описанием и своя OG-картинка — чтобы в мессенджере
 * разворачивалась превьюшка, а не голая ссылка.
 *
 * НА СТРАНИЦЕ НИЧЕГО ЛИШНЕГО: сама карточка и одна кнопка. Человек
 * пришёл посмотреть на чужой образ, а не читать про тарифы.
 *
 * Скрытого здесь тоже нет: снятые галочки не сохранялись вовсе — см.
 * `api/image`. Поэтому и прятать при выводе нечего.
 */

export const revalidate = 3600;
export const dynamicParams = true;

/** Пустой список — обязательное условие кэширования страниц по запросу. */
export async function generateStaticParams() {
  return [];
}

type Params = { code: string };

/**
 * Картинка на самой странице — по относительному адресу.
 *
 * С абсолютным она тянулась бы с боевого домена и не показывалась ни на
 * предпросмотре сборки, ни на localhost. Абсолютный нужен только там,
 * где адрес уходит наружу: в мета-теге и в разметке для поисковика.
 */
const cardSrc = (code: string) => `/api/obraz/${code}`;
const cardUrl = (code: string) => `${SITE_URL}/api/obraz/${code}`;

/**
 * Превью для мессенджера — уменьшенная копия.
 *
 * WhatsApp пропускает картинку предпросмотра примерно от полумегабайта и
 * просто не показывает её. Замерено: полная карточка — 2,1 МБ, в 640
 * точек — 790 КБ, в 480 — 456 КБ. Берём 480: ссылку пересылают ради
 * превьюшки, и лучше она маленькая, чем никакой.
 */
const previewUrl = (code: string) => `${SITE_URL}/api/obraz/${code}?w=480`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { code } = await params;
  const image = await loadImage(code);
  if (!image) return { title: "Образ не найден — Моя Эра", robots: { index: false, follow: true } };

  const who = image.name ? `${image.name}: ` : "";
  const what = image.title ? `аркан ${image.arcana}, ${image.title}` : `аркан ${image.arcana}`;
  const title = `${who}${image.label} — ${what} · Моя Эра`;
  const description = image.line
    ? `${image.line}. Посчитайте свой аркан по дате рождения — бесплатно и без регистрации.`
    : "Карточка со своим арканом по дате рождения. Посчитайте свой — бесплатно и без регистрации.";

  return {
    title,
    description,
    alternates: { canonical: imagePath(code) },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${imagePath(code)}`,
      images: [{ url: previewUrl(code), width: 480, height: 853 }],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { code } = await params;
  const image = await loadImage(code);
  if (!image) notFound();

  const alt = [image.name, image.label, image.title ? `аркан ${image.arcana}, ${image.title}` : `аркан ${image.arcana}`]
    .filter(Boolean)
    .join(" — ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: alt,
    description: image.line ?? undefined,
    contentUrl: cardUrl(code),
    datePublished: image.createdAt,
    inLanguage: "ru-RU",
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: "Моя Эра" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="flex min-h-screen w-full flex-col items-center bg-bg-page" style={{ padding: "clamp(24px, 5vh, 64px) 4vw" }}>
        <div className="flex w-full max-w-[420px] flex-col items-center">
          {/* Карточка: та же картинка, что человек скачал. */}
          <img
            src={cardSrc(code)}
            alt={alt}
            width={1080}
            height={1920}
            className="w-full rounded-[18px] border border-border"
            style={{ aspectRatio: "9 / 16" }}
          />

          <h1 className="mt-6 text-center font-display text-text-primary" style={{ fontSize: "clamp(22px, 2.4vw, 32px)", lineHeight: 1.15 }}>
            {image.name ? `${image.name} — ` : ""}
            {image.label}
          </h1>
          {image.line && (
            <p className="mt-2 text-center text-text-secondary" style={{ fontSize: "clamp(15px, 1.2vw, 18px)", lineHeight: 1.55 }}>
              {image.line}
            </p>
          )}
          {image.birthDate && (
            <p className="mt-2 text-center text-text-secondary" style={{ fontSize: 14 }}>
              {formatDateLong(image.birthDate)}
            </p>
          )}

          <Link
            href="/matrica-sudby"
            className="qc-focus mt-8 inline-flex items-center justify-center rounded-[12px] bg-accent px-8 text-[17px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            style={{ height: 54 }}
          >
            Рассчитать свою матрицу
          </Link>
          <p className="mt-3 text-center text-text-secondary" style={{ fontSize: 14 }}>
            Бесплатно, без регистрации, по дате рождения
          </p>
        </div>
      </main>
    </>
  );
}
