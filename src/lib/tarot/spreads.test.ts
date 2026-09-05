/**
 * Живой расклад: колода, цены, промпт и блок безопасности.
 *
 * Смысл проверок. Расклад — единственное место таро, где человек платит
 * кредитами за текст, написанный на лету. Ломается это незаметно в трёх
 * местах:
 *
 *   — раздача. Повтор карты в раскладе или предсказуемый порядок делают
 *     подделкой то, за что заплатили. Заметить глазами нельзя.
 *   — цена. Она лежит в базе, а в коде запасная. Разойдутся — человек
 *     увидит одну цифру, а спишется другая.
 *   — блок безопасности. Он скопирован из промпта наставника, и копия
 *     умеет расходиться с оригиналом молча. Сюда приходят с тяжёлыми
 *     вопросами чаще, чем куда-либо ещё на сайте, и цена расхождения —
 *     не опечатка.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MENTOR_SYSTEM_PROMPT } from "../matrix/prompts";
import {
  buildSpreadPrompt,
  buildSpreadRequest,
  DECK_SIZE,
  drawCards,
  findSpread,
  isSpreadCode,
  SAFETY_BLOCK,
  SPREADS,
  SPREAD_CODE_LENGTH,
  SPREAD_SYSTEM_PROMPT,
  spreadPath,
  spreadSize,
  type SpreadKind,
} from "./index";
import { arcanaName } from "../matrix";
import { arcanaImage } from "../arcanaImage";

const three = findSpread("three") as SpreadKind;
const big = findSpread("big") as SpreadKind;

/* ─── блок безопасности ──────────────────────────────────────────── */

describe("блок безопасности перенесён из промпта наставника целиком", () => {
  it("совпадает с оригиналом посимвольно", () => {
    // Оригинал лежит в закрытом `lib/matrix/prompts.js`, править который
    // нельзя. Значит, копия — и значит, сверка: тронут блок там, упадёт
    // здесь, а не когда-нибудь у человека, которому плохо.
    assert.ok(
      MENTOR_SYSTEM_PROMPT.includes(SAFETY_BLOCK),
      "блок безопасности расклада разошёлся с блоком наставника — сверьте их дословно",
    );
  });

  it("перенесён без сокращений", () => {
    // Четыре указания подряд: прекратить трактовки, говорить
    // по-человечески, отправить к живому, не изображать терапевта.
    // Выкинуть одно — и блок перестаёт работать там, где он нужен.
    const required = [
      "ЕСЛИ ЧЕЛОВЕКУ ПЛОХО",
      "немедленно прекрати любые трактовки Арканов",
      "Признай, что ему тяжело",
      "поговорить с живым человеком",
      "Не бери на себя роль психолога",
    ];
    for (const line of required) {
      assert.ok(SAFETY_BLOCK.includes(line), `из блока пропало: ${line}`);
    }
    assert.equal(SAFETY_BLOCK.split("\n").length, 5, "в блоке пять строк, как в оригинале");
  });

  it("стоит в системном промпте расклада", () => {
    assert.ok(SPREAD_SYSTEM_PROMPT.includes(SAFETY_BLOCK));
  });
});

/* ─── чего расклад не делает ─────────────────────────────────────── */

describe("промпт запрещает предсказывать события", () => {
  it("говорит об этом прямо", () => {
    assert.ok(SPREAD_SYSTEM_PROMPT.includes("НЕ ПРЕДСКАЗЫВАЙ СОБЫТИЯ"));
    assert.ok(SPREAD_SYSTEM_PROMPT.includes("как посмотреть на ситуацию, а не что случится"));
  });

  it("запрещает сроки, диагнозы и денежные советы", () => {
    for (const rule of ["Не называй сроков", "Не ставь диагнозов", "не говори, куда вкладывать деньги"]) {
      assert.ok(SPREAD_SYSTEM_PROMPT.includes(rule), `в промпте нет запрета: ${rule}`);
    }
  });

  it("запрещает описывать рисунок карты и markdown", () => {
    // Рисунок описывать нечем: иллюстрации у нас свои, и модель их не
    // видела. Markdown — потому что страница показывает обычный текст.
    assert.ok(SPREAD_SYSTEM_PROMPT.includes("Не описывай рисунок карты"));
    assert.ok(SPREAD_SYSTEM_PROMPT.includes("Не используй markdown"));
  });
});

/* ─── колода ─────────────────────────────────────────────────────── */

describe("колода — 22 старших аркана", () => {
  it("столько же, сколько иллюстраций", () => {
    assert.equal(DECK_SIZE, 22);
    // Младшие не заводим: без картинок они выглядели бы бедно рядом с
    // остальным сайтом. Проверка держит это решение: появятся 56 младших
    // без иллюстраций — тест напомнит, что сначала картинки.
    for (let n = 1; n <= DECK_SIZE; n++) {
      const file = path.resolve(process.cwd(), `public${arcanaImage(n, "full")}`);
      assert.ok(fs.existsSync(file), `нет иллюстрации аркана ${n}`);
    }
  });

  it("у каждого аркана колоды есть название", () => {
    for (let n = 1; n <= DECK_SIZE; n++) {
      assert.ok(arcanaName(n).length > 0);
    }
  });
});

