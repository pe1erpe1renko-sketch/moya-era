import { ImageResponse } from "next/og";
import { loadImage, type StoredImage } from "@/server/imageStore";
import { arcanaImage } from "@/lib/arcanaImage";
import { SITE_HOST } from "@/lib/env";

export const runtime = "nodejs";

/**
 * КАРТИНКА КАРТОЧКИ ОБРАЗА — /api/obraz/k7m2q9xw4t
 *
 * Та же карточка, что человек скачал, только собранная на сервере: она
 * стоит на публичной странице и уходит превьюшкой в мессенджеры.
 * Рисовать её на клиенте нельзя — превью в мессенджере и поисковый робот
 * ждать выполнения скриптов не станут.
 *
 * ШРИФТЫ И ИЛЛЮСТРАЦИЯ ЗАБИРАЮТСЯ ПО СЕТИ, а не вкомпилированы: у
 * картинок next/og предел в 500 КБ на всё вместе, а одна иллюстрация
 * весит триста. Origin берём из самого запроса, а не из настроек, —
 * тогда это работает и на боевом домене, и на localhost.
 *
 * Шрифты нужны свои: Satori понимает только ttf, otf и woff, поэтому
 * рядом лежат ttf-копии (`scripts/build-og-fonts.py`). Без них карточка
 * на странице оказалась бы набрана системной засечкой и перестала быть
 * похожей на скачанную.
 */

const W = 1080;
const H = 1920;

/**
 * Ширина картинки: 1080 по умолчанию, меньше — по `?w=`.
 *
 * Нужна не ради экономии, а ради превью в мессенджерах: WhatsApp
 * пропускает картинку предпросмотра примерно от полумегабайта и просто
 * не показывает её. Полноразмерная карточка в png весит два мегабайта,
 * поэтому в мета-теге стоит уменьшенная, а на странице — полная.
 */
const MIN_WIDTH = 320;

const FONT_FILES = [
  { file: "forum-cyrillic-400-normal", name: "Forum", weight: 400 as const },
  { file: "forum-latin-400-normal", name: "Forum", weight: 400 as const },
  { file: "onest-cyrillic-400-normal", name: "Onest", weight: 400 as const },
  { file: "onest-latin-400-normal", name: "Onest", weight: 400 as const },
  { file: "onest-cyrillic-500-normal", name: "Onest", weight: 500 as const },
  { file: "onest-latin-500-normal", name: "Onest", weight: 500 as const },
];

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500; style: "normal" };

let fontsCache: Promise<Font[]> | null = null;

function loadFonts(origin: string): Promise<Font[]> {
  fontsCache ??= Promise.all(
    FONT_FILES.map(async (f) => {
      const res = await fetch(`${origin}/fonts/og/${f.file}.ttf`);
      if (!res.ok) throw new Error(`Не загрузился шрифт ${f.file}: ${res.status}`);
      return { name: f.name, data: await res.arrayBuffer(), weight: f.weight, style: "normal" as const };
    }),
  ).catch((e) => {
    // Неудачу не кэшируем: следующий запрос должен попробовать снова.
    fontsCache = null;
    throw e;
  });
  return fontsCache;
}

const INK = "#f4f1ea";
const MUTED = "#9fbab9";
const ACCENT = "#c9b6f0";

/**
 * Карточка целиком. Все размеры умножаются на `k` — так уменьшенная
 * копия отличается от полной только размером, а не вёрсткой: Satori не
 * умеет масштабировать готовую картинку, он рисует по размерам.
 */
function card(image: StoredImage, origin: string, k: number) {
  const px = (n: number) => Math.round(n * k);
  return (
    <div
      style={{
        width: px(W),
        height: px(H),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${px(72)}px ${px(72)}px ${px(60)}px`,
        background: "linear-gradient(160deg, #03191e 0%, #052e35 100%)",
        fontFamily: "Onest",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ fontSize: px(28), letterSpacing: px(6), color: ACCENT, fontWeight: 500, textTransform: "uppercase" }}>
          {image.label}
        </div>
        {image.name && (
          <div
            style={{
              marginTop: px(28),
              fontSize: px(image.name.length > 22 ? 52 : 64),
              fontFamily: "Forum",
              color: INK,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {image.name}
          </div>
        )}
      </div>

      <img
        src={`${origin}${arcanaImage(image.arcana, "full")}`}
        alt=""
        width={px(720)}
        height={px(960)}
        style={{
          width: px(720),
          height: px(960),
          objectFit: "cover",
          borderRadius: px(28),
          border: `${Math.max(1, px(3))}px solid rgba(201,182,240,0.45)`,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {image.title && (
          // Одна строка, а не два узла подряд: Satori требует явного
          // display:flex у всего, где детей больше одного.
          <div style={{ fontSize: px(84), fontFamily: "Forum", color: INK, textAlign: "center", lineHeight: 1.15 }}>
            {`${image.arcana} · ${image.title}`}
          </div>
        )}
        {image.line && (
          <div
            style={{
              marginTop: px(24),
              fontSize: px(38),
              color: MUTED,
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: px(880),
            }}
          >
            {image.line}
          </div>
        )}
        {image.birthDate && (
          <div style={{ marginTop: px(24), fontSize: px(30), color: MUTED }}>{formatDate(image.birthDate)}</div>
        )}

        <div style={{ marginTop: px(44), width: px(720), height: 1, background: "rgba(159,186,185,0.25)" }} />
        <div style={{ marginTop: px(22), fontSize: px(38), fontWeight: 500, letterSpacing: px(2), color: INK }}>
          {SITE_HOST}
        </div>
        <div style={{ marginTop: px(10), fontSize: px(26), color: MUTED }}>Матрица судьбы по дате рождения</div>
      </div>
    </div>
  );
}

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const image = await loadImage(code);
  if (!image) return new Response("Не найдено", { status: 404 });

  const url = new URL(req.url);
  const origin = url.origin;
  const fonts = await loadFonts(origin);

  const asked = Number(url.searchParams.get("w"));
  const width = Number.isFinite(asked) && asked >= MIN_WIDTH && asked < W ? Math.round(asked) : W;

  return new ImageResponse(card(image, origin, width / W), {
    width,
    height: Math.round((width * H) / W),
    fonts,
    // Карточка после создания не меняется — можно кэшировать надолго.
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
  });
}
