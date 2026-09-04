/**
 * Тесты движка эфемерид.
 *
 * 1. Положения тел, звёздное время, наклон эклиптики и истинный узел
 *    сравниваются с эталоном NASA JPL DE421 (fixtures/jplDe421.ts,
 *    24 даты с 1931 по 2029 год). Допуски в разы больше измеренных
 *    расхождений, но в сотни раз меньше градуса зодиака.
 * 2. Дома проверяются по определению: асцендент лежит на горизонте на
 *    востоке, MC на меридиане, куспиды Плацидуса делят полудуги на трети.
 *    Прямое восхождение и высоту для этих проверок считает сама
 *    библиотека, независимо от формул в houses.ts.
 * 3. Поиск Design-даты, ретроградность, знаки и форматирование.
 *
 * Запуск: npm test (или node --import tsx --test src/lib/ephemeris/*.test.ts).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as A from "astronomy-engine";
import { JPL_DE421 } from "./fixtures/jplDe421";
import {
  HD_BODIES,
  HOUSE_SYSTEMS,
  NATAL_BODIES,
  acosd,
  angleDiff,
  ascendant,
  bodyLongitude,
  bodyPosition,
  computeSky,
  dateFromJulianDay,
  degreeInSign,
  designMoment,
  formatDms,
  formatZodiac,
  houseOf,
  houses,
  julianDay,
  meanLilithLongitude,
  meanNodeLongitude,
  meanObliquity,
  midheaven,
  norm360,
  positions,
  searchSunLongitude,
  signAt,
  sind,
  siderealTime,
  tand,
  toDms,
  trueNodeLongitude,
  trueObliquity,
  zodiacPosition,
  type BodyId,
} from "./index";

const ARCSEC = 1 / 3600;

/** Допуски. Измерено на 24 датах: Нептун 18″, Луна 4″, узел 13″, GAST 8″, наклон 0,05″. */
const TOL = {
  longitude: 30 * ARCSEC,
  latitude: 30 * ARCSEC,
  distanceRel: 5e-4,
  node: 60 * ARCSEC,
  gast: 20 * ARCSEC,
  obliquity: 1 * ARCSEC,
};

const PLACES = [
  { name: "Москва", lat: 55.7558, lon: 37.6173 },
  { name: "Новосибирск", lat: 55.0302, lon: 82.9204 },
  { name: "Сочи", lat: 43.5855, lon: 39.7231 },
  { name: "Рейкьявик", lat: 64.1355, lon: -21.8954 },
  { name: "Кито", lat: -0.1807, lon: -78.4678 },
  { name: "Сидней", lat: -33.8688, lon: 151.2093 },
  { name: "Буэнос-Айрес", lat: -34.6037, lon: -58.3816 },
];

/** Каждая четвёртая дата эталона: 1931, 1953, 1977, 1990, 1999, 2011 */
const SAMPLE_DATES = JPL_DE421.dates.filter((_, i) => i % 4 === 0).map((d) => new Date(d.utc));

/** Экваториальные координаты даты (RA и Dec в градусах) точки эклиптики силами библиотеки. */
function equatorialOfDate(longitude: number, t: A.AstroTime): { ra: number; dec: number } {
  const ect = A.VectorFromSphere(new A.Spherical(0, longitude, 1), t);
  const eqd = A.RotateVector(A.Rotation_ECT_EQD(t), ect);
  const eq = A.EquatorFromVector(eqd);
  return { ra: norm360(eq.ra * 15), dec: eq.dec };
}

/** Высота и азимут точки эклиптики над местом, тоже силами библиотеки. */
function horizonOf(longitude: number, date: Date, lat: number, lon: number) {
  const t = A.MakeTime(date);
  const { ra, dec } = equatorialOfDate(longitude, t);
  return A.Horizon(t, new A.Observer(lat, lon, 0), ra / 15, dec);
}

