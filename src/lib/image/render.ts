/**
 * ОТРИСОВКА КАРТОЧКИ ОБРАЗА на canvas.
 *
 * Карточка СОБИРАЕТСЯ из готовой иллюстрации аркана, а не рисуется
 * нейросетью: так она стоит ноль, выглядит одинаково у всех и не зависит
 * от того, в каком настроении сегодня модель.
 *
 * Размер 1080×1920 — вертикаль под экран телефона: годится и в сторис, и
 * как обои. Берётся оригинал иллюстрации (900×1200), а не уменьшенная
 * копия: на карточке она во весь экран, и мыло здесь будет видно сразу.
 *
 * ССЫЛКА НА САЙТ ВНИЗУ ОБЯЗАТЕЛЬНА. Образ — единственный бесплатный
 * канал привлечения в проекте: карточку выкладывают, и по ней должны
 * приходить. Убрать подпись нельзя, галочки на неё не влияют.
 */

import { arcanaImage } from "@/lib/arcanaImage";
import { SITE_HOST } from "@/lib/env";
import { CARD_HEIGHT, CARD_WIDTH, PAD, contentBottom, fit, layout, type CardFields } from "./layout";

const DISPLAY = '"Forum", serif';
const SANS = '"Onest", system-ui, sans-serif';

const INK = "#f4f1ea";
const MUTED = "#9fbab9";
const ACCENT = "#c9b6f0";

/**
 * Подпись внизу карточки. Берётся из настройки адреса сайта, а не
 * вписана руками: иначе на карточке однажды окажется адрес, которого
 * нет, и весь смысл образа пропадёт — по ссылке никто не придёт.
 */
export const SITE_LABEL = SITE_HOST;
export const SITE_TAGLINE = "Матрица судьбы по дате рождения";

/** Ширина строки этим шрифтом — измеряется самим canvas. */
function measurer(ctx: CanvasRenderingContext2D, family: string, weight = "400") {
  return (text: string, size: number) => {
    ctx.font = `${weight} ${size}px ${family}`;
    return ctx.measureText(text).width;
  };
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  opts: { y: number; size: number; family: string; color: string; lineHeight: number; weight?: string },
) {
  ctx.font = `${opts.weight ?? "400"} ${opts.size}px ${opts.family}`;
  ctx.fillStyle = opts.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((text, i) => ctx.fillText(text, CARD_WIDTH / 2, opts.y + i * opts.size * opts.lineHeight));
}

/** Загружает иллюстрацию. Без неё карточку не делаем: она — весь смысл. */
function loadPicture(arcanum: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Не загрузилась иллюстрация аркана ${arcanum}`));
    img.src = arcanaImage(arcanum, "full");
  });
}

/**
 * Шрифты нужно дождаться руками: canvas не умеет ждать загрузки шрифта и
 * молча нарисует запасным. На карточке это видно сразу — вместо Forum
 * получится системная засечка.
 */
async function waitForFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load('400 120px "Forum"'),
    document.fonts.load('400 44px "Onest"'),
    document.fonts.load('500 44px "Onest"'),
  ]).catch(() => undefined);
  await document.fonts.ready.catch(() => undefined);
}

/** Рисует карточку и возвращает готовый canvas. */
export async function renderCard(fields: CardFields, arcanum: number): Promise<HTMLCanvasElement> {
  const [picture] = await Promise.all([loadPicture(arcanum), waitForFonts()]);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не дал canvas");

  const mDisplay = measurer(ctx, DISPLAY);
  const mSans = measurer(ctx, SANS);

  // Тексты подбираются ДО разметки: от числа строк зависит, сколько
  // места достанется иллюстрации.
  const nameFit = fields.name
    ? fit(fields.name, { maxWidth: CARD_WIDTH - PAD * 2, maxLines: 2, size: 64, minSize: 36 }, mDisplay)
    : null;
  const titleFit = fields.title
    ? fit(fields.title, { maxWidth: CARD_WIDTH - PAD * 2, maxLines: 2, size: 88, minSize: 48 }, mDisplay)
    : null;
  const lineFit = fields.line
    ? fit(fields.line, { maxWidth: CARD_WIDTH - PAD * 2.6, maxLines: 3, size: 40, minSize: 28 }, mSans)
    : null;

  const l = layout(fields, {
    name: nameFit?.size ?? 0,
    nameCount: nameFit?.lines.length ?? 0,
    title: titleFit?.size ?? 0,
    line: lineFit?.size ?? 0,
    lineCount: lineFit?.lines.length ?? 0,
  });

  // Фон: тот же градиент, что у сайта, плюс мягкое свечение за картинкой.
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#03191e");
  bg.addColorStop(1, "#052e35");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    l.picture.y + l.picture.height / 2,
    0,
    CARD_WIDTH / 2,
    l.picture.y + l.picture.height / 2,
    CARD_WIDTH * 0.75,
  );
  glow.addColorStop(0, "rgba(122, 93, 168, 0.30)");
  glow.addColorStop(1, "rgba(122, 93, 168, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Тема
  ctx.font = `500 ${28}px ${SANS}`;
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "6px";
  ctx.fillText(fields.label.toUpperCase(), CARD_WIDTH / 2, l.theme.y + 8);
  ctx.letterSpacing = "0px";

  if (nameFit && l.name) {
    drawLines(ctx, nameFit.lines, { y: l.name.y, size: nameFit.size, family: DISPLAY, color: INK, lineHeight: 1.2 });
  }

  // Иллюстрация в скруглённой рамке
  const r = 28;
  const { x, y, width, height } = l.picture;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
  ctx.clip();
  // object-cover: картинка заполняет рамку целиком, лишнее срезается.
  const scale = Math.max(width / picture.width, height / picture.height);
  const dw = picture.width * scale;
  const dh = picture.height * scale;
  ctx.drawImage(picture, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  ctx.restore();
  ctx.strokeStyle = "rgba(201, 182, 240, 0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, width - 3, height - 3, r);
  ctx.stroke();

  if (titleFit && l.title) {
    drawLines(ctx, titleFit.lines, { y: l.title.y, size: titleFit.size, family: DISPLAY, color: INK, lineHeight: 1.15 });
  }
  if (lineFit && l.line) {
    drawLines(ctx, lineFit.lines, { y: l.line.y, size: lineFit.size, family: SANS, color: MUTED, lineHeight: 1.4 });
  }
  if (fields.date && l.date) {
    ctx.font = `400 30px ${SANS}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(fields.date, CARD_WIDTH / 2, l.date.y + 6);
  }

  // Подпись с адресом сайта
  ctx.strokeStyle = "rgba(159, 186, 185, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD * 2, l.footer.y);
  ctx.lineTo(CARD_WIDTH - PAD * 2, l.footer.y);
  ctx.stroke();

  ctx.font = `500 38px ${SANS}`;
  ctx.fillStyle = INK;
  ctx.letterSpacing = "2px";
  ctx.fillText(SITE_LABEL, CARD_WIDTH / 2, l.footer.y + 22);
  ctx.letterSpacing = "0px";
  ctx.font = `400 26px ${SANS}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(SITE_TAGLINE, CARD_WIDTH / 2, l.footer.y + 70);

  // Страховка: если текст всё же дошёл до подписи, дальше рисовать нечего —
  // такое означает ошибку в разметке, и лучше узнать о ней сразу.
  if (contentBottom(l) > l.footer.y) {
    throw new Error("Текст не помещается на карточку: проверьте разметку");
  }

  return canvas;
}

/** Скачивание карточки файлом. */
export async function downloadCard(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Не удалось собрать картинку");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
