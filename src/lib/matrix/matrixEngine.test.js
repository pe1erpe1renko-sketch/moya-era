/**
 * Эталонные значения взяты со скриншотов конкурентов.
 * Если тест падает — движок сломан, дальше идти нельзя.
 */
import { calculateMatrix, calculatePair, dayArcana } from './matrixEngine.js';

const CASES = [
  {
    label: 'Пётр 13.07.1998 (tvoyamatritsa + acronum + ma-nu)',
    date: '1998-07-13',
    core: { W: 13, N: 7, E: 9, S: 11, C: 4, NW: 20, NE: 16, SE: 20, SW: 6 },
    physics: [13, 3, 17, 21, 4, 13, 9],
    energy:  [7, 18, 11, 15, 4, 15, 11],
    emotions:[20, 21, 10, 9, 8, 10, 20],
    total: { physics: 8, energy: 9, emotions: 17 },
    male: [20, 20, 4],
    female: [16, 6, 22],
    purpose: { sky: 18, earth: 22, personal: 4, social: 8, spiritual: 12, planetary: 20 },
  },
  {
    label: 'Роман 09.04.1992 (tvoyamatritsa)',
    date: '1992-04-09',
    core: { W: 9, N: 4, E: 21, S: 7, C: 5, NW: 13, NE: 7, SE: 10, SW: 16 },
    physics: [9, 5, 14, 19, 5, 8, 21],
    energy:  [4, 13, 9, 14, 5, 12, 7],
    emotions:[13, 18, 5, 6, 10, 20, 10],
    total: { physics: 9, energy: 10, emotions: 10 },
    male: [13, 10, 5],
    female: [7, 16, 5],
    purpose: { sky: 11, earth: 3, personal: 14, social: 10, spiritual: 6, planetary: 16 },
  },
  {
    label: '07.06.1998 (matricasudbi-kalkulator)',
    date: '1998-06-07',
    core: { W: 7, N: 6, E: 9, S: 22, C: 8, NW: 13, NE: 15, SE: 4, SW: 11 },
    physics: [7, 22, 15, 5, 8, 17, 9],
    energy:  [6, 20, 14, 22, 8, 3, 22],
    emotions:[13, 6, 11, 9, 16, 20, 4],
    total: { physics: 11, energy: 14, emotions: 16 },
    male: [13, 4, 17],
    female: [15, 11, 8],
    purpose: { sky: 10, earth: 16, personal: 8, social: 7, spiritual: 15, planetary: 22 },
  },
];

let failed = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.log(`   ✗ ${label}: получено ${JSON.stringify(got)}, ждали ${JSON.stringify(want)}`); }
  return ok;
};

for (const c of CASES) {
  console.log(`\n▸ ${c.label}`);
  const m = calculateMatrix(c.date);
  const before = failed;

  check('внешние точки', m.core, c.core);
  check('чакры: физика',  m.chakras.rows.map(r => r.physics),  c.physics);
  check('чакры: энергия', m.chakras.rows.map(r => r.energy),   c.energy);
  check('чакры: эмоции',  m.chakras.rows.map(r => r.emotions), c.emotions);
  check('чакры: итог',    m.chakras.total, c.total);
  check('род: мужская',   [m.ancestral.male.first, m.ancestral.male.second, m.ancestral.male.result], c.male);
  check('род: женская',   [m.ancestral.female.first, m.ancestral.female.second, m.ancestral.female.result], c.female);
  check('предназначения', {
    sky: m.purpose.personal.sky,
    earth: m.purpose.personal.earth,
    personal: m.purpose.personal.result,
    social: m.purpose.social.result,
    spiritual: m.purpose.spiritual.result,
    planetary: m.purpose.planetary.result,
  }, c.purpose);

  if (failed === before) console.log('   ✓ всё сошлось');
}

// Краевые случаи
console.log('\n▸ Краевые случаи');
const edge = calculateMatrix('2000-01-01');
console.log(`   01.01.2000 → W=${edge.core.W} N=${edge.core.N} E=${edge.core.E} C=${edge.core.C}`);
const leap = calculateMatrix('2024-02-29');
console.log(`   29.02.2024 → W=${leap.core.W} N=${leap.core.N} E=${leap.core.E} C=${leap.core.C}`);
try { calculateMatrix('2023-02-30'); console.log('   ✗ несуществующая дата не отловлена'); failed++; }
catch { console.log('   ✓ несуществующая дата отклонена'); }

const inRange = calculateMatrix('1985-12-31').timeline.every(p => p.arcana >= 1 && p.arcana <= 22);
console.log(inRange ? '   ✓ все точки шкалы в диапазоне 1–22' : '   ✗ выход за диапазон');

// ═══ АРКАН ДНЯ ═══
console.log('\n▸ Аркан дня');

// Формула: число + месяц + год + аркан периода → приведение к 1–22
// 25 + 8 + 2026 + 21 = 2080 → 2+0+8+0 = 10
check('формула на контрольном примере', dayArcana('2026-08-25', 21), 10);

