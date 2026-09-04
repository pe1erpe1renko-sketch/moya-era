/**
 * РАЗБОР ПАРЫ: синастрия и композит.
 *
 * Проверяется то, в чём легко ошибиться и что дорого стоит:
 *  - у синастрии порядок в паре имеет смысл: «Венера первого и Луна
 *    второго» — не то же, что наоборот, и ключи текстов должны это
 *    различать;
 *  - у композита вид связи выводится из четырёх раскладов ворот, и
 *    перепутать их значит выдать доминирование за электромагнетизм;
 *  - композит обязан содержать все личные каналы обоих: если хоть один
 *    потеряется, изменятся центры, а с ними и тип пары.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNatalChart } from "@/lib/natal";
import { buildHumanDesignChart, CHANNELS, channelCenters, type HumanDesignChart } from "@/lib/humandesign";
import {
  BRIEF_POINTS,
  SYNASTRY_POINTS,
  buildComposite,
  buildSynastry,
  buildPairRequest,
  compositeSections,
  countKinds,
  findPairSlot,
  matrixBriefKey,
  synastryBriefKey,
  synastryPairAllowed,
  synastrySections,
  viewByAnchor,
  PAIR_VIEWS,
} from "./index";

const MOSCOW = { tz: "Europe/Moscow", latitude: 55.75222, longitude: 37.61556, placeName: "Москва" };
type Birth = { date: string; time: string | null; tz: string; latitude: number; longitude: number; placeName: string };
const A: Birth = { date: "1990-07-26", time: "09:00", ...MOSCOW };
const B: Birth = { date: "1992-04-09", time: "14:30", ...MOSCOW };

const natal = (i: Birth) => buildNatalChart(i);
const hd = (i: Birth) => buildHumanDesignChart(i);

describe("синастрия", () => {
  const syn = buildSynastry(natal(A), natal(B));

  it("аспект помнит, чья планета первая", () => {
    // Обратный порядок людей должен давать зеркальные пары.
    const back = buildSynastry(natal(B), natal(A));
    const forward = syn.aspects.map((x) => `${x.a}|${x.b}|${x.aspect.key}`).sort();
    const mirrored = back.aspects.map((x) => `${x.b}|${x.a}|${x.aspect.key}`).sort();
    assert.deepEqual(forward, mirrored, "набор аспектов должен зеркалиться при перестановке людей");

    // И при этом сами ключи разные: роли в паре не одинаковы.
    const lead = syn.leading;
    assert.ok(lead);
    assert.equal(synastryBriefKey(syn), `syn_brief_${lead.a}_${lead.b}_${lead.aspect.key}`);
    assert.notEqual(synastryBriefKey(syn), synastryBriefKey(back));
  });

  it("главная связь ищется только среди личных планет", () => {
    assert.ok(syn.leading);
    assert.ok(BRIEF_POINTS.includes(syn.leading.a) && BRIEF_POINTS.includes(syn.leading.b));
  });

  it("аспекты двух медленных планет не считаются: они одинаковы у ровесников", () => {
    assert.equal(synastryPairAllowed("saturn", "pluto"), false);
    assert.equal(synastryPairAllowed("sun", "pluto"), true);
    assert.ok(!syn.aspects.some((x) => !synastryPairAllowed(x.a, x.b)));
    assert.ok(SYNASTRY_POINTS.includes("asc"));
  });

  it("аспекты отсортированы по точности", () => {
    for (let i = 1; i < syn.aspects.length; i++) {
      assert.ok(syn.aspects[i - 1].strength >= syn.aspects[i].strength);
    }
  });

  it("дома накладываются в обе стороны и только при точном времени у обоих", () => {
    assert.equal(syn.unknown.houses, false);
    assert.equal(syn.overlays.length, 20, "десять планет в каждую сторону");
    assert.ok(syn.overlays.some((o) => o.owner === 0) && syn.overlays.some((o) => o.owner === 1));
    for (const o of syn.overlays) assert.ok(o.house >= 1 && o.house <= 12);
  });

  it("без времени рождения домов нет, но аспекты есть", () => {
    const noTime = buildSynastry(natal({ ...A, time: null }), natal({ ...B, time: null }));
    assert.equal(noTime.unknown.houses, true);
    assert.deepEqual(noTime.overlays, []);
    assert.ok(noTime.aspects.length > 0);
    assert.equal(noTime.unknown.firstTime, true);
    assert.equal(noTime.unknown.secondTime, true);
    // Асцендента нет — аспектов к нему тоже.
    assert.ok(!noTime.aspects.some((x) => x.a === "asc" || x.b === "asc"));
  });

  it("разделы: главная связь бесплатна, остальное под замком", () => {
    const sections = synastrySections(syn);
    const slots = sections.flatMap((s) => s.slots);
    assert.equal(slots.filter((s) => s.free).length, 1);
    assert.equal(slots.find((s) => s.free)?.id, "syn_brief");
    assert.ok(slots.every((s) => s.key.startsWith("syn_")));
    assert.ok(findPairSlot(sections, "syn_brief"));
    assert.equal(findPairSlot(sections, "нет такого"), null);
  });
});

/** Собирает карту-заглушку с нужным набором ворот. */
function withGates(gates: number[]): HumanDesignChart {
  return { ...hd(A), gates } as HumanDesignChart;
}