describe("положения тел против NASA JPL DE421", () => {
  for (const ref of JPL_DE421.dates) {
    it(ref.utc, () => {
      const date = new Date(ref.utc);
      for (const [body, expected] of Object.entries(ref.bodies)) {
        const p = bodyPosition(body as BodyId, date);
        const dLon = Math.abs(angleDiff(p.longitude, expected.lon));
        assert.ok(
          dLon <= TOL.longitude,
          `${body}: долгота ${p.longitude} против ${expected.lon}, разница ${(dLon / ARCSEC).toFixed(1)}″`,
        );
        assert.ok(Math.abs(p.latitude - expected.lat) <= TOL.latitude, `${body}: широта ${p.latitude} против ${expected.lat}`);
        assert.ok(
          p.distance !== null && Math.abs(p.distance - expected.dist) / expected.dist <= TOL.distanceRel,
          `${body}: расстояние ${p.distance} против ${expected.dist}`,
        );
      }
      assert.ok(Math.abs(angleDiff(siderealTime(date), ref.gast * 15)) <= TOL.gast, "звёздное время");
      assert.ok(Math.abs(trueObliquity(date) - ref.obliquity) <= TOL.obliquity, "наклон эклиптики");
      const node = trueNodeLongitude(date);
      assert.ok(Math.abs(angleDiff(node, ref.trueNode)) <= TOL.node, `истинный узел ${node} против ${ref.trueNode}`);
    });
  }

  it("средний наклон отличается от истинного только на нутацию", () => {
    for (const d of SAMPLE_DATES) assert.ok(Math.abs(meanObliquity(d) - trueObliquity(d)) < 12 * ARCSEC);
  });

  it("средний узел и Лилит на J2000 совпадают с ELP-2000", () => {
    const j2000 = new Date("2000-01-01T12:00:00Z");
    assert.ok(Math.abs(meanNodeLongitude(j2000) - 125.0445479) < 1e-3);
    assert.ok(Math.abs(meanLilithLongitude(j2000) - 263.3532465) < 1e-3);
  });

  it("Земля напротив Солнца, Южный узел напротив Северного, узлы идут назад", () => {
    for (const d of SAMPLE_DATES) {
      const [sun, earth, north, south] = positions(d, ["sun", "earth", "north_node", "south_node"]);
      assert.ok(Math.abs(angleDiff(earth.longitude, sun.longitude + 180)) < 1e-9);
      assert.ok(Math.abs(angleDiff(south.longitude, north.longitude + 180)) < 1e-9);
      assert.ok(bodyPosition("north_node", d, { nodeType: "mean" }).speed < 0);
    }
  });
});

describe("скорость и ретроградность", () => {
  it("Меркурий: ретроградный 10.04.2024, директный 15.05.2024", () => {
    assert.equal(bodyPosition("mercury", new Date("2024-04-10T12:00:00Z")).retrograde, true);
    assert.equal(bodyPosition("mercury", new Date("2024-05-15T12:00:00Z")).retrograde, false);
  });

  it("Марс ретроградный 01.12.2022", () => {
    assert.equal(bodyPosition("mars", new Date("2022-12-01T12:00:00Z")).retrograde, true);
  });

  it("Солнце и Луна всегда идут вперёд с привычной скоростью", () => {
    for (const d of SAMPLE_DATES) {
      const sun = bodyPosition("sun", d);
      const moon = bodyPosition("moon", d);
      assert.ok(sun.speed > 0.95 && sun.speed < 1.03, `Солнце ${sun.speed}`);
      assert.ok(moon.speed > 11.7 && moon.speed < 15.5, `Луна ${moon.speed}`);
    }
  });
});

