/**
 * СВЕРКА ДИЗАЙНА ЧЕЛОВЕКА С ОТКРЫТЫМ КАЛЬКУЛЯТОРОМ
 *
 * Эталон снят один раз с human-design-mcp (MIT, ссылается на Jovian
 * Archive; внутри Swiss Ephemeris) и зафиксирован в
 * `fixtures/openCalculator.ts`. Те же двадцать контрольных случаев, что и
 * у натальной карты: СССР с декретным и летним временем, 1991 год, южное
 * полушарие, экватор, Мурманск и Норильск.
 *
 * Сверяется вся цепочка: местное время → UTC → Design-момент → ворота и
 * линии двадцати шести активаций → активные ворота → полные каналы →
 * определённые центры → тип, авторитет, профиль, определение. Ошибка в
 * одном канале меняет тип, поэтому каналы и центры сверяются поимённо.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPEN_CALCULATOR } from "./fixtures/openCalculator";
import { localToUtc } from "@/lib/geo/localTime";
import { norm360 } from "@/lib/ephemeris";
import {
  AUTHORITIES,
  CENTERS,
  CENTER_ORDER,
  CHANNELS,
  DEFINITIONS,
  GATE_SIZE,
  GATE_WHEEL,
  HD_TYPES,
  LINE_SIZE,
  WHEEL_START,
  activeChannels,
  buildHumanDesignChart,
  centerOfGate,
  crossAngle,
  determineAuthority,
  determineType,
  gateAt,
  gateStart,
  type CenterId,
} from "./index";

/** Названия центров у эталона — свои; сопоставляем. */
const CENTER_BY_REFERENCE: Record<string, CenterId> = {
  Head: "head",
  Ajna: "ajna",
  Throat: "throat",
  Self: "self",
  Heart: "heart",
  Sacral: "sacral",
  Spleen: "spleen",
  "Solar Plexus": "solar",
  Root: "root",
};

const TYPE_BY_REFERENCE: Record<string, string> = {
  Generator: "generator",
  "Manifesting Generator": "manifesting_generator",
  Manifestor: "manifestor",
  Projector: "projector",
  Reflector: "reflector",
};

const AUTHORITY_BY_REFERENCE: Record<string, string> = {
  Emotional: "emotional",
  Sacral: "sacral",
  Splenic: "splenic",
  Ego: "ego",
  "Self-Projected": "self_projected",
  "Mental (Outer Authority)": "mental",
  "None (Outer Authority)": "mental",
  Lunar: "lunar",
};

const DEFINITION_BY_REFERENCE: Record<string, string> = {
  "No Definition": "none",
  "Single Definition": "single",
  "Split Definition": "split",
  "Triple Split": "triple_split",
  "Triple Split Definition": "triple_split",
  "Quadruple Split": "quadruple_split",
  "Quadruple Split Definition": "quadruple_split",
};

const BODY_BY_REFERENCE: Record<string, string> = {
  Sun: "sun",
  Earth: "earth",
  Moon: "moon",
  "North Node": "north_node",
  "South Node": "south_node",
  Mercury: "mercury",
  Venus: "venus",
  Mars: "mars",
  Jupiter: "jupiter",
  Saturn: "saturn",
  Uranus: "uranus",
  Neptune: "neptune",
  Pluto: "pluto",
};

function chartOf(c: (typeof OPEN_CALCULATOR.cases)[number]) {
  return buildHumanDesignChart({
    date: c.localDate,
    time: c.localTime,
    tz: c.tz,
    latitude: c.lat,
    longitude: c.lon,
    placeName: c.place,
  });
}

