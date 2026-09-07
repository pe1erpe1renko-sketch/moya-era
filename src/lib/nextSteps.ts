/**
 * ВИТРИНА «ДАЛЬШЕ» — что предложить в конце разбора.
 *
 * Внизу каждой страницы разбора стоит витрина из трёх-четырёх крупных
 * карточек с иллюстрациями арканов. Разделы выше — это чтение, витрина —
 * это выбор: страница не должна заканчиваться подвалом или пустотой.
 *
 * Здесь только данные карточек: заголовок, одна живая строка о том, что
 * человек получит, и действие. Рисует их `components/next/NextSteps`.
 * Данные без функций намеренно: витрину собирают серверные страницы и
 * передают в клиентский компонент, а через эту границу проходят только
 * простые значения.
 *
 * ЧЕГО ЗДЕСЬ НЕ БЫВАЕТ. Ни цен, ни зачёркнутых цен, ни таймеров, ни
 * «осталось N мест». Расклад помечается словами «за кредиты» — и всё.
 * Строки не обещают событий: они говорят, что человек увидит, а не что
 * с ним случится.
 */

import { CALC_TYPES } from "@/lib/matrix/contentPositions";
import { formatDateDots, isoToUrlDate, readingPath } from "@/lib/matrix";
import { CHART_SYSTEMS, chartPath, chartUrlDateToIso, isoToChartUrlDate, type ChartSystem } from "@/lib/chartUrl";
import { formatBirthDate } from "@/lib/pendingBirth";
import type { PairViewId } from "@/lib/pair/views";

export type NextAction =
  /** одна кнопка-ссылка */
  | { kind: "link"; href: string; label: string }
  /**
   * поле даты прямо в карточке: `pattern` — адрес, куда подставится
   * введённая дата вместо `{date}` (в формате адреса, 26-07-1990)
   */
  | { kind: "date"; label: string; fieldLabel: string; pattern: string }
  /** несколько ссылок в одной карточке */
  | { kind: "links"; items: NextLink[] };

export type NextLink = { href: string; label: string };

export type NextCard = {
  id: string;
  /** аркан для иллюстрации */
  art: number;
  /** маленькая пометка на иллюстрации: «за кредиты» */
  tag?: string;
  title: string;
  /** одна живая строка: что человек получит */
  line: string;
  action: NextAction;
};

export type NextShowcase = {
  cards: NextCard[];
  /** соседние даты и «посчитать по своей» — тихой строкой под карточками */
  neighbors: NextLink[];
  /** эта же дата в системах, которых нет среди карточек, — для перелинковки */
  also: NextLink[];
};

/** Пометка платного расклада. Без цифр: цены живут в базе, не здесь. */
export const CREDITS_TAG = "за кредиты";

/* ─── карточки-кирпичи ──────────────────────────────────────────── */

const spreadCard = (line: string): NextCard => ({
  id: "spread",
  art: 2,
  tag: CREDITS_TAG,
  title: "Расклад таро на вопрос",
  line,
  action: { kind: "link", href: "/taro/rasklad", label: "Задать вопрос картам" },
});

const dayCard = (iso: string): NextCard => ({
  id: "day",
  art: 19,
  title: "Карта дня",
  line: "На эту дату каждый день выпадает своя карта. Сегодняшняя уже ждёт — в полночь по Москве её сменит другая.",
  action: { kind: "link", href: `/taro/${isoToUrlDate(iso)}`, label: "Открыть карту дня" },
});

const matrixCard = (iso: string): NextCard => ({
  id: "matrix",
  art: 10,
  title: "Матрица судьбы",
  line: "Двадцать два аркана и двенадцать сфер жизни, от денег до рода, — по той же дате рождения.",
  action: { kind: "link", href: readingPath("matrica", [iso]), label: "Открыть матрицу" },
});

const natalCard = (iso: string): NextCard => ({
  id: "natal",
  art: 17,
  title: "Натальная карта",
  line: "Где стояли планеты в момент рождения и что это говорит о характере, — по той же дате.",
  action: { kind: "link", href: chartPath("natal", iso), label: "Открыть карту" },
});

