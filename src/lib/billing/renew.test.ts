/**
 * Автопродление: сроки, повторы, границы периода и идемпотентность.
 *
 * Смысл проверок. Здесь речь о чужих деньгах, снимаемых без человека, и
 * ломается это в четырёх местах, ни одно из которых не видно глазами:
 *
 *   — двойное списание. Повторный запуск задачи не должен создать второй
 *     платёж. Держится на ключе идемпотентности: один ключ на попытку.
 *   — граница периода. Отсчёт от дня платежа (а платим за день до конца)
 *     воровал бы сутки на каждом продлении; `setMonth` из 31 января
 *     делает 3 марта.
 *   — слишком раннее отключение. Одна неудача — не повод отбирать
 *     оплаченное: сначала повторы, и только потом бесплатный режим.
 *   — предупреждение задним числом. Оно обязано уходить ДО списания.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  addMonths,
  insideRenewWindow,
  RENEW_WINDOW_DAYS,
  CHARGE_LEAD_DAYS,
  dateLabel,
  dueForCharge,
  dueForWarning,
  failureText,
  givingUp,
  MAX_ATTEMPTS,
  nextAttemptAt,
  nextPeriodEnd,
  renewAmount,
  renewCredits,
  renewalKey,
  RETRY_DELAY_DAYS,
  warningText,
  WARN_LEAD_DAYS,
  type RenewableSubscription,
} from "./renew";
import { CREDIT_REASONS } from "../creditReasons";

const DAY = 86_400_000;
const END = new Date("2026-10-01T12:00:00.000Z");

function sub(patch: Partial<RenewableSubscription> = {}): RenewableSubscription {
  return {
    id: "s1",
    userId: "u1",
    planId: "family",
    period: "month",
    periodEnd: END,
    autoRenew: true,
    paymentMethodId: "pm_1",
    warnedFor: null,
    anchorDay: END.getUTCDate(),
    ...patch,
  };
}

const daysBefore = (n: number) => new Date(END.getTime() - n * DAY);

/* ─── когда списывать ────────────────────────────────────────────── */

describe("списание — за день до конца периода", () => {
  it("за два дня ещё рано, за день уже пора", () => {
    assert.equal(CHARGE_LEAD_DAYS, 1);
    assert.equal(dueForCharge(sub(), daysBefore(2)), false);
    assert.equal(dueForCharge(sub(), daysBefore(1)), true);
    assert.equal(dueForCharge(sub(), daysBefore(0.5)), true);
  });

  it("после конца периода — тем более пора: идут повторы", () => {
    assert.equal(dueForCharge(sub(), new Date(END.getTime() + 2 * DAY)), true);
  });

  it("давно кончившуюся подписку не списываем", () => {
    // Самое дорогое из возможного здесь: задача забирает все подписки со
    // статусом «active», у которых период прошёл, и списывает со всех.
    // Статус после конца периода сам собой не меняется — доступ
    // считается по дате, — так что таких строк со временем накапливается
    // сколько угодно.
    assert.equal(RENEW_WINDOW_DAYS, 6, "окно = день до конца + повторы через 1 и 3 дня + сутки запаса");
    assert.equal(dueForCharge(sub(), new Date(END.getTime() + 4 * DAY)), true, "четвёртый день — ещё повтор");
    assert.equal(dueForCharge(sub(), new Date(END.getTime() + 30 * DAY)), false, "месяц спустя — уже нет");
    assert.equal(dueForCharge(sub(), new Date(END.getTime() + 200 * DAY)), false, "и подавно");
  });

  it("окно кончается позже последней попытки", () => {
    // Иначе третья попытка выпала бы из выборки и человек остался бы
    // недопродлённым без единого сообщения.
    const lastAttempt = 1 + RETRY_DELAY_DAYS.reduce((a, b) => a + b, 0) - 1;
    assert.ok(RENEW_WINDOW_DAYS > lastAttempt, `окно ${RENEW_WINDOW_DAYS} дн., последняя попытка на ${lastAttempt}-й`);
    assert.ok(insideRenewWindow(END, new Date(END.getTime() + lastAttempt * DAY)));
  });

  it("автопродление выключено — не списываем никогда", () => {
    assert.equal(dueForCharge(sub({ autoRenew: false }), daysBefore(0)), false);
  });

  it("способа оплаты нет — не списываем и не притворяемся", () => {
    // Без сохранённой карты звать банк не с чем. Молча «пытаться» —
    // значит копить отказы и отключить человека ни за что.
    assert.equal(dueForCharge(sub({ paymentMethodId: null }), daysBefore(0)), false);
  });
});

