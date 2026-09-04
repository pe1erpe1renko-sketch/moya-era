/**
 * СВЕРКА НАТАЛЬНОЙ КАРТЫ СО SWISS EPHEMERIS
 *
 * Эталон снят один раз со Swiss Ephemeris 2.10 — той же библиотеки, на
 * которой считает astro.com, — и зафиксирован числами в
 * `src/lib/ephemeris/fixtures/swissEphemeris.ts`. Сама библиотека в проект
 * не входит: она под AGPL.
 *
 * Проверяется вся цепочка целиком: местное время рождения и место →
 * момент UTC по истории часовых поясов → положения планет, асцендент,
 * середина неба и куспиды домов Плацидуса.
 *
 * Двадцать случаев: СССР с декретным и летним временем, 1991 год с
 * отменой и возвратом декретного, южное полушарие, экватор, Мурманск и
 * Норильск за полярным кругом.
 *
 * ДОПУСКИ. Измеренные расхождения: планеты до 17″, асцендент до 18″,
 * куспиды домов до 15″, узел до 33″ (истинный узел быстро колеблется,
 * методы вычисления у нас и у Swiss разные). Допуски взяты с запасом, но
 * в сотни раз меньше градуса зодиака (3600″).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SWISS_EPHEMERIS } from "@/lib/ephemeris/fixtures/swissEphemeris";
import { angleDiff, bodyPosition, designMoment, houses, signAt, type BodyId } from "@/lib/ephemeris";
import { localToUtc } from "@/lib/geo/localTime";
import {
  ASPECTS,
  briefSlots,
  buildNatalChart,
  buildNatalRequest,
  chartBody,
  countNatalSlots,
  findAspects,
  findNatalSlot,
  natalSections,
  natalTextKey,
  NATAL_SECTIONS,
  sunSign,
  type NatalSlot,
} from "./index";

const ARCSEC = 1 / 3600;
const TOL = {
  body: 40 * ARCSEC,
  node: 90 * ARCSEC,
  angle: 40 * ARCSEC,
  cusp: 40 * ARCSEC,
  speed: 0.01,
};

const MOSCOW = { lat: 55.75222, lon: 37.61556, tz: "Europe/Moscow" };

describe("сверка со Swiss Ephemeris: местное время → UTC", () => {
  for (const c of SWISS_EPHEMERIS.cases) {
    it(`${c.place} ${c.localDate} ${c.localTime} → ${c.utc}`, () => {
      const r = localToUtc(c.localDate, c.localTime, c.tz);
      assert.equal(r.utc.toISOString(), new Date(c.utc).toISOString());
      assert.equal(r.offsetMinutes, c.offsetMinutes);
    });
  }
});

describe("сверка со Swiss Ephemeris: положения планет", () => {
  for (const c of SWISS_EPHEMERIS.cases) {
    it(c.label, () => {
      const utc = new Date(c.utc);
      for (const [body, ref] of Object.entries(c.bodies)) {
        if (body === "lilith") continue; // не показываем: расходится со Swiss до 7′
        const p = bodyPosition(body as BodyId, utc);
        const limit = body === "north_node" ? TOL.node : TOL.body;
        const diff = Math.abs(angleDiff(p.longitude, ref.lon));
        assert.ok(diff <= limit, `${body}: ${p.longitude} против ${ref.lon}, разница ${(diff / ARCSEC).toFixed(1)}″`);
        if (body !== "north_node") {
          assert.ok(Math.abs(p.latitude - ref.lat) <= TOL.body, `${body}: широта ${p.latitude} против ${ref.lat}`);
          assert.ok(Math.abs(p.speed - ref.speed) <= TOL.speed, `${body}: скорость ${p.speed} против ${ref.speed}`);
          assert.equal(p.retrograde, ref.speed < 0, `${body}: ретроградность`);
        }
      }
    });
  }
});

describe("сверка со Swiss Ephemeris: асцендент, середина неба и дома", () => {
  for (const c of SWISS_EPHEMERIS.cases) {
    it(c.label, () => {
      const utc = new Date(c.utc);
      const equal = houses(utc, c.lat, c.lon, "equal");
      assert.ok(Math.abs(angleDiff(equal.asc, c.angles.asc)) <= TOL.angle, `асцендент ${equal.asc} против ${c.angles.asc}`);
      assert.ok(Math.abs(angleDiff(equal.mc, c.angles.mc)) <= TOL.angle, `MC ${equal.mc} против ${c.angles.mc}`);
      assert.ok(Math.abs(angleDiff(equal.armc, c.angles.armc)) <= TOL.angle, "звёздное время");

      const placidus = houses(utc, c.lat, c.lon, "placidus");
      if (c.placidus) {
        assert.equal(placidus.fallback, false, "Плацидус должен считаться");
        assert.equal(placidus.system, "placidus");
        for (let i = 0; i < 12; i++) {
          const diff = Math.abs(angleDiff(placidus.cusps[i], c.placidus.cusps[i]));
          assert.ok(diff <= TOL.cusp, `дом ${i + 1}: ${placidus.cusps[i]} против ${c.placidus.cusps[i]}`);
        }
      } else {
        // Swiss Ephemeris здесь отказывается считать Плацидус — и мы тоже.
        assert.equal(c.polar, true);
        assert.equal(placidus.fallback, true, `${c.place}: должен быть откат`);
        assert.equal(placidus.system, "porphyry");
        assert.ok(Math.abs(angleDiff(placidus.asc, c.angles.asc)) <= TOL.angle, "асцендент считается и за полярным кругом");
      }
    });
  }
});

describe("сверка со Swiss Ephemeris: Design-момент дизайна человека", () => {
  for (const c of SWISS_EPHEMERIS.cases.filter((x) => x.design)) {
    it(c.label, () => {
      const design = designMoment(new Date(c.utc));
      const ref = c.design!;
      assert.ok(
        Math.abs(design.getTime() - Date.parse(ref.utc)) < 60_000,
        `${design.toISOString()} против ${ref.utc}`,
      );
      const days = (Date.parse(c.utc) - design.getTime()) / 86_400_000;
      assert.ok(Math.abs(days - ref.daysBefore) < 0.001, `${days} суток против ${ref.daysBefore}`);
      for (const [body, refBody] of Object.entries(ref.bodies)) {
        if (body === "lilith") continue;
        const limit = body === "north_node" ? TOL.node : TOL.body;
        assert.ok(Math.abs(angleDiff(bodyPosition(body as BodyId, design).longitude, refBody.lon)) <= limit, body);
      }
    });
  }
});

describe("карта целиком", () => {
  const moscow = SWISS_EPHEMERIS.cases[0];

  it("время и место известны: дома, углы и аспекты на месте", () => {
    const chart = buildNatalChart({
      date: moscow.localDate,
      time: moscow.localTime,
      tz: moscow.tz,
      latitude: moscow.lat,
      longitude: moscow.lon,
      placeName: "Москва",
    });
    assert.equal(chart.moment.precision, "exact");
    assert.equal(chart.moment.utc.toISOString(), new Date(moscow.utc).toISOString());
    assert.equal(chart.bodies.length, 11); // десять тел и северный узел
    assert.ok(chart.bodies.every((b) => b.body !== "lilith"), "Лилит в карту не входит");
    assert.equal(chart.houses?.system, "placidus");
    assert.ok(chart.asc && Math.abs(angleDiff(chart.asc.longitude, moscow.placidus!.asc)) < TOL.angle);
    assert.ok(chart.mc && Math.abs(angleDiff(chart.mc.longitude, moscow.placidus!.mc)) < TOL.angle);
    assert.equal(chart.unknown.houses, false);
    assert.equal(chart.unknown.polarHouses, false);
    assert.ok(chart.bodies.every((b) => b.house !== null && b.house >= 1 && b.house <= 12));
    assert.ok(chart.aspects.length > 0);

    const sun = chartBody(chart, "sun")!;
    assert.equal(sun.sign.key, signAt(moscow.bodies.sun.lon).key);
    assert.match(sun.label, /^\d+°\d\d′ /);
  });

  it("время неизвестно: полдень, домов и углов нет, про Луну сказано честно", () => {
    const chart = buildNatalChart({
      date: "1990-07-26",
      time: null,
      tz: MOSCOW.tz,
      latitude: MOSCOW.lat,
      longitude: MOSCOW.lon,
    });
    assert.equal(chart.moment.precision, "noon");
    assert.equal(chart.houses, null);
    assert.equal(chart.asc, null);
    assert.equal(chart.mc, null);
    assert.equal(chart.unknown.houses, true);
    assert.ok(chart.bodies.every((b) => b.house === null));
    assert.ok(chart.aspects.every((a) => a.a !== "asc" && a.b !== "asc" && a.a !== "mc" && a.b !== "mc"));
    // 26 июля 1990 Луна переходит из Девы в Весы — знак назвать нельзя.
    assert.equal(chart.unknown.moonSign, true);
  });

  it("Луна весь день в одном знаке — называем уверенно; со временем вопрос не встаёт", () => {
    // 15 января 2024 Луна весь день в Рыбах.
    const chart = buildNatalChart({ date: "2024-01-15", time: null, tz: MOSCOW.tz, latitude: MOSCOW.lat, longitude: MOSCOW.lon });
    assert.equal(chart.unknown.moonSign, false);
    const exact = buildNatalChart({ date: "1990-07-26", time: "09:00", tz: MOSCOW.tz, latitude: MOSCOW.lat, longitude: MOSCOW.lon });
    assert.equal(exact.unknown.moonSign, false);
  });

  it("место не распознано: считаем на полдень по всемирному времени", () => {
    const chart = buildNatalChart({ date: "1990-07-26", time: "09:00", tz: null, latitude: null, longitude: null });
    assert.equal(chart.moment.precision, "date_only");
    assert.equal(chart.moment.utc.toISOString(), "1990-07-26T12:00:00.000Z");
    assert.equal(chart.place, null);
    assert.equal(chart.houses, null);
  });

  it("Мурманск: дома есть, но система заменена и об этом сказано", () => {
    const murmansk = SWISS_EPHEMERIS.cases.find((c) => c.place === "Мурманск")!;
    const chart = buildNatalChart({
      date: murmansk.localDate,
      time: murmansk.localTime,
      tz: murmansk.tz,
      latitude: murmansk.lat,
      longitude: murmansk.lon,
      placeName: "Мурманск",
    });
    assert.equal(chart.unknown.polarHouses, true);
    assert.equal(chart.houses?.system, "porphyry");
    assert.equal(chart.houses?.requested, "placidus");
    assert.ok(chart.asc);
    assert.ok(chart.bodies.every((b) => b.house !== null));
  });
});

describe("аспекты", () => {
  it("находит точные аспекты и считает орбис", () => {
    const found = findAspects(
      [
        { point: "sun", longitude: 10, speed: 1 },
        { point: "moon", longitude: 130, speed: 13 },
        { point: "mars", longitude: 100.5, speed: 0.5 },
        { point: "saturn", longitude: 200, speed: -0.05 },
      ],
      ["sun", "moon", "mars", "saturn"],
    );
    const byPair = new Map(found.map((a) => [`${a.a}_${a.b}`, a]));
    assert.equal(byPair.get("sun_moon")?.aspect.key, "trine");
    assert.equal(byPair.get("sun_mars")?.aspect.key, "square");
    assert.ok(Math.abs((byPair.get("sun_mars")?.orb ?? 9) - 0.5) < 1e-9);
    assert.equal(byPair.get("moon_mars"), undefined, "29,5° — не аспект");
    assert.equal(byPair.get("sun_saturn"), undefined, "190° — не аспект");
    const conj = findAspects(
      [
        { point: "moon", longitude: 130, speed: 13 },
        { point: "mars", longitude: 133.4, speed: 0.5 },
      ],
      ["moon", "mars"],
    );
    assert.equal(conj[0].aspect.key, "conjunction");
  });

  it("орбис у светил шире", () => {
    const withSun = findAspects(
      [
        { point: "sun", longitude: 0, speed: 1 },
        { point: "venus", longitude: 187, speed: 1 },
      ],
      ["sun", "venus"],
    );
    assert.equal(withSun.length, 1, "оппозиция Солнца с орбисом 7° входит");
    const withoutSun = findAspects(
      [
        { point: "mars", longitude: 0, speed: 1 },
        { point: "venus", longitude: 187, speed: 1 },
      ],
      ["mars", "venus"],
    );
    assert.equal(withoutSun.length, 0, "между планетами орбис 6° — не входит");
  });

  it("сходящийся и расходящийся аспект", () => {
    const applying = findAspects(
      [
        { point: "sun", longitude: 0, speed: 1 },
        { point: "moon", longitude: 355, speed: 13 },
      ],
      ["sun", "moon"],
    );
    assert.equal(applying[0].applying, true);
    const separating = findAspects(
      [
        { point: "sun", longitude: 0, speed: 1 },
        { point: "moon", longitude: 5, speed: 13 },
      ],
      ["sun", "moon"],
    );
    assert.equal(separating[0].applying, false);
  });

  it("порядок в паре не зависит от того, кто где стоит", () => {
    const one = findAspects(
      [
        { point: "venus", longitude: 0, speed: 1 },
        { point: "sun", longitude: 120, speed: 1 },
      ],
      ["sun", "moon", "venus"],
    );
    assert.equal(one[0].a, "sun");
    assert.equal(one[0].b, "venus");
  });
});

describe("разделы и ключи текстов", () => {
  const chart = buildNatalChart({
    date: "1990-07-26",
    time: "09:00",
    tz: MOSCOW.tz,
    latitude: MOSCOW.lat,
    longitude: MOSCOW.lon,
  });

  it("бесплатных вопросов три: Солнце, Луна, асцендент", () => {
    const { free, total } = countNatalSlots();
    assert.equal(free, 3);
    assert.ok(total >= 20, `всего вопросов: ${total}`);
    const freeIds = NATAL_SECTIONS.flatMap((s) => s.slots.filter((x) => x.free).map((x) => x.id));
    assert.deepEqual(freeIds, ["natal_body_sign_sun", "natal_body_sign_moon", "natal_asc_sign"]);
  });

  it("ключ текста собирается из вопроса и позиции", () => {
    const slot = (id: string) => findNatalSlot(id, chart)!;
    assert.equal(natalTextKey(slot("natal_body_sign_sun"), chart), "natal_body_sign_sun_leo");
    assert.equal(natalTextKey(slot("natal_asc_sign"), chart), `natal_asc_sign_${chart.asc!.sign.key}`);
    const venus = chartBody(chart, "venus")!;
    assert.equal(natalTextKey(slot("natal_body_house_venus"), chart), `natal_body_house_venus_${venus.house}`);
    // Ретроградные планеты получают свой ключ и свой текст.
    for (const body of ["mercury", "saturn", "uranus", "neptune", "pluto"] as const) {
      const b = chartBody(chart, body)!;
      const key = natalTextKey(slot(`natal_body_sign_${body}`), chart)!;
      assert.equal(key.endsWith("_r"), b.retrograde, `${body}: ключ и ретроградность разошлись`);
    }
  });

  it("без домов раздел домов исчезает, аспекты к углам не появляются", () => {
    const noPlace = buildNatalChart({ date: "1990-07-26", time: null, tz: null, latitude: null, longitude: null });
    const ids = natalSections(noPlace).map((s) => s.id);
    assert.ok(!ids.includes("houses"));
    assert.equal(findNatalSlot("natal_body_house_sun", noPlace), null);
    const houseSlot: NatalSlot = { id: "natal_body_house_sun", label: "", kind: "body_house", free: false, body: "sun" };
    assert.equal(natalTextKey(houseSlot, noPlace), null);
  });

  it("аспектных вопросов не больше двенадцати, ключ устойчив", () => {
    const aspects = natalSections(chart).find((s) => s.id === "aspects");
    assert.ok(aspects && aspects.slots.length > 0 && aspects.slots.length <= 12);
    for (const slot of aspects!.slots) {
      assert.match(slot.id, /^natal_aspect_[a-z_]+_(conjunction|sextile|square|trine|opposition)$/);
      assert.equal(natalTextKey(slot, chart), slot.id);
    }
  });

  it("промпты собираются для всех видов вопросов", () => {
    const sign = buildNatalRequest({ kind: "natal_body_sign", slotLabel: "Солнце в знаке", bodyName: "Солнце", sign: "leo", retrograde: false });
    assert.ok(sign.user.includes("во Льве"));
    assert.equal(sign.version, 1);
    const retro = buildNatalRequest({ kind: "natal_body_sign", slotLabel: "Меркурий", bodyName: "Меркурий", sign: "virgo", retrograde: true });
    assert.ok(retro.user.includes("ретроградна"));
    const house = buildNatalRequest({ kind: "natal_body_house", slotLabel: "Венера в доме", bodyName: "Венера", house: 7 });
    assert.ok(house.user.includes("7 доме") && house.user.includes("партнёрство"));
    const angle = buildNatalRequest({ kind: "natal_angle_sign", slotLabel: "Асцендент", angle: "asc", sign: "scorpio" });
    assert.ok(angle.user.includes("асцендент в Скорпионе"));
    const aspect = buildNatalRequest({ kind: "natal_aspect", slotLabel: "Тригон", a: "sun", b: "moon", aspect: "trine" });
    assert.ok(aspect.user.includes(ASPECTS.trine.name) && aspect.user.includes("Солнце"));
    for (const r of [sign, retro, house, angle, aspect]) {
      assert.ok(r.system.includes("Не предсказывай события"), "блок ограничений на месте");
      assert.ok(!r.user.includes("undefined"));
    }
  });
});

describe("знак Солнца по дате остаётся согласован с расчётом", () => {
  it("совпадает с настоящим положением Солнца на всех контрольных датах", () => {
    for (const c of SWISS_EPHEMERIS.cases) {
      const [, m, d] = c.localDate.split("-").map(Number);
      const rough = sunSign(d, m);
      const real = signAt(c.bodies.sun.lon);
      assert.equal(rough.sign.key, real.key, `${c.localDate}: ${rough.sign.name} против ${real.name}`);
    }
  });

  it("каждый день года попадает в знак; январь — Козерог и Водолей", () => {
    const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= DAYS[m - 1]; d++) {
        assert.ok(sunSign(d, m).sign.key, `${d}.${m}: знак не найден`);
      }
    }
    // Раньше даты с 1 по 19 января проваливались в запасной вариант и
    // показывали Рыб вместо Козерога.
    assert.equal(sunSign(1, 1).sign.key, "capricorn");
    assert.equal(sunSign(15, 1).sign.key, "capricorn");
    assert.equal(sunSign(19, 1).sign.key, "capricorn");
    assert.equal(sunSign(20, 1).sign.key, "aquarius");
    assert.equal(sunSign(25, 12).sign.key, "capricorn");
    assert.equal(sunSign(21, 12).sign.key, "sagittarius");
    assert.equal(sunSign(19, 1).onCusp, true);
    assert.equal(sunSign(22, 12).onCusp, true);
  });
});

describe("короткие справки страницы по дате", () => {
  const chart = buildNatalChart({ date: "1990-07-26", time: null, tz: null, latitude: null, longitude: null });

  it("по справке на каждую планету карты, без асцендента и домов", () => {
    const slots = briefSlots(chart);
    assert.equal(slots.length, 11, "десять классических тел плюс северный узел");
    assert.ok(slots.every((s) => s.free), "справки открыты всем");
    assert.ok(!slots.some((s) => s.id.includes("asc") || s.id.includes("house")));
  });

  it("ключ содержит планету и знак и не зависит от ретроградности", () => {
    const slots = briefSlots(chart);
    const sun = slots.find((s) => s.id === "natal_brief_sun");
    assert.ok(sun);
    assert.equal(natalTextKey(sun, chart), "natal_brief_sun_leo");
    assert.equal(sun.label, "Солнце во Льве");

    // Сатурн 26.07.1990 ретрограден — в ключе это не отражается.
    const saturn = slots.find((s) => s.id === "natal_brief_saturn");
    assert.ok(saturn);
    assert.equal(chartBody(chart, "saturn")?.retrograde, true);
    assert.equal(natalTextKey(saturn, chart), "natal_brief_saturn_capricorn");
  });

  it("всего ключей — по знаку на планету", () => {
    const keys = new Set<string>();
    for (const iso of ["1990-01-15", "1990-04-15", "1990-07-26", "1990-10-15", "1998-07-13", "2024-02-29"]) {
      const c = buildNatalChart({ date: iso, time: null, tz: null, latitude: null, longitude: null });
      for (const slot of briefSlots(c)) keys.add(natalTextKey(slot, c) as string);
    }
    assert.ok(keys.size > 0 && keys.size <= 11 * 12);
    assert.ok([...keys].every((k) => /^natal_brief_[a-z_]+_[a-z]+$/.test(k)), [...keys].join(" "));
  });

  it("API находит справку по идентификатору, иначе её нельзя было бы запросить", () => {
    assert.ok(findNatalSlot("natal_brief_moon", chart));
    assert.equal(findNatalSlot("natal_brief_nonsense", chart), null);
  });

  it("промпт справки отдельный: короткий и без обещаний продолжения", () => {
    const brief = buildNatalRequest({ kind: "natal_brief", slotLabel: "Солнце во Льве", bodyName: "Солнце", sign: "leo" });
    const full = buildNatalRequest({
      kind: "natal_body_sign",
      slotLabel: "Солнце в знаке",
      bodyName: "Солнце",
      sign: "leo",
      retrograde: false,
    });
    assert.notEqual(brief.system, full.system, "платный текст пишется по другому промпту");
    assert.ok(brief.system.includes("Один абзац"));
    assert.ok(brief.system.includes("Не предсказывай события"), "ограничения на месте и здесь");
    assert.ok(brief.maxTokens < full.maxTokens);
    assert.ok(brief.user.includes("Солнце во Льве"));
  });
});