const mentorCard = (line: string): NextCard => ({
  id: "mentor",
  art: 5,
  title: "Наставник",
  line,
  action: { kind: "link", href: "/nastavnik", label: "Спросить наставника" },
});

const compatCard = (iso: string): NextCard => ({
  id: "pair",
  art: 6,
  title: "Совместимость с близким",
  line: "Введите дату второго человека — увидите, зачем вы встретились и где упираетесь друг в друга.",
  action: {
    kind: "date",
    label: "Смотреть пару",
    fieldLabel: "Дата рождения второго человека",
    pattern: `/sovmestimost/${isoToUrlDate(iso)}/{date}`,
  },
});

/** Личные разборы по этой дате, кроме того, что открыт сейчас. */
const OTHER_READINGS = ["dengi", "prednaznachenie", "detskaya", "karma", "zdorovie", "rod", "matrica"];

function otherReadingsCard(slug: string, iso: string): NextCard {
  const items = OTHER_READINGS.filter((s) => s !== slug)
    .slice(0, 3)
    .flatMap((s) => {
      const type = CALC_TYPES.find((t) => t.slug === s);
      return type ? [{ href: readingPath(s, [iso]), label: type.title }] : [];
    });
  return {
    id: "readings",
    art: 21,
    title: "Другие разборы по этой дате",
    line: "Та же дата, другой вопрос: у денег, предназначения и детства — свой отдельный разбор.",
    action: { kind: "links", items },
  };
}

/* ─── соседние даты ─────────────────────────────────────────────── */