describe("композит: вид связи", () => {
  const [ch] = CHANNELS; // любой канал: важна механика, а не он сам
  const other = CHANNELS.find((c) => c.a !== ch.a && c.b !== ch.b)!;

  const kindOf = (first: number[], second: number[]) => {
    const c = buildComposite(withGates(first), withGates(second));
    return c.channels.find((x) => x.channel.a === ch.a && x.channel.b === ch.b) ?? null;
  };

  it("канал целиком у обоих — компаньонство", () => {
    assert.equal(kindOf([ch.a, ch.b], [ch.a, ch.b])?.kind, "companionship");
  });

  it("канал целиком у одного, у другого ничего — доминирование", () => {
    const found = kindOf([ch.a, ch.b], [other.a]);
    assert.equal(found?.kind, "dominance");
    assert.equal(found?.owner, 0, "владелец — первый");
    assert.equal(kindOf([other.a], [ch.a, ch.b])?.owner, 1, "владелец — второй");
  });

  it("канал целиком у одного, у другого половина — компромисс", () => {
    assert.equal(kindOf([ch.a, ch.b], [ch.a])?.kind, "compromise");
    assert.equal(kindOf([ch.a], [ch.a, ch.b])?.kind, "compromise");
  });

  it("половины у разных людей — электромагнитный", () => {
    assert.equal(kindOf([ch.a], [ch.b])?.kind, "electromagnetic");
    assert.equal(kindOf([ch.b], [ch.a])?.kind, "electromagnetic");
  });

  it("одна половина на двоих — канала нет", () => {
    assert.equal(kindOf([ch.a], [ch.a]), null);
    assert.equal(kindOf([ch.a], []), null);
  });
});

