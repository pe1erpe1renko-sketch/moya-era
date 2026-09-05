/**
 * РАЗМЕТКА КАРТОЧКИ ОБРАЗА — чистые вычисления, без canvas.
 *
 * Здесь считается только то, что можно проверить тестом: как разложить
 * строку по строчкам, каким кеглем её взять, чтобы она влезла, и на какой
 * высоте оказывается каждый блок. Сама отрисовка — в `render.ts`.
 *
 * ЗАЧЕМ ОТДЕЛЬНО. Длинное имя («Александра Константиновна») и длинное
 * название аркана («Колесо Фортуны») ломают карточку тише всего: текст
 * либо наезжает на картинку, либо обрезается на середине слова, и узнать
 * об этом можно только глазами. Вынесенный расчёт проверяется на сотнях
 * строк за секунду.
 */

/** Размер карточки: вертикаль под экран телефона, годится и в сторис. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** Поля по краям. */
export const PAD = 72;

export type FitOptions = {
  /** максимальная ширина строки в пикселях */
  maxWidth: number;
  /** сколько строк допустимо */
  maxLines: number;
  /** желаемый кегль */
  size: number;
  /** ниже этого кегля не опускаемся, а обрезаем с многоточием */
  minSize: number;
  /** шаг уменьшения */
  step?: number;
};

export type FitResult = {
  lines: string[];
  size: number;
  /** true, если текст пришлось обрезать: он не влез даже минимальным кеглем */
  clipped: boolean;
};

/** Измеритель ширины строки. В браузере — canvas, в тесте — своя функция. */
export type Measure = (text: string, size: number) => number;

/** Перенос по словам. Слово длиннее строки рвётся по буквам. */
export function wrap(text: string, size: number, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  let line = "";

  const push = () => {
    if (line) lines.push(line);
    line = "";
  };

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    push();
    if (measure(word, size) <= maxWidth) {
      line = word;
      continue;
    }
    // Слово не влезает целиком — режем по буквам.
    let chunk = "";
    for (const ch of word) {
      if (measure(chunk + ch, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  push();
  return lines;
}

/**
 * Подбирает кегль так, чтобы текст лёг в отведённое число строк.
 *
 * Сначала уменьшает кегль, и только если не помогло даже минимальный —
 * обрезает последнюю строку многоточием. Обрезать — крайняя мера: лучше
 * мелкое имя целиком, чем крупное «Александра Константино…».
 */
export function fit(text: string, o: FitOptions, measure: Measure): FitResult {
  const step = o.step ?? 2;
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return { lines: [], size: o.size, clipped: false };

  for (let size = o.size; size >= o.minSize; size -= step) {
    const lines = wrap(clean, size, o.maxWidth, measure);
    if (lines.length <= o.maxLines) return { lines, size, clipped: false };
  }

  const lines = wrap(clean, o.minSize, o.maxWidth, measure).slice(0, o.maxLines);
  const last = lines.length - 1;
  if (last >= 0) {
    let tail = lines[last];
    while (tail.length > 1 && measure(`${tail}…`, o.minSize) > o.maxWidth) tail = tail.slice(0, -1);
    lines[last] = `${tail}…`;
  }
  return { lines, size: o.minSize, clipped: true };
}

/* ─── что где стоит на карточке ─────────────────────────────────── */

export type CardFields = {
  /** подпись темы, всегда есть */
  label: string;
  /** имя — если известно и галочка включена */
  name: string | null;
  /** «13 · Перерождение» — если галочка включена */
  title: string | null;
  /** строка смысла — если галочка включена */
  line: string | null;
  /** «13 июля 1998» — если галочка включена */
  date: string | null;
};

export type Block = { y: number; height: number };

export type CardLayout = {
  theme: Block;
  name: Block | null;
  picture: Block & { x: number; width: number };
  title: Block | null;
  line: Block | null;
  date: Block | null;
  footer: Block;
};

/** Пропорции иллюстрации — те же три к четырём, что и в интерфейсе. */
const PICTURE_RATIO = 3 / 4;

/**
 * Раскладывает блоки сверху вниз.
 *
 * Картинка — самый крупный блок, и её размер подбирается последним: она
 * забирает всё, что осталось от текста. Поэтому длинное имя не наезжает
 * на иллюстрацию, а ужимает её — карточка остаётся целой.
 */
export function layout(f: CardFields, sizes: { name: number; title: number; line: number; lineCount: number; nameCount: number }): CardLayout {
  const gap = 28;
  const footerHeight = 96;

  const themeHeight = 44;
  const nameHeight = f.name ? sizes.name * 1.2 * sizes.nameCount : 0;
  const titleHeight = f.title ? sizes.title * 1.15 : 0;
  const lineHeight = f.line ? sizes.line * 1.4 * sizes.lineCount : 0;
  const dateHeight = f.date ? 42 : 0;

  const textAbove = themeHeight + (nameHeight ? nameHeight + gap : 0);
  const textBelow =
    (titleHeight ? titleHeight + gap : 0) +
    (lineHeight ? lineHeight + gap : 0) +
    (dateHeight ? dateHeight + gap : 0);

  const top = PAD;
  const bottom = CARD_HEIGHT - PAD - footerHeight;
  const free = bottom - top - textAbove - textBelow - gap * 2;

  // Картинка забирает остаток, но не шире полей и не уже разумного.
  const maxByWidth = CARD_WIDTH - PAD * 2;
  const pictureHeight = Math.max(560, Math.min(free, maxByWidth / PICTURE_RATIO));
  const pictureWidth = pictureHeight * PICTURE_RATIO;

  let y = top;
  const theme: Block = { y, height: themeHeight };
  y += themeHeight + gap;

  const name = f.name ? { y, height: nameHeight } : null;
  if (name) y += nameHeight + gap;

  const picture = { y, height: pictureHeight, width: pictureWidth, x: (CARD_WIDTH - pictureWidth) / 2 };
  y += pictureHeight + gap;

  const title = f.title ? { y, height: titleHeight } : null;
  if (title) y += titleHeight + gap;

  const line = f.line ? { y, height: lineHeight } : null;
  if (line) y += lineHeight + gap;

  const date = f.date ? { y, height: dateHeight } : null;
  if (date) y += dateHeight + gap;

  return { theme, name, picture, title, line, date, footer: { y: CARD_HEIGHT - PAD - footerHeight, height: footerHeight } };
}

/** Нижняя граница последнего текстового блока — по ней видно, не залез ли он в подпись. */
export function contentBottom(l: CardLayout): number {
  const last = l.date ?? l.line ?? l.title ?? l.picture;
  return last.y + last.height;
}