describe("раздача карт", () => {
  it("в раскладе нет повторов", () => {
    // Худший из незаметных сбоев: две одинаковые карты в одном раскладе.
    // Текст при этом пишется как ни в чём не бывало.
    for (let seed = 0; seed < 500; seed++) {
      const cards = drawCards(big, deterministic(seed));
      const unique = new Set(cards.map((c) => c.arcanum));
      assert.equal(unique.size, big.positions.length, "карта выпала дважды");
    }
  });

  it("тянет ровно столько карт, сколько мест в раскладе, и в том же порядке", () => {
    for (const spread of SPREADS) {
      const cards = drawCards(spread, deterministic(7));
      assert.equal(cards.length, spread.positions.length);
      assert.equal(cards.length, spreadSize(spread.id));
      assert.deepEqual(
        cards.map((c) => c.position.id),
        spread.positions.map((p) => p.id),
      );
    }
  });

  it("все карты — из колоды", () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const c of drawCards(three, deterministic(seed))) {
        assert.ok(c.arcanum >= 1 && c.arcanum <= DECK_SIZE, `аркан вне колоды: ${c.arcanum}`);
      }
    }
  });

  it("случайность берётся только у переданного источника", () => {
    // Ни `Math.random`, ни времени, ни счётчика внутри: раздача целиком
    // определяется тем, что дал источник. Иначе её нельзя ни проверить,
    // ни доверить криптостойкому генератору снаружи.
    const first = drawCards(big, deterministic(42));
    const second = drawCards(big, deterministic(42));
    assert.deepEqual(first, second);
  });

  it("источник спрашивают ровно столько раз, сколько нужно", () => {
    // Два обращения на карту: какую взять и как положить. Лишние
    // обращения — признак того, что кто-то дотянулся до генератора
    // мимо раздачи.
    let calls = 0;
    const counting = (max: number) => {
      calls++;
      assert.ok(max > 0, "у источника просят число из пустого промежутка");
      return 0;
    };
    drawCards(big, counting);
    assert.equal(calls, big.positions.length * 2);
  });

  it("каждое число источника даёт свою карту — и на первом месте, и на втором", () => {
    // Точная проверка вместо статистики: перебираем все числа, какие
    // источник может дать, и смотрим, что раздача разложила их в разные
    // карты один к одному. Сужен промежуток («сколько осталось» вместо
    // «сколько всего») — и совпадения появятся здесь, а не в жалобе.
    const first = new Set<number>();
    for (let v = 0; v < DECK_SIZE; v++) {
      const [card] = drawCards(three, fixed([v]));
      assert.equal(card.arcanum, v + 1);
      first.add(card.arcanum);
    }
    assert.equal(first.size, DECK_SIZE, "часть карт не может лечь первой");

    const second = new Set<number>();
    for (let v = 0; v < DECK_SIZE - 1; v++) {
      // Сначала перемешивание по всем местам, потом «прямая или
      // перевёрнутая» на каждое: второе число — выбор второй карты.
      const cards = drawCards(three, fixed([0, v]));
      assert.equal(cards[0].arcanum, 1, "выбор второй карты сдвинул первую");
      assert.equal(cards[1].arcanum, v + 2);
      second.add(cards[1].arcanum);
    }
    assert.equal(second.size, DECK_SIZE - 1, "на второе место ложится не вся оставшаяся колода");
  });

  it("выдаёт каждую карту колоды, а не любимую дюжину", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 3000; seed++) {
      for (const c of drawCards(three, deterministic(seed))) seen.add(c.arcanum);
    }
    assert.equal(seen.size, DECK_SIZE, "часть колоды не выпадает никогда");
  });

  it("перевёрнутых примерно половина", () => {
    // Перевёрнутая карта читается иначе прямой. Перекос в любую сторону
    // означает, что половина колоды работает не так, как обещано.
    let reversed = 0;
    let total = 0;
    for (let seed = 0; seed < 4000; seed++) {
      for (const c of drawCards(three, deterministic(seed))) {
        total++;
        if (c.reversed) reversed++;
      }
    }
    const share = reversed / total;
    assert.ok(share > 0.45 && share < 0.55, `перевёрнутых ${(share * 100).toFixed(1)}%`);
  });
});

/* ─── цены ───────────────────────────────────────────────────────── */