describe("дома", () => {
  const cases = SAMPLE_DATES.flatMap((d) => PLACES.map((p) => ({ d, p })));

  it("асцендент лежит на восточном горизонте, MC на меридиане", () => {
    for (const { d, p } of cases) {
      const h = houses(d, p.lat, p.lon);
      const asc = horizonOf(h.asc, d, p.lat, p.lon);
      assert.ok(Math.abs(asc.altitude) < 0.01, `${p.name} ${d.toISOString()}: высота асцендента ${asc.altitude}`);
      assert.ok(asc.azimuth > 0 && asc.azimuth < 180, `${p.name}: азимут асцендента ${asc.azimuth}`);
      const mc = horizonOf(h.mc, d, p.lat, p.lon);
      assert.ok(Math.abs(sind(mc.azimuth)) < 2e-4, `${p.name}: азимут MC ${mc.azimuth}`);
      assert.ok(mc.altitude > 0, `${p.name}: MC под горизонтом`);
    }
  });

  it("асцендент всегда в пределах 180° после MC", () => {
    const eps = 23.44;
    for (const phi of [-55, 0, 40, 55, 64]) {
      for (let a = 0; a < 360; a += 15) {
        const gap = angleDiff(ascendant(a, phi, eps), midheaven(a, eps));
        assert.ok(gap > 0 && gap <= 180, `φ=${phi} ARMC=${a}: ${gap}`);
      }
    }
  });

  it("куспиды Плацидуса делят полудуги на трети (по определению)", () => {
    for (const { d, p } of cases) {
      const h = houses(d, p.lat, p.lon, "placidus");
      assert.equal(h.fallback, false, `${p.name}: Плацидус не должен откатываться`);
      const t = A.MakeTime(d);
      const check = (cusp: number, expectRa: (sa: number) => number, label: string) => {
        const { ra, dec } = equatorialOfDate(cusp, t);
        const sa = acosd(-tand(p.lat) * tand(dec));
        const diff = angleDiff(ra, expectRa(sa));
        assert.ok(Math.abs(diff) < 1e-4, `${p.name} ${d.toISOString()} ${label}: ${diff}`);
      };
      check(h.cusps[10], (sa) => h.armc + sa / 3, "дом 11");
      check(h.cusps[11], (sa) => h.armc + (2 * sa) / 3, "дом 12");
      check(h.cusps[1], (sa) => h.armc + 180 - (2 * (180 - sa)) / 3, "дом 2");
      check(h.cusps[2], (sa) => h.armc + 180 - (180 - sa) / 3, "дом 3");
    }
  });

  it("на экваторе Плацидус и Кох совпадают и делят экватор поровну", () => {
    for (const d of SAMPLE_DATES) {
      const pl = houses(d, 0, 30, "placidus");
      const ko = houses(d, 0, 30, "koch");
      const t = A.MakeTime(d);
      for (let i = 0; i < 12; i++) {
        assert.ok(Math.abs(angleDiff(pl.cusps[i], ko.cusps[i])) < 1e-6, `дом ${i + 1}: Плацидус и Кох`);
        const { ra } = equatorialOfDate(pl.cusps[i], t);
        const expect = pl.armc + 30 * ((i - 9 + 12) % 12);
        assert.ok(Math.abs(angleDiff(ra, expect)) < 1e-6, `дом ${i + 1}: прямое восхождение`);
      }
    }
  });

  it("все системы согласны в асценденте и MC, дома идут по кругу и напротив друг друга", () => {
    for (const { d, p } of cases) {
      const ref = houses(d, p.lat, p.lon, "equal");
      for (const sys of HOUSE_SYSTEMS) {
        const h = houses(d, p.lat, p.lon, sys.id);
        assert.equal(h.cusps.length, 12);
        assert.equal(h.fallback, false);
        assert.ok(Math.abs(angleDiff(h.asc, ref.asc)) < 1e-9 && Math.abs(angleDiff(h.mc, ref.mc)) < 1e-9, sys.id);
        if (sys.id !== "whole") assert.ok(Math.abs(angleDiff(h.cusps[0], h.asc)) < 1e-9, `${sys.id}: дом 1 = асцендент`);
        assert.ok(Math.abs(angleDiff(h.cusps[9], h.mc)) < 1e-9 || sys.id === "equal" || sys.id === "whole", `${sys.id}: дом 10 = MC`);
        for (let i = 0; i < 12; i++) {
          const step = norm360(h.cusps[(i + 1) % 12] - h.cusps[i]);
          assert.ok(step > 0 && step < 180, `${sys.id} ${p.name}: шаг от дома ${i + 1} равен ${step}`);
        }
        for (let i = 0; i < 6; i++) {
          assert.ok(Math.abs(angleDiff(h.cusps[i + 6], h.cusps[i] + 180)) < 1e-9, `${sys.id}: дом ${i + 7} напротив дома ${i + 1}`);
        }
      }
    }
  });

  it("за полярным кругом Плацидус и Кох заменяются Порфирием с пометкой", () => {
    const d = new Date("1990-07-26T09:00:00Z");
    const pl = houses(d, 68.97, 33.08, "placidus"); // Мурманск
    assert.equal(pl.requested, "placidus");
    assert.equal(pl.system, "porphyry");
    assert.equal(pl.fallback, true);
    const ko = houses(d, 69.35, 88.2, "koch"); // Норильск
    assert.equal(ko.system, "porphyry");
    assert.equal(ko.fallback, true);
    assert.equal(houses(d, 68.97, 33.08, "equal").fallback, false);
  });

  it("houseOf находит дом по долготе", () => {
    const h = houses(new Date("1990-07-26T09:00:00Z"), 55.7558, 37.6173);
    assert.equal(houseOf(h.asc, h.cusps), 1);
    assert.equal(houseOf(h.asc + 0.5, h.cusps), 1);
    assert.equal(houseOf(h.cusps[1] - 0.01, h.cusps), 1);
    assert.equal(houseOf(h.cusps[1], h.cusps), 2);
    assert.equal(houseOf(h.mc, h.cusps), 10);
    assert.equal(houseOf(h.ic, h.cusps), 4);
    assert.equal(houseOf(h.asc - 0.01, h.cusps), 12);
  });
});

