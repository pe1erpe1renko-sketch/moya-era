/**
 * ЗАМОК — ОДИН НА ВЕСЬ САЙТ: ПРОДАЁМ ПОДПИСКУ ЦЕЛИКОМ.
 *
 * Отдельных разборов на продажу нет. Где бы человек ни упёрся в замок —
 * в матрице, натальной карте, бодиграфе, нумерологии, карте дня, разборе
 * пары, кабинете, — он видит одно и то же: «Подписка открывает всё»,
 * короткий список и одну кнопку «Открыть всё». Первая строка списка —
 * про то место, где он сейчас («весь этот разбор: 12 сфер, 92 вопроса»),
 * остальные — про всё остальное: другие системы, близкие, карта дня,
 * сводка в Telegram, наставник.
 *
 * Здесь — только слова и числа: чистые функции, чтобы список, цену и
 * строки тарифов можно было проверить тестом. Цена и объёмы приходят
 * из таблицы `plans` (в демо — запасные значения из `plansDefault`),
 * поэтому «от N ₽ в месяц» и «1, 5 или без ограничений» меняются без
 * деплоя.
 *
 * Запрещено навсегда: зачёркнутые цены, таймеры, «осталось N мест».
 * Тест ниже это проверяет на каждой строке, которую отдаёт модуль.
 */

import type { Plan } from "@/lib/backend";
import { BOT_LIMITS } from "@/lib/bot/limits";
import { formatRub } from "@/lib/plansDefault";

/** Почему закрыто: нет подписки / этот человек не в списке / не вошёл. */
export type LockReason = "no_subscription" | "person_not_added" | "not_logged_in";

/** Где стоит замок — от этого зависит первая строка списка. */
export type LockSystem =
  | "matrix"
  | "natal"
  | "hd"
  | "numerology"
  | "daycard"
  | "pair"
  | "image"
  | "bot"
  | "people"
  | "cabinet";

/** Сколько сфер и вопросов в разборе, у которого стоит замок (матрица). */
export type LockCounts = { spheres: number; questions: number };

export type LockItem = {
  id: "here" | "systems" | "people" | "daycard" | "bot" | "mentor";
  /** номер аркана для маленькой иллюстрации */
  art: number;
  text: string;
  /** первая строка: то место, где человек сейчас */
  here?: boolean;
};

/** Шесть систем — в том порядке и с теми иллюстрациями, что на витрине. */
export const SYSTEMS: Array<{ id: "matrix" | "natal" | "hd" | "numerology" | "tarot" | "pair"; title: string; art: number }> = [
  { id: "matrix", title: "матрица судьбы", art: 10 },
  { id: "natal", title: "натальная карта", art: 17 },
  { id: "hd", title: "дизайн человека", art: 11 },
  { id: "numerology", title: "нумерология", art: 8 },
  { id: "tarot", title: "таро", art: 19 },
  { id: "pair", title: "совместимость", art: 6 },
];