/* ─── предупреждение ─────────────────────────────────────────────── */

describe("предупреждение уходит до списания", () => {
  it("предупреждаем раньше, чем списываем", () => {
    assert.ok(WARN_LEAD_DAYS > CHARGE_LEAD_DAYS, "иначе это уведомление задним числом");
  });

  it("за четыре дня рано, за три пора", () => {
    assert.equal(dueForWarning(sub(), daysBefore(4)), false);
    assert.equal(dueForWarning(sub(), daysBefore(3)), true);
  });

  it("в день списания человек уже предупреждён", () => {
    // Между предупреждением и деньгами должно остаться время отказаться.
    const warnAt = daysBefore(WARN_LEAD_DAYS);
    const chargeAt = daysBefore(CHARGE_LEAD_DAYS);
    assert.ok(dueForWarning(sub(), warnAt));
    assert.ok(chargeAt.getTime() - warnAt.getTime() >= DAY, "меньше суток на решение — это не предупреждение");
  });

  it("второй раз про тот же период не пишем", () => {
    assert.equal(dueForWarning(sub({ warnedFor: END }), daysBefore(1)), false);
  });

  it("продлили — предупреждаем заново про новый конец периода", () => {
    // Отметка привязана к концу периода, а не к дате отправки: сдвинулся
    // период — отметка перестала совпадать, и следующее предупреждение
    // уйдёт как первое.
    const next = nextPeriodEnd(END, "month");
    const after = sub({ periodEnd: next, warnedFor: END });
    assert.equal(dueForWarning(after, new Date(next.getTime() - 2 * DAY)), true);
  });

  it("в тексте есть сумма, день и как отказаться", () => {
    const text = warningText({ planTitle: "Семейный", amount: 590, periodEnd: END, siteUrl: "https://example.com" });
    assert.ok(text.includes("590 ₽"), "нет суммы");
    assert.ok(text.includes(dateLabel(END)), "нет дня списания");
    assert.ok(/выключите автопродление/i.test(text), "не сказано, как отказаться");
    assert.ok(text.includes("https://example.com/cabinet"), "некуда идти отключать");
    assert.ok(/до конца оплаченного периода/.test(text), "не сказано, что оплаченное остаётся");
  });
});

/* ─── повторы и отключение ───────────────────────────────────────── */

describe("неудача не отключает сразу", () => {
  it("после первой — через день, после второй — через три", () => {
    assert.deepEqual([...RETRY_DELAY_DAYS], [1, 3]);
    const now = new Date("2026-10-01T00:00:00.000Z");
    assert.equal(nextAttemptAt(1, now)?.toISOString(), "2026-10-02T00:00:00.000Z");
    assert.equal(nextAttemptAt(2, now)?.toISOString(), "2026-10-04T00:00:00.000Z");
  });

  it("после третьей повторов нет", () => {
    assert.equal(nextAttemptAt(3, new Date()), null);
    assert.equal(MAX_ATTEMPTS, 3);
  });

  it("сдаёмся только на третьей", () => {
    assert.equal(givingUp(1), false);
    assert.equal(givingUp(2), false);
    assert.equal(givingUp(3), true);
  });

  it("в сообщении о неудаче не пугаем и не отбираем", () => {
    const text = failureText({ planTitle: "Семейный", periodEnd: END, siteUrl: "https://example.com" });
    assert.ok(/Деньги не списаны/.test(text), "человек должен знать, что с него не взяли");
    assert.ok(/осталось открытым/.test(text), "не сказано, что открытое осталось");
    assert.ok(text.includes("https://example.com/tarify"), "некуда вернуться");
    assert.ok(!/заблокир|удал|сгор/i.test(text), "пугающие слова в письме о неудаче");
  });
});

/* ─── граница периода ────────────────────────────────────────────── */