describe("Design-дата дизайна человека", () => {
  it("Солнце на Design-дату ровно на 88° раньше натального, от 86 до 93 суток", () => {
    for (const iso of [
      "1990-07-26T09:00:00Z",
      "1961-04-12T06:07:00Z",
      "2004-11-30T18:15:00Z",
      "2024-01-15T00:00:00Z",
      "1975-10-05T12:00:00Z",
    ]) {
      const natal = new Date(iso);
      const design = designMoment(natal);
      const target = norm360(bodyLongitude("sun", natal) - 88);
      assert.ok(Math.abs(angleDiff(bodyLongitude("sun", design), target)) < 1e-5, iso);
      const days = (natal.getTime() - design.getTime()) / 86_400_000;
      assert.ok(days > 86 && days < 93, `${iso}: ${days} суток`);
    }
  });

  it("26.07.1990 09:00 UTC → 25.04.1990 14:42 UTC, 91,8 суток", () => {
    const design = designMoment(new Date("1990-07-26T09:00:00Z"));
    assert.ok(Math.abs(design.getTime() - Date.parse("1990-04-25T14:42:13Z")) < 60_000, design.toISOString());
  });

  it("searchSunLongitude находит равноденствие 2024 года", () => {
    const t = searchSunLongitude(0, new Date("2024-03-18T00:00:00Z"));
    assert.ok(Math.abs(t.getTime() - Date.parse("2024-03-20T03:06:00Z")) < 120_000, t.toISOString());
  });
});

describe("зодиак и углы", () => {
  it("знаки по долготе", () => {
    assert.equal(signAt(0).key, "aries");
    assert.equal(signAt(29.999).key, "aries");
    assert.equal(signAt(30).key, "taurus");
    assert.equal(signAt(123.13).key, "leo");
    assert.equal(signAt(359.99).key, "pisces");
    assert.equal(signAt(-10).key, "pisces");
  });

  it("запись положения", () => {
    assert.equal(formatZodiac(123.1308), "3°07′ Льва");
    assert.equal(formatZodiac(123.1308, { seconds: true }), "3°07′51″ Льва");
    assert.equal(zodiacPosition(0).label, "0°00′ Овна");
    assert.equal(zodiacPosition(123.1308).sign.inCase, "во Льве");
    assert.equal(degreeInSign(390), 0);
    assert.equal(formatDms(29.99999), "29°59′");
    assert.deepEqual(toDms(3.1308), { deg: 3, min: 7, sec: 51 });
  });

  it("нормализация углов", () => {
    assert.equal(norm360(-10), 350);
    assert.equal(angleDiff(10, 350), 20);
    assert.equal(angleDiff(350, 10), -20);
    assert.equal(angleDiff(180, 0), 180);
  });

  it("юлианская дата", () => {
    const j = new Date("2000-01-01T12:00:00Z");
    assert.equal(julianDay(j), 2451545);
    assert.equal(dateFromJulianDay(2451545).getTime(), j.getTime());
  });
});

describe("computeSky", () => {
  it("даёт тела и дома, если есть место", () => {
    const sky = computeSky(new Date("1990-07-26T09:00:00Z"), { place: { latitude: 55.7558, longitude: 37.6173 } });
    assert.equal(sky.positions.length, NATAL_BODIES.length);
    assert.ok(sky.houses && sky.houses.system === "placidus");
    assert.ok(sky.obliquity > 23.4 && sky.obliquity < 23.5);
  });

  it("без места домов нет; для дизайна человека тринадцать активаций", () => {
    const sky = computeSky(new Date("1990-07-26T09:00:00Z"), { bodies: HD_BODIES });
    assert.equal(sky.houses, null);
    assert.equal(sky.positions.length, 13);
  });
});