describe("колесо ворот", () => {
  it("шестьдесят четыре ворот без повторов, отсчёт с 41 на 302°", () => {
    assert.equal(GATE_WHEEL.length, 64);
    assert.equal(new Set(GATE_WHEEL).size, 64);
    for (let g = 1; g <= 64; g++) assert.ok(GATE_WHEEL.includes(g), `нет ворот ${g}`);
    assert.equal(GATE_WHEEL[0], 41);
    assert.equal(WHEEL_START, 302);
    assert.equal(gateStart(41), 302);
    assert.equal(GATE_SIZE, 5.625);
    assert.equal(LINE_SIZE, 0.9375);
  });

  it("границы ворот и линий", () => {
    assert.deepEqual({ gate: gateAt(302).gate, line: gateAt(302).line }, { gate: 41, line: 1 });
    assert.equal(gateAt(302 + LINE_SIZE * 0.5).line, 1);
    assert.equal(gateAt(302 + LINE_SIZE * 1.5).line, 2);
    assert.equal(gateAt(302 + LINE_SIZE * 5.5).line, 6);
    assert.equal(gateAt(norm360(302 + GATE_SIZE)).gate, 19);
    assert.equal(gateAt(norm360(302 - 0.001)).gate, 60);
    // Каждый градус круга попадает ровно в одни ворота.
    for (let d = 0; d < 360; d += 0.37) {
      const g = gateAt(d);
      assert.ok(g.gate >= 1 && g.gate <= 64 && g.line >= 1 && g.line <= 6, `долгота ${d}`);
    }
  });

  it("каждые ворота принадлежат центру, все 64 разложены по девяти центрам", () => {
    const counted = CENTER_ORDER.flatMap((c) => CENTERS[c].gates);
    assert.equal(counted.length, 64);
    assert.equal(new Set(counted).size, 64);
    for (let g = 1; g <= 64; g++) assert.ok(centerOfGate(g));
  });

  it("тридцать шесть каналов, оба конца в разных центрах", () => {
    assert.equal(CHANNELS.length, 36);
    for (const c of CHANNELS) {
      assert.ok(c.a < c.b, `${c.a}-${c.b}: ворота не по возрастанию`);
      const [x, y] = [centerOfGate(c.a), centerOfGate(c.b)];
      assert.notEqual(x, y, `канал ${c.a}-${c.b} внутри одного центра`);
    }
  });
});

describe("сверка с открытым калькулятором", () => {
  for (const c of OPEN_CALCULATOR.cases) {
    it(`${c.place} ${c.localDate} ${c.localTime}`, () => {
      // Момент рождения и Design-момент
      const conv = localToUtc(c.localDate, c.localTime, c.tz);
      assert.equal(conv.utc.toISOString(), new Date(c.utc).toISOString());

      const chart = chartOf(c);
      const designDiff = Math.abs(chart.designUtc.getTime() - Date.parse(c.designUtc));
      assert.ok(designDiff < 120_000, `Design-момент: ${chart.designUtc.toISOString()} против ${c.designUtc}`);

      // Активации: ворота и линии
      for (const side of ["personality", "design"] as const) {
        const ours = chart[side];
        for (const ref of c[side]) {
          const body = BODY_BY_REFERENCE[ref.body];
          const mine = ours.find((a) => a.body === body);
          assert.ok(mine, `${side}: нет тела ${ref.body}`);
          assert.equal(mine.gate, ref.gate, `${side} ${ref.body}: ворота ${mine.gate} против ${ref.gate}`);
          assert.equal(mine.line, ref.line, `${side} ${ref.body}: линия ${mine.line} против ${ref.line}`);
        }
      }

      // Активные ворота, каналы и центры — поимённо
      assert.deepEqual(chart.gates, [...c.gates].sort((a, b) => a - b), "набор активных ворот");
      assert.deepEqual(
        chart.channels.map((ch) => `${ch.a}-${ch.b}`).sort(),
        [...c.channels].sort(),
        "полные каналы",
      );
      assert.deepEqual(
        [...chart.definedCenters].sort(),
        c.definedCenters.map((x) => CENTER_BY_REFERENCE[x]).sort(),
        "определённые центры",
      );
      assert.equal(chart.definedCenters.length + chart.openCenters.length, 9);

      // Итоги карты
      assert.equal(chart.type.id, TYPE_BY_REFERENCE[c.type], `тип: ${chart.type.name} против ${c.type}`);
      assert.equal(chart.authority.id, AUTHORITY_BY_REFERENCE[c.authority], `авторитет: ${chart.authority.name} против ${c.authority}`);
      assert.equal(chart.profile, c.profile, "профиль");
      assert.equal(chart.definition, DEFINITION_BY_REFERENCE[c.definition], `определение: ${chart.definition} против ${c.definition}`);

      // Крест воплощения: четыре ворот
      const refCross = c.cross as { gates: number[] };
      assert.deepEqual([...chart.cross.gates], refCross.gates, "ворота креста");
    });
  }

  it("в двадцати случаях встретились разные типы и авторитеты", () => {
    const types = new Set(OPEN_CALCULATOR.cases.map((c) => c.type));
    const authorities = new Set(OPEN_CALCULATOR.cases.map((c) => c.authority));
    assert.ok(types.size >= 3, `типов в выборке: ${types.size}`);
    assert.ok(authorities.size >= 3, `авторитетов в выборке: ${authorities.size}`);
  });
});