// Аркан периода обязан влиять: иначе аркан дня был бы одинаков у всех людей
const sameDayDifferentPeriods = new Set(
  Array.from({ length: 22 }, (_, i) => dayArcana('2026-08-25', i + 1))
);
console.log(sameDayDifferentPeriods.size > 1
  ? `   ✓ в один день у разных периодов разные арканы (${sameDayDifferentPeriods.size} значений)`
  : (failed++, '   ✗ аркан дня не зависит от периода'));

// Число обязано меняться изо дня в день
const week = ['2026-08-25','2026-08-26','2026-08-27','2026-08-28','2026-08-29','2026-08-30','2026-08-31']
  .map((d) => dayArcana(d, 21));
console.log(new Set(week).size >= 5
  ? `   ✓ меняется ежедневно: ${week.join(' → ')}`
  : (failed++, `   ✗ залипает: ${week.join(' → ')}`));

// Диапазон 1–22 на длинной дистанции: 5 лет × все возможные периоды
let outOfRange = 0;
for (let period = 1; period <= 22; period++) {
  for (let offset = 0; offset < 1825; offset++) {
    const d = new Date(Date.UTC(2026, 0, 1) + offset * 86400000);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const a = dayArcana(iso, period);
    if (!Number.isInteger(a) || a < 1 || a > 22) outOfRange++;
  }
}
if (outOfRange === 0) console.log('   ✓ 40 150 проверок: всегда целое число 1–22');
else { failed++; console.log(`   ✗ выход за диапазон: ${outOfRange} случаев`); }

// today: аркан периода и аркан дня — разные поля, их нельзя путать
const t = calculateMatrix('1998-07-13', new Date(2026, 7, 25)).today;
console.log(`   ▸ 13.07.1998 на 25.08.2026: период ${t.arcana}, сегодня ${t.dayArcana}, завтра ${t.tomorrowArcana}`);
check('аркан дня считается от периода', t.dayArcana, dayArcana(t.date, t.arcana));
if (t.tomorrowArcana === t.dayArcana) { failed++; console.log('   ✗ завтрашний аркан совпал с сегодняшним'); }
else console.log('   ✓ завтрашний аркан отличается от сегодняшнего');

// Матрица не должна зависеть от того, в какой день её открыли
const a1 = calculateMatrix('1998-07-13', new Date(2026, 0, 1));
const a2 = calculateMatrix('1998-07-13', new Date(2026, 7, 25));
check('расчёт не зависит от текущей даты', a1.core, a2.core);

// ═══ ДИАГОНАЛИ (родовые лучи) ═══
// Эталон снят со схем tvoyamatritsa.ru. Формула: mid = угол + итог родовых
// линий, outer = угол + mid. Вариант «от центра матрицы» даёт 0 из 8.
console.log('\n▸ Диагонали');
const DIAG = [
  { date: '1998-07-13', want: { NW: [10, 3], NE: [6, 22], SE: [10, 3], SW: [14, 20] } },
  { date: '1998-06-07', want: { NW: [20, 6], NE: [22, 10], SE: [11, 15], SW: [18, 11] } },
];
for (const { date, want } of DIAG) {
  const d = calculateMatrix(date).diagonals;
  const got = {};
  for (const k of ['NW', 'NE', 'SE', 'SW']) got[k] = [d[k].mid, d[k].outer];
  if (check(`   ${date.split('-').reverse().join('.')}`, got, want)) {
    console.log(`   ✓ ${date.split('-').reverse().join('.')} — все четыре луча сошлись`);
  }
}

// ═══ СОВМЕСТИМОСТЬ ═══
// Эталон: tvoyamatritsa.ru, пара 13.07.1998 + 09.05.1998
console.log('\n▸ Совместимость');
const p = calculatePair('1998-07-13', '1998-05-09');
const beforePair = failed;

check('ядро пары', p.core,
  { W: 22, N: 12, E: 18, S: 16, C: 14, NW: 7, NE: 3, SE: 7, SW: 20 });

check('ось «физика»',
  [p.axes.horizontal.startOuter, p.axes.horizontal.startMid,
   p.axes.horizontal.endMid, p.axes.horizontal.endOuter],
  [4, 9, 5, 5]);

check('ось «энергия»',
  [p.axes.vertical.startOuter, p.axes.vertical.startMid,
   p.axes.vertical.endMid, p.axes.vertical.endOuter],
  [20, 8, 3, 19]);

check('предназначения пары', {
  sky: p.purpose.personal.sky,           // «Небо»
  earth: p.purpose.personal.earth,       // «Земля»
  relations: p.purpose.personal.result,  // «Отношения»
  male: p.ancestral.male.result,         // «М»
  female: p.ancestral.female.result,     // «Ж»
  merge: p.purpose.social.result,        // «Слияние»
  harmony: p.purpose.spiritual.result,   // «Гармония»
}, { sky: 10, earth: 4, relations: 14, male: 14, female: 5, merge: 19, harmony: 6 });

// Порядок партнёров не должен влиять на результат
const swapped = calculatePair('1998-05-09', '1998-07-13');
check('перестановка партнёров', swapped.core, p.core);

// Личные матрицы партнёров внутри пары остаются нетронутыми
check('матрица партнёра А', p.partners.a.core, calculateMatrix('1998-07-13').core);

if (failed === beforePair) console.log('   ✓ всё сошлось');

console.log(failed === 0 ? '\n✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ\n' : `\n❌ ОШИБОК: ${failed}\n`);