export function dayShift(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Соседние даты той же системы и вход «по своей дате». */
function neighborsOf(path: (iso: string) => string, iso: string, own: NextLink): NextLink[] {
  const prev = dayShift(iso, -1);
  const next = dayShift(iso, 1);
  const inRange = (d: string) => chartUrlDateToIso(isoToChartUrlDate(d)) !== null;
  const out: NextLink[] = [];
  if (inRange(prev)) out.push({ href: path(prev), label: `← ${formatBirthDate(prev)}` });
  if (inRange(next)) out.push({ href: path(next), label: `${formatBirthDate(next)} →` });
  out.push(own);
  return out;
}

const systemLink = (system: ChartSystem, iso: string): NextLink => ({
  href: chartPath(system, iso),
  label: CHART_SYSTEMS[system].title,
});

const dayCardLink = (iso: string): NextLink => ({ href: `/taro/${isoToUrlDate(iso)}`, label: "Карта дня" });

/* ─── витрины по страницам ──────────────────────────────────────── */

/**
 * Личный разбор матрицы: совместимость с близким (поле даты в карточке),
 * другие разборы по этой дате, карта дня, расклад.
 */
export function matrixShowcase(slug: string, iso: string): NextShowcase {
  return {
    cards: [
      compatCard(iso),
      otherReadingsCard(slug, iso),
      dayCard(iso),
      spreadCard("Сформулируйте вопрос — карты выпадут прямо сейчас, а к каждой позиции будет разбор."),
    ],
    neighbors: [],
    also: [systemLink("natal", iso), systemLink("humandesign", iso), systemLink("numerology", iso)],
  };
}

/**
 * Разбор по двум датам: личные разборы каждого, другие парные разборы,
 * расклад об отношениях, наставник.
 *
 * `system` — какой взгляд открыт: личные разборы предлагаются в той же
 * системе (на синастрии — натальные карты, на композите — бодиграфы).
 * `slug` — какой парный разбор это сейчас: он не предлагается сам себе.
 */
export function pairShowcase({
  system,
  slug,
  dates,
}: {
  system: PairViewId;
  slug: "sovmestimost" | "mama-rebenok" | "biznes";
  dates: [string, string];
}): NextShowcase {
  const personal: Record<PairViewId, { title: string; label: string; href: (iso: string) => string }> = {
    synastry: { title: "Натальная карта каждого", label: "Натальная карта", href: (iso) => chartPath("natal", iso) },
    composite: { title: "Дизайн каждого", label: "Дизайн человека", href: (iso) => chartPath("humandesign", iso) },
    matrix: { title: "Матрица каждого", label: "Матрица", href: (iso) => readingPath("matrica", [iso]) },
  };
  const own = personal[system];

  const pairTypes = [
    { slug: "sovmestimost", label: "Совместимость" },
    { slug: "mama-rebenok", label: "Мама и ребёнок" },
    { slug: "biznes", label: "Бизнес-совместимость" },
  ];
  const others = pairTypes.filter((t) => t.slug !== slug);

  return {
    cards: [
      {
        id: "persons",
        art: 1,
        title: own.title,
        line: "Что каждый приносит в пару, видно по его личному разбору. Откройте оба — по одному на человека.",
        action: {
          kind: "links",
          items: dates.map((iso) => ({ href: own.href(iso), label: `${own.label} · ${formatDateDots(iso)}` })),
        },
      },
      {
        id: "pairs",
        art: 3,
        title: "Другие разборы этой пары",
        line: "Те же две даты под другим углом: как мама и ребёнок или как деловые партнёры.",
        action: { kind: "links", items: others.map((t) => ({ href: readingPath(t.slug, dates), label: t.label })) },
      },
      {
        ...spreadCard("Спросите карты о том, что между вами: пять позиций, от «вы в этих отношениях» до «что мешает»."),
        title: "Расклад на вопрос об этих отношениях",
        action: { kind: "link", href: "/taro/rasklad?vid=love", label: "Задать вопрос картам" },
      },
      mentorCard("Наставник видит числа обоих и отвечает на вопрос о вас двоих, а не на аркан вообще."),
    ],
    neighbors: [],
    also: [],
  };
}

/** Натальная карта и дизайн человека: второй человек, матрица по дате, расклад. */
export function chartShowcase(system: ChartSystem, iso: string): NextShowcase {
  const spread = spreadCard("Сформулируйте вопрос — карты выпадут прямо сейчас, а к каждой позиции будет разбор.");
  const neighbors = neighborsOf((d) => chartPath(system, d), iso, {
    href: `/${CHART_SYSTEMS[system].slug}`,
    label: "Посчитать по своей дате",
  });

  if (system === "natal") {
    return {
      cards: [
        {
          id: "pair",
          art: 6,
          title: "Синастрия со вторым человеком",
          line: "Введите его дату — увидите, где ваши карты поддерживают друг друга, а где задевают.",
          action: {
            kind: "date",
            label: "Смотреть синастрию",
            fieldLabel: "Дата рождения второго человека",
            pattern: `/sovmestimost/${isoToUrlDate(iso)}/{date}#sinastriya`,
          },
        },
        matrixCard(iso),
        spread,
      ],
      neighbors,
      also: [systemLink("humandesign", iso), systemLink("numerology", iso), dayCardLink(iso)],
    };
  }

  if (system === "humandesign") {
    return {
      cards: [
        {
          id: "pair",
          art: 6,
          title: "Композит со вторым человеком",
          line: "Введите его дату — увидите каналы, которые загораются только вдвоём, и центры, которых нет ни у кого поодиночке.",
          action: {
            kind: "date",
            label: "Смотреть композит",
            fieldLabel: "Дата рождения второго человека",
            pattern: `/sovmestimost/${isoToUrlDate(iso)}/{date}#kompozit`,
          },
        },
        matrixCard(iso),
        spread,
      ],
      neighbors,
      also: [systemLink("natal", iso), systemLink("numerology", iso), dayCardLink(iso)],
    };
  }

  // нумерология
  return {
    cards: [matrixCard(iso), natalCard(iso), spread],
    neighbors,
    also: [systemLink("humandesign", iso), dayCardLink(iso)],
  };
}

/** Карта дня: матрица по дате, натальная карта, расклад. */
export function tarotShowcase(iso: string): NextShowcase {
  return {
    cards: [
      matrixCard(iso),
      natalCard(iso),
      spreadCard("Карта дня отвечает на «что сегодня». На свой вопрос — расклад: карты выпадают заново каждый раз."),
    ],
    neighbors: neighborsOf((d) => `/taro/${isoToUrlDate(d)}`, iso, { href: "/taro", label: "Посчитать по своей дате" }),
    also: [systemLink("humandesign", iso), systemLink("numerology", iso)],
  };
}