describe("правила вывода типа и авторитета", () => {
  const ch = (a: number, b: number) => activeChannels(new Set([a, b]))[0];

  it("сакрал без выхода на горло — генератор", () => {
    const channels = [ch(34, 57)]; // Сакрал — Селезёнка
    const type = determineType(["sacral", "spleen"], channels);
    assert.equal(type.id, "generator");
  });

  it("сакрал с выходом на горло — манифестирующий генератор", () => {
    const channels = [ch(20, 34)]; // Горло — Сакрал
    assert.equal(determineType(["throat", "sacral"], channels).id, "manifesting_generator");
  });

  it("мотор на горле без сакрала — манифестор, в том числе через цепочку", () => {
    assert.equal(determineType(["throat", "solar"], [ch(12, 22)]).id, "manifestor");
    // Цепочка: Корень — Селезёнка — Горло. Мотор доходит до горла не напрямую.
    const chain = [ch(28, 38), ch(20, 57)];
    assert.equal(determineType(["root", "spleen", "throat"], chain).id, "manifestor");
  });

  it("нет сакрала и мотор до горла не доходит — проектор", () => {
    assert.equal(determineType(["ajna", "head"], [ch(24, 61)]).id, "projector");
    // Горло определено, но мотор к нему не подключён.
    const noMotor = [ch(23, 43), ch(24, 61)];
    assert.equal(determineType(["throat", "ajna", "head"], noMotor).id, "projector");
  });

  it("ни одного определённого центра — рефлектор с лунным авторитетом", () => {
    const type = determineType([], []);
    assert.equal(type.id, "reflector");
    assert.equal(determineAuthority([], type).id, "lunar");
  });

  it("порядок авторитетов: сплетение выше сакрала, сакрал выше селезёнки", () => {
    assert.equal(determineAuthority(["solar", "sacral", "spleen"], HD_TYPES.generator).id, "emotional");
    assert.equal(determineAuthority(["sacral", "spleen", "heart"], HD_TYPES.generator).id, "sacral");
    assert.equal(determineAuthority(["spleen", "heart", "self"], HD_TYPES.projector).id, "splenic");
    assert.equal(determineAuthority(["heart", "self"], HD_TYPES.projector).id, "ego");
    assert.equal(determineAuthority(["self", "throat"], HD_TYPES.projector).id, "self_projected");
    assert.equal(determineAuthority(["ajna", "head", "throat"], HD_TYPES.projector).id, "mental");
  });

  it("угол креста выводится из профиля", () => {
    assert.equal(crossAngle("4/1"), "juxtaposition");
    for (const p of ["5/1", "5/2", "6/2", "6/3"]) assert.equal(crossAngle(p), "left", p);
    for (const p of ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6"]) assert.equal(crossAngle(p), "right", p);
  });

  it("у каждого типа есть стратегия, у каждого авторитета — строка", () => {
    for (const t of Object.values(HD_TYPES)) {
      assert.ok(t.name && t.strategy && t.strategyLine && t.signature && t.notSelf);
    }
    for (const a of Object.values(AUTHORITIES)) assert.ok(a.name && a.line);
    assert.equal(Object.keys(DEFINITIONS).length, 5);
  });
});

describe("карта без времени рождения", () => {
  it("помечена как приблизительная, но считается", () => {
    const chart = buildHumanDesignChart({
      date: "1990-07-26",
      time: null,
      tz: "Europe/Moscow",
      latitude: 55.75222,
      longitude: 37.61556,
    });
    assert.equal(chart.approximate, true);
    assert.equal(chart.moment.precision, "noon");
    assert.equal(chart.personality.length, 13);
    assert.equal(chart.design.length, 13);
    assert.ok(chart.type.id);
  });

  it("со временем — точная", () => {
    const chart = buildHumanDesignChart({
      date: "1990-07-26",
      time: "09:00",
      tz: "Europe/Moscow",
      latitude: 55.75222,
      longitude: 37.61556,
    });
    assert.equal(chart.approximate, false);
    assert.ok(chart.daysBetween > 86 && chart.daysBetween < 93, `${chart.daysBetween} суток`);
  });
});