describe("цены раскладов", () => {
  it("запасные цены в коде — те, что заказаны", () => {
    assert.deepEqual(
      SPREADS.map((s) => [s.id, s.positions.length, s.credits]),
      [
        ["one", 1, 1],
        ["three", 3, 3],
        ["love", 5, 4],
        ["big", 10, 7],
      ],
    );
  });

  it("миграция засевает те же цены и то же число карт", () => {
    // Настоящие цены живут в базе и меняются UPDATE-ом без деплоя.
    // Запасные в коде нужны, пока таблица пуста, — и если они разойдутся
    // с засеянными, человек увидит одну цифру, а спишется другая.
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20260907000000_spreads.sql"),
      "utf8",
    );
    for (const s of SPREADS) {
      const row = new RegExp(`\\('${s.id}',\\s*'[^']+',\\s*(\\d+),\\s*(\\d+),`).exec(sql);
      assert.ok(row, `в миграции нет строки для «${s.id}»`);
      assert.equal(Number(row[1]), s.positions.length, `${s.id}: разное число карт`);
      assert.equal(Number(row[2]), s.credits, `${s.id}: цена в миграции не совпала с запасной`);
    }
  });

  it("бесплатных раскладов нет", () => {
    // Бесплатное в таро уже есть — карта дня. Расклад платный, и нулевая
    // цена означала бы раздачу вызовов модели даром.
    for (const s of SPREADS) assert.ok(s.credits >= 1, `${s.id} стоит ${s.credits}`);
  });
});

/* ─── адрес ──────────────────────────────────────────────────────── */

describe("адрес расклада", () => {
  it("складывается из кода", () => {
    assert.equal(spreadPath("k7m2q9xw4tzp"), "/rasklad/k7m2q9xw4tzp");
  });

  it("код — двенадцать знаков из алфавита без похожих", () => {
    assert.equal(SPREAD_CODE_LENGTH, 12);
    assert.ok(isSpreadCode("k7m2q9xw4tzp"));
    assert.ok(!isSpreadCode("k7m2q9xw4tz"), "одиннадцать знаков — не код");
    assert.ok(!isSpreadCode("K7M2Q9XW4TZP"), "заглавных в алфавите нет");
    assert.ok(!isSpreadCode("k7m2q9xw4tz0"), "ноль и единицу в алфавит не берут");
    assert.ok(!isSpreadCode("../../../etc/"), "в код не проходит путь");
  });
});

/* ─── запрос к модели ────────────────────────────────────────────── */

describe("запрос к модели", () => {
  const cards = [
    { arcanum: 9, name: arcanaName(9), reversed: true, position: "Препятствие" },
    { arcanum: 3, name: arcanaName(3), reversed: false, position: "Совет" },
  ];

  it("несёт вопрос человека дословно", () => {
    const question = "Стоит ли мне уходить с работы, если я не понимаю, чего хочу";
    const text = buildSpreadPrompt({ kind: "spread", spread: "Три карты", question, cards });
    assert.ok(text.includes(question), "вопрос дошёл до модели изменённым");
  });

  it("называет каждую карту, её место и то, что она перевёрнута", () => {
    const text = buildSpreadPrompt({ kind: "spread", spread: "Три карты", question: "как быть", cards });
    assert.ok(text.includes(`Препятствие: 9, ${arcanaName(9)}, перевёрнутая`));
    assert.ok(text.includes(`Совет: 3, ${arcanaName(3)}`));
    assert.ok(!text.includes(`Совет: 3, ${arcanaName(3)}, перевёрнутая`), "прямая карта названа перевёрнутой");
  });

  it("большому раскладу даёт больше места", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      arcanum: i + 1,
      name: arcanaName(i + 1),
      reversed: false,
      position: `Место ${i + 1}`,
    }));
    const small = buildSpreadRequest({ kind: "spread", spread: "Три карты", question: "как быть", cards });
    const large = buildSpreadRequest({ kind: "spread", spread: "Большой расклад", question: "как быть", cards: ten });
    assert.ok(large.maxTokens > small.maxTokens, "десять карт не поместятся в объём трёх");
  });

  it("системный промпт один и тот же, чем бы ни спрашивали", () => {
    const a = buildSpreadRequest({ kind: "spread", spread: "Одна карта", question: "а", cards: cards.slice(0, 1) });
    const b = buildSpreadRequest({ kind: "spread", spread: "Большой расклад", question: "б", cards });
    assert.equal(a.system, b.system);
    assert.equal(a.system, SPREAD_SYSTEM_PROMPT);
  });
});

/* ─── детерминированный источник для проверок ────────────────────── */

/** Источник, отдающий заранее назначенные числа. Дальше — нули. */
function fixed(values: number[]): (max: number) => number {
  let i = 0;
  return () => values[i++] ?? 0;
}

/**
 * Псевдослучайный источник с зерном: в бою вместо него `crypto.randomInt`.
 * Нужен, чтобы раздачу можно было повторить и сравнить.
 */
function deterministic(seed: number): (max: number) => number {
  let state = (seed + 1) * 2_654_435_761;
  return (max: number) => {
    state = (state * 1_103_515_245 + 12_345) & 0x7fffffff;
    return Math.floor((state / 0x80000000) * max);
  };
}