describe("новый период считается от старого конца", () => {
  it("месяц прибавляется к концу периода, а не ко дню платежа", () => {
    // Платим за день до конца. Отсчёт от дня платежа отнимал бы сутки
    // каждый раз: за год — почти две недели чужого времени.
    assert.equal(nextPeriodEnd(new Date("2026-10-01T12:00:00Z"), "month").toISOString(), "2026-11-01T12:00:00.000Z");
  });

  it("год — это двенадцать месяцев", () => {
    assert.equal(nextPeriodEnd(new Date("2026-03-15T09:00:00Z"), "year").toISOString(), "2027-03-15T09:00:00.000Z");
  });

  it("31 января плюс месяц — 28 февраля, а не 3 марта", () => {
    // Обычный setMonth «перетекает» через несуществующее 31 февраля.
    assert.equal(addMonths(new Date("2026-01-31T10:00:00Z"), 1).toISOString(), "2026-02-28T10:00:00.000Z");
    assert.equal(addMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString(), "2028-02-29T10:00:00.000Z");
    assert.equal(addMonths(new Date("2026-05-31T10:00:00Z"), 1).toISOString(), "2026-06-30T10:00:00.000Z");
  });

  it("двенадцать продлений с 31-го числа не уползают", () => {
    // Прижатие к концу месяца не должно накапливаться: без якоря
    // 31 января после февраля навсегда съезжает на 28-е и человек теряет
    // по три дня в год.
    let d = new Date("2026-01-31T10:00:00Z");
    for (let i = 0; i < 12; i++) d = nextPeriodEnd(d, "month", 31);
    assert.equal(d.toISOString(), "2027-01-31T10:00:00.000Z");
  });

  it("без якоря прижатие остаётся навсегда — потому якорь и нужен", () => {
    // Это не описание желаемого, а причина, по которой у продления есть
    // якорный день: 31 января → 28 февраля → 28 марта.
    const feb = nextPeriodEnd(new Date("2026-01-31T10:00:00Z"), "month");
    assert.equal(feb.toISOString(), "2026-02-28T10:00:00.000Z");
    assert.equal(nextPeriodEnd(feb, "month").toISOString(), "2026-03-28T10:00:00.000Z");
    assert.equal(nextPeriodEnd(feb, "month", 31).toISOString(), "2026-03-31T10:00:00.000Z");
  });

  it("продление всегда двигает период вперёд", () => {
    for (const iso of ["2026-01-31T10:00:00Z", "2026-02-28T00:00:00Z", "2026-12-31T23:00:00Z"]) {
      const from = new Date(iso);
      assert.ok(nextPeriodEnd(from, "month").getTime() > from.getTime(), iso);
    }
  });
});

/* ─── идемпотентность ────────────────────────────────────────────── */

describe("ключ идемпотентности", () => {
  it("одна попытка — один ключ", () => {
    // Повторный запуск задачи отдаёт ЮKassa тот же ключ, и она
    // возвращает уже созданный платёж вместо второго списания.
    assert.equal(renewalKey("s1", END, 1), renewalKey("s1", END, 1));
  });

  it("новая попытка — новый ключ", () => {
    // Иначе повтор после отказа вернул бы тот же отказ.
    assert.notEqual(renewalKey("s1", END, 1), renewalKey("s1", END, 2));
  });

  it("разные подписки и разные периоды не путаются", () => {
    assert.notEqual(renewalKey("s1", END, 1), renewalKey("s2", END, 1));
    assert.notEqual(renewalKey("s1", END, 1), renewalKey("s1", nextPeriodEnd(END, "month"), 1));
  });

  it("ключ не зависит от времени запуска", () => {
    // Ключ из даты «сейчас» означал бы новый платёж на каждом запуске.
    assert.ok(!renewalKey("s1", END, 1).includes(String(new Date().getFullYear() + 1)));
    assert.equal(renewalKey("s1", END, 1), `renew:s1:${END.toISOString()}:1`);
  });
});

/* ─── деньги ─────────────────────────────────────────────────────── */

describe("сколько списывать и сколько начислять", () => {
  const plan = { price_month: 590, price_year: 4900, monthly_credits: 30 };

  it("списывается цена продлеваемого периода", () => {
    assert.equal(renewAmount(plan, "month"), 590);
    assert.equal(renewAmount(plan, "year"), 4900);
  });

  it("кредиты начисляются за весь оплаченный период", () => {
    assert.equal(renewCredits(plan, "month"), 30);
    assert.equal(renewCredits(plan, "year"), 360);
  });
});

/* ─── причины в журнале кредитов ─────────────────────────────────── */

describe("причины движения кредитов совпадают с ограничением базы", () => {
  it("список в коде равен последнему CHECK в миграциях", () => {
    // Строка, которой нет в ограничении, не запишется вовсе: списание
    // вернёт ошибку, а человек останется без того, за что заплатил.
    // Ровно так и вышло с раскладами.
    const dir = path.resolve(process.cwd(), "supabase/migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

    let last: string[] | null = null;
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      const matches = [...sql.matchAll(/reason\s+IN\s*\(([^)]*)\)/gi)];
      const withDelta = matches.filter((m) => /'plan_grant'/.test(m[1]));
      if (withDelta.length) {
        last = [...withDelta[withDelta.length - 1][1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
      }
    }

    assert.ok(last, "в миграциях не нашлось ограничения на причину");
    assert.deepEqual([...last].sort(), [...CREDIT_REASONS].sort());
  });
});