describe("композит на настоящей паре", () => {
  const comp = buildComposite(hd(A), hd(B));

  it("содержит все личные каналы обоих: иначе изменится тип пары", () => {
    const own = new Set([...comp.first.channels, ...comp.second.channels].map((c) => `${c.a}-${c.b}`));
    const all = new Set(comp.channels.map((c) => `${c.channel.a}-${c.channel.b}`));
    for (const key of own) assert.ok(all.has(key), `канал ${key} потерялся`);
    assert.ok(all.size >= own.size);
  });

  it("личный канал никогда не бывает электромагнитным", () => {
    const own = new Set([...comp.first.channels, ...comp.second.channels].map((c) => `${c.a}-${c.b}`));
    for (const c of comp.channels) {
      if (c.kind === "electromagnetic") assert.ok(!own.has(`${c.channel.a}-${c.channel.b}`));
    }
  });

  it("центры композита — ровно центры его каналов", () => {
    const expected = new Set(comp.channels.flatMap((c) => channelCenters(c.channel)));
    assert.deepEqual(new Set(comp.definedCenters), expected);
  });

  it("центр «только вместе» не определён ни у кого поодиночке", () => {
    for (const [center, source] of Object.entries(comp.centerSource)) {
      const inFirst = comp.first.definedCenters.includes(center as never);
      const inSecond = comp.second.definedCenters.includes(center as never);
      if (source === "connection") {
        assert.ok(!inFirst && !inSecond, `${center}: помечен как «только вместе», но есть у одного`);
        assert.ok(comp.definedCenters.includes(center as never));
      }
      if (source === "both") assert.ok(inFirst && inSecond);
      if (source === "none") assert.ok(!comp.definedCenters.includes(center as never));
    }
  });

  it("виды связей покрывают все каналы", () => {
    const counts = countKinds(comp);
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), comp.channels.length);
  });

  it("перестановка людей меняет владельца, но не набор каналов", () => {
    const back = buildComposite(hd(B), hd(A));
    assert.deepEqual(
      comp.channels.map((c) => `${c.channel.a}-${c.channel.b}:${c.kind}`).sort(),
      back.channels.map((c) => `${c.channel.a}-${c.channel.b}:${c.kind}`).sort(),
    );
    assert.equal(comp.type.id, back.type.id, "тип пары не зависит от порядка");
    assert.equal(comp.definition, back.definition);
    for (const c of comp.channels) {
      if (c.owner === null) continue;
      const mirror = back.channels.find((x) => x.channel.a === c.channel.a && x.channel.b === c.channel.b);
      assert.equal(mirror?.owner, c.owner === 0 ? 1 : 0);
    }
  });

  it("разделы: главная связь бесплатна, остальное под замком", () => {
    const sections = compositeSections(comp);
    const slots = sections.flatMap((s) => s.slots);
    assert.equal(slots.filter((s) => s.free).length, 1);
    assert.equal(slots.find((s) => s.free)?.id, "hdc_brief");
    assert.ok(slots.every((s) => s.key.startsWith("hdc_")));
  });
});

describe("три взгляда и ключи", () => {
  it("взгляд выбирается якорем адреса", () => {
    assert.equal(viewByAnchor("#sinastriya").id, "synastry");
    assert.equal(viewByAnchor("kompozit").id, "composite");
    assert.equal(viewByAnchor(null).id, "matrix", "по умолчанию матрица");
    assert.equal(viewByAnchor("#мусор").id, "matrix");
    assert.equal(new Set(PAIR_VIEWS.map((v) => v.anchor)).size, 3, "якоря не повторяются");
  });

  it("ключ матричного абзаца — по аркану пары", () => {
    assert.equal(matrixBriefKey(15), "pair_brief_matrix_15");
  });

  it("короткий текст пишется другим промптом, чем платный", () => {
    const brief = buildPairRequest({ kind: "hdc_brief", slotLabel: "", first: "generator", second: "projector" });
    const full = buildPairRequest({ kind: "hdc_type", slotLabel: "", first: "generator", second: "projector" });
    assert.notEqual(brief.system, full.system);
    assert.ok(brief.maxTokens < full.maxTokens);
    for (const r of [brief, full]) {
      assert.ok(r.system.includes("Не выноси приговор отношениям"), "запрет на приговор на месте");
      assert.ok(r.system.includes("Не оценивай пару в процентах"));
      assert.ok(!r.user.includes("undefined"));
    }
  });

  it("промпт аспекта называет, чья планета первая", () => {
    const r = buildPairRequest({ kind: "syn_aspect", slotLabel: "проверка", a: "venus", b: "mars", aspect: "square" });
    assert.ok(r.user.includes("Венера первого"));
    assert.ok(r.user.includes("Марс второго"));
  });

  it("без единого аспекта между личными планетами есть свой текст", () => {
    const r = buildPairRequest({ kind: "syn_brief", slotLabel: "", a: null, b: null, aspect: null });
    assert.ok(r.user.includes("нет ни одного аспекта"));
    assert.ok(!r.user.includes("null"));
  });
});