const ART = { systems: 21, people: 3, daycard: 19, bot: 1, mentor: 5, image: 14 } as const;

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** «1, 5 или без ограничений» — из тарифов, а не из головы. */
function joinOr(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} или ${parts[parts.length - 1]}`;
}

/** Сколько людей открывают тарифы: «1, 5 или без ограничений». */
export function peopleSpan(plans: Plan[]): string {
  const finite = [...new Set(plans.map((p) => p.max_people).filter((n): n is number => typeof n === "number" && n > 0))].sort((a, b) => a - b);
  const parts = finite.map(String);
  if (plans.some((p) => p.max_people === null)) parts.push("без ограничений");
  return parts.length ? joinOr(parts) : "сколько — по тарифу";
}

/** Сколько кредитов в месяц дают тарифы: «30, 100 или 300». */
export function creditsSpan(plans: Plan[]): string {
  const values = [...new Set(plans.map((p) => p.monthly_credits).filter((n) => n > 0))].sort((a, b) => a - b);
  return values.length ? joinOr(values.map(String)) : "";
}

/** Самая низкая цена месяца среди тарифов. null — тарифов нет. */
export function fromPrice(plans: Plan[]): number | null {
  const prices = plans.map((p) => p.price_month).filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** «от 590 ₽ в месяц» — или пусто, если тарифы ещё не пришли. */
export function fromPriceLine(plans: Plan[]): string {
  const price = fromPrice(plans);
  return price === null ? "" : `от ${formatRub(price)} в месяц`;
}

/** Первая строка списка: то место, где человек сейчас. */
export function hereLine(system: LockSystem, counts?: LockCounts): string | null {
  switch (system) {
    case "matrix":
      return counts && counts.questions > 0
        ? `Весь этот разбор: ${counts.spheres} ${plural(counts.spheres, "сфера", "сферы", "сфер")}, ${counts.questions} ${plural(counts.questions, "вопрос", "вопроса", "вопросов")}`
        : "Весь этот разбор целиком — каждый вопрос в каждой сфере";
    case "natal":
      return "Вся эта карта: все планеты, дома и аспекты";
    case "hd":
      return "Весь этот бодиграф: авторитет, профиль, каналы и ворота";
    case "numerology":
      return "Весь этот разбор: каждое число подробно и девять ячеек квадрата";
    case "daycard":
      return "Карта дня на фоне вашей карты рождения — и история за все дни";
    case "pair":
      return "Все три взгляда на пару целиком: матрица, синастрия, композит";
    case "image":
      return "Своя страница со ссылкой у каждой карточки образа";
    case "bot":
      return "Сводка в Telegram по вашим людям";
    case "people":
    case "cabinet":
      return null;
  }
}

/** Какой из шести систем принадлежит место с замком. */
function systemOf(system: LockSystem): (typeof SYSTEMS)[number]["id"] | null {
  if (system === "daycard") return "tarot";
  if (system === "matrix" || system === "natal" || system === "hd" || system === "numerology" || system === "pair") return system;
  return null;
}

function hereArt(system: LockSystem): number {
  const own = systemOf(system);
  if (own) return SYSTEMS.find((s) => s.id === own)?.art ?? ART.systems;
  if (system === "image") return ART.image;
  if (system === "bot") return ART.bot;
  return ART.people;
}

/**
 * Список замка: первая строка — где человек сейчас, дальше — всё
 * остальное. Строка, которую первая уже покрывает (карта дня в карте
 * дня, сводка в панели бота, близкие в списке людей), второй раз не
 * повторяется.
 */
export function lockItems(system: LockSystem, plans: Plan[], counts?: LockCounts): LockItem[] {
  const own = systemOf(system);
  const others = SYSTEMS.filter((s) => s.id !== own).map((s) => s.title);
  const items: LockItem[] = [];

  const here = hereLine(system, counts);
  if (here) items.push({ id: "here", art: hereArt(system), text: here, here: true });

  items.push({
    id: "systems",
    art: ART.systems,
    text: own ? `Ещё пять систем по этой дате: ${others.join(", ")}` : `Все шесть систем: ${others.join(", ")}`,
  });

  const people = `Разборы близких — ${peopleSpan(plans)}, по тарифу`;
  if (system === "people") items.unshift({ id: "people", art: ART.people, text: people, here: true });
  else items.push({ id: "people", art: ART.people, text: people });

  if (system !== "daycard") items.push({ id: "daycard", art: ART.daycard, text: "Карта дня каждый день — и история за все дни" });
  if (system !== "bot") items.push({ id: "bot", art: ART.bot, text: "Сводка в Telegram по вашим людям" });

  const credits = creditsSpan(plans);
  items.push({
    id: "mentor",
    art: ART.mentor,
    text: credits ? `Наставник и расклады таро: ${credits} кредитов в месяц, по тарифу` : "Наставник и расклады таро — кредиты в каждом тарифе",
  });

  return items;
}

/* ── Тарифы ───────────────────────────────────────────────────────── */

/** Что одинаково в каждом тарифе. Отличия — только люди и кредиты. */
export const PLAN_COMMON: string[] = [
  "Все шесть систем: матрица судьбы, натальная карта, дизайн человека, нумерология, таро, совместимость",
  "Все типы разбора и каждый вопрос в каждом — без замков",
  "Карта дня каждый день и история за все дни",
  "Сводка в Telegram по вашим людям",
  "Архив: разборы, расклады и образы остаются в кабинете",
];

export type PlanRow = { id: "people" | "bot" | "credits"; label: string; value: string };

/** Чем тариф отличается от других: люди на сайте, люди в боте, кредиты. */
export function planRows(plan: Plan): PlanRow[] {
  const rows: PlanRow[] = [
    {
      id: "people",
      label: "Людей на сайте",
      value: plan.max_people === null ? "без ограничений" : plan.max_people === 1 ? "1 — вы" : `${plan.max_people} — вы и близкие`,
    },
  ];
  const bot = BOT_LIMITS[plan.id];
  if (bot !== undefined) rows.push({ id: "bot", label: "Людей в Telegram-боте", value: String(bot) });
  rows.push({ id: "credits", label: "Кредитов в месяц", value: String(plan.monthly_credits) });
  return rows;
}

/**
 * Тарифы, где людей больше, чем в текущем: «Семейный» — до 5 человек;
 * «Практик» — без ограничений. Пусто, если больше некуда.
 */
export function biggerPlansLine(plans: Plan[], currentId: string | null): string {
  const current = plans.find((p) => p.id === currentId);
  const limit = current ? (current.max_people === null ? Infinity : current.max_people) : 0;
  const bigger = plans.filter((p) => (p.max_people === null ? Infinity : p.max_people) > limit).sort((a, b) => a.sort - b.sort);
  return bigger.map((p) => `«${p.title}» — ${p.max_people === null ? "без ограничений" : `до ${p.max_people} ${plural(p.max_people, "человека", "человек", "человек")}`}`).join("; ");
}
