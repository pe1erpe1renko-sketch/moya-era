/**
 * ДВИЖОК РАСЧЁТА «МАТРИЦА СУДЬБЫ»
 * ================================
 * Чистые функции, ноль зависимостей, ноль UI. Модуль можно без изменений
 * перенести на бэкенд.
 *
 * Методика восстановлена обратной инженерией по четырём независимым
 * сервисам (tvoyamatritsa.ru, matricasudbi-kalkulator.ru, acronum.ru,
 * ma-nu.ru) и сверена на трёх датах — см. matrixEngine.test.js.
 *
 * ГЛАВНОЕ ПРАВИЛО: приведение к Аркану 1–22 выполняется СУММОЙ ЦИФР
 * (30 → 3), а НЕ вычитанием 22 (30 → 8). Это критично: при вычитании
 * вся матрица разъезжается.
 */

// ═══════════════════════════════════════════════════════════
// БАЗА
// ═══════════════════════════════════════════════════════════

/** Приведение любого числа к Аркану 1–22 суммированием цифр. */
export function toArcana(n) {
  let x = Math.abs(Math.trunc(n));
  while (x > 22) {
    x = String(x).split('').reduce((s, d) => s + Number(d), 0);
  }
  return x;
}

/** Сумма двух Арканов с приведением. Базовая операция всей методики. */
const sum = (a, b) => toArcana(a + b);

// ═══════════════════════════════════════════════════════════
// 1. ВОСЕМЬ ВНЕШНИХ ТОЧЕК + ЦЕНТР
// ═══════════════════════════════════════════════════════════

/**
 * Коды точек — то, на что вешаются тексты трактовок.
 * Позиции даны по сторонам света: W — запад (слева), N — север (сверху).
 */
export const POINT_CODES = {
  W:  { code: 'W',  title: 'Портрет личности',     hint: 'День рождения. Как вас видят другие.' },
  N:  { code: 'N',  title: 'Таланты',              hint: 'Месяц рождения. Дары от природы.' },
  E:  { code: 'E',  title: 'Родовой дар',          hint: 'Год рождения. Что передано родом.' },
  S:  { code: 'S',  title: 'Кармическая задача',   hint: 'Что важно проработать в этой жизни.' },
  C:  { code: 'C',  title: 'Зона комфорта',        hint: 'Ядро личности. Точка «Я».' },
  NW: { code: 'NW', title: 'Мужская линия рода',   hint: 'Программа по линии отца.' },
  NE: { code: 'NE', title: 'Женская линия рода',   hint: 'Программа по линии матери.' },
  SE: { code: 'SE', title: 'Денежный канал',       hint: 'Через что приходят ресурсы.' },
  SW: { code: 'SW', title: 'Линия отношений',      hint: 'Сценарии в любви и партнёрстве.' },
};

export function buildCore(day, month, year) {
  const W = toArcana(day);
  const N = toArcana(month);
  const E = toArcana(year);            // 1998 → 27 → 9
  const S = toArcana(W + N + E);
  const C = toArcana(W + N + E + S);

  return {
    W, N, E, S, C,
    NW: sum(W, N),
    NE: sum(N, E),
    SE: sum(E, S),
    SW: sum(S, W),
  };
}

// ═══════════════════════════════════════════════════════════
// 2. ОСИ (горизонталь и вертикаль)
// ═══════════════════════════════════════════════════════════

/**
 * Ось строится дроблением пополам: сначала середина между краем и центром,
 * затем середины получившихся отрезков.
 *
 * ВНИМАНИЕ: ось несимметрична. От W до центра — три промежуточные точки,
 * от центра до E — одна (для чакральной таблицы). Так у всех четырёх
 * эталонных сервисов; при симметричном делении таблица не сходится.
 */
function buildAxis(startPoint, endPoint, center) {
  const midStart = sum(startPoint, center);   // середина «начало ↔ центр»
  const midEnd = sum(center, endPoint);       // середина «центр ↔ конец»

  return {
    start: startPoint,
    startOuter: sum(startPoint, midStart),    // ближе к краю
    startMid: midStart,
    startInner: sum(midStart, center),        // ближе к центру
    center,
    endMid: midEnd,
    endOuter: sum(midEnd, endPoint),
    end: endPoint,
  };
}

export function buildAxes(core) {
  return {
    horizontal: buildAxis(core.W, core.E, core.C),  // колонка «Физика»
    vertical: buildAxis(core.N, core.S, core.C),    // колонка «Энергия»
  };
}

// ═══════════════════════════════════════════════════════════
// 3. ДИАГОНАЛИ (родовые лучи)
// ═══════════════════════════════════════════════════════════

/**
 * Между углом и центром — две точки: середина луча и ближняя к углу.
 *
 * ВНИМАНИЕ: точка mid считается НЕ от центра матрицы, а от итога родовых
 * линий (социализации). Это восстановлено по tvoyamatritsa.ru и сверено
 * на двух датах — 13.07.1998 и 07.06.1998, по 4 луча в каждой.
 * Вариант «от центра» даёт 0 совпадений из 8.
 *
 * Логика в том, что диагонали — родовые лучи, поэтому и опорное число
 * у них родовое, а не личное.
 */
function buildRay(corner, anchor) {
  const mid = sum(corner, anchor);
  return { corner, outer: sum(corner, mid), mid };
}

/** @param {number} anchor — итог родовых линий (purpose.social.result) */
export function buildDiagonals(core, anchor) {
  return {
    NW: buildRay(core.NW, anchor),
    NE: buildRay(core.NE, anchor),
    SE: buildRay(core.SE, anchor),
    SW: buildRay(core.SW, anchor),
  };
}

// ═══════════════════════════════════════════════════════════
// 4. ЧАКРАЛЬНАЯ ТАБЛИЦА
// ═══════════════════════════════════════════════════════════

export const CHAKRAS = [
  { key: 'sahasrara',    name: 'Сахасрара',    sphere: 'Миссия',                    color: '#8E44AD' },
  { key: 'ajna',         name: 'Аджна',        sphere: 'Судьба, эгрегоры',          color: '#1F3A93' },
  { key: 'vishuddha',    name: 'Вишудха',      sphere: 'Предназначение, творчество',color: '#3BAFDA' },
  { key: 'anahata',      name: 'Анахата',      sphere: 'Отношения, картина мира',   color: '#4CAF50' },
  { key: 'manipura',     name: 'Манипура',     sphere: 'Статус, владение',          color: '#F7D02C' },
  { key: 'svadhisthana', name: 'Свадхистана',  sphere: 'Детская любовь и радость',  color: '#F0932B' },
  { key: 'muladhara',    name: 'Муладхара',    sphere: 'Тело, материя',             color: '#D63031' },
];

/**
 * «Физика» — горизонтальная ось, «Энергия» — вертикальная,
 * «Эмоции» — их сумма. Итог — сумма всей колонки.
 */
export function buildChakras(axes) {
  const h = axes.horizontal;
  const v = axes.vertical;

  const physics = [h.start, h.startOuter, h.startMid, h.startInner, h.center, h.endMid, h.end];
  const energy  = [v.start, v.startOuter, v.startMid, v.startInner, v.center, v.endMid, v.end];

  const rows = CHAKRAS.map((chakra, i) => ({
    ...chakra,
    physics: physics[i],
    energy: energy[i],
    emotions: sum(physics[i], energy[i]),
  }));

  const total = (field) => toArcana(rows.reduce((acc, r) => acc + r[field], 0));

  return {
    rows,
    total: {
      physics: total('physics'),
      energy: total('energy'),
      emotions: total('emotions'),
    },
  };
}

// ═══════════════════════════════════════════════════════════
// 5. РОДОВЫЕ ПРОГРАММЫ
// ═══════════════════════════════════════════════════════════

export function buildAncestral(core) {
  return {
    male:   { first: core.NW, second: core.SE, result: sum(core.NW, core.SE) },
    female: { first: core.NE, second: core.SW, result: sum(core.NE, core.SW) },
  };
}

// ═══════════════════════════════════════════════════════════
// 6. ПРЕДНАЗНАЧЕНИЯ
// ═══════════════════════════════════════════════════════════

export function buildPurpose(core, ancestral) {
  const sky = sum(core.N, core.S);        // Небо
  const earth = sum(core.W, core.E);      // Земля
  const personal = sum(sky, earth);       // Поиск себя
  const social = sum(ancestral.male.result, ancestral.female.result);
  const spiritual = sum(personal, social);
  const planetary = sum(spiritual, social);

  return {
    personal: { sky, earth, result: personal,
      title: 'Поиск себя',
      hint: 'Соединение мужского и женского. Способности, навыки, умения.' },
    social: { male: ancestral.male.result, female: ancestral.female.result, result: social,
      title: 'Социализация',
      hint: 'Социальная и родовая системы. Результаты и признание в социуме.' },
    spiritual: { result: spiritual,
      title: 'Духовная гармония',
      hint: 'Кто я для бога? Где божественное во мне?' },
    planetary: { result: planetary,
      title: 'Планетарное',
      hint: 'Планетарное предназначение человека.' },
  };
}

// ═══════════════════════════════════════════════════════════
// 7. ВОЗРАСТНАЯ ШКАЛА 0–80
// ═══════════════════════════════════════════════════════════

/**
 * Восемь внешних точек — вехи по 10 лет, по часовой стрелке от запада.
 * Внутри каждого сектора дробление: 5 лет (сумма соседних вех),
 * затем 2,5 и 7,5. Итого 32 периода по 2,5 года.
 * Это основа для «аркана дня» и уведомлений о смене периода.
 */
export function buildTimeline(core) {
  const milestones = [
    { age: 0,  arcana: core.W },
    { age: 10, arcana: core.NW },
    { age: 20, arcana: core.N },
    { age: 30, arcana: core.NE },
    { age: 40, arcana: core.E },
    { age: 50, arcana: core.SE },
    { age: 60, arcana: core.S },
    { age: 70, arcana: core.SW },
    { age: 80, arcana: core.W },
  ];

  const points = [];
  for (let i = 0; i < 8; i++) {
    const from = milestones[i];
    const to = milestones[i + 1];
    const half = sum(from.arcana, to.arcana);

    points.push(
      { age: from.age,       arcana: from.arcana,        kind: 'decade' },
      { age: from.age + 2.5, arcana: sum(from.arcana, half), kind: 'quarter' },
      { age: from.age + 5,   arcana: half,               kind: 'half' },
      { age: from.age + 7.5, arcana: sum(half, to.arcana),  kind: 'quarter' },
    );
  }
  return points;
}

/** Период, в котором человек находится сейчас. Ядро ежедневной выдачи. */
export function currentPeriod(timeline, birthDate, now = new Date()) {
  const birth = new Date(birthDate);
  const ageYears = (now - birth) / (365.2425 * 24 * 60 * 60 * 1000);
  const normalized = ((ageYears % 80) + 80) % 80;
  const index = Math.min(Math.floor(normalized / 2.5), timeline.length - 1);
  const point = timeline[index];
  const next = timeline[(index + 1) % timeline.length];

  return {
    age: Number(ageYears.toFixed(2)),
    from: point.age,
    to: point.age + 2.5,
    arcana: point.arcana,
    nextArcana: next.arcana,
    yearsToChange: Number((point.age + 2.5 - normalized).toFixed(2)),
  };
}

// ═══════════════════════════════════════════════════════════
// 7b. АРКАН ДНЯ
// ═══════════════════════════════════════════════════════════

/**
 * АРКАН ДНЯ = число + месяц + год сегодняшней даты + аркан текущего
 * периода жизни человека, приведённые к 1–22.
 *
 * Эта формула НЕ входит в методику расчёта матрицы, восстановленную по
 * сервисам-эталонам. Это наша собственная механика ежедневного возврата:
 * у конкурентов её нет. Менять её можно, менять формулы матрицы — нельзя.
 *
 * Аркан периода в формуле обязателен: без него аркан дня был бы одинаковым
 * у всех людей на планете. С ним у человека в периоде Императора и у
 * человека в периоде Влюблённых в один и тот же день разные арканы.
 */
export function dayArcana(isoDate, periodArcana) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error('Дата должна быть в формате YYYY-MM-DD');
  const [, y, m, d] = match.map(Number);
  return toArcana(d + m + y + periodArcana);
}

/** Date → 'YYYY-MM-DD' по местному времени пользователя. */
export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * АРКАН ЛИЧНОГО ГОДА = день + месяц рождения + текущий календарный год.
 *
 * Меняется раз в год, в день рождения. Отсюда берётся раздел «Личный год»:
 * какая энергия ведёт человека ближайшие двенадцать месяцев.
 *
 * Не путать с арканом периода жизни (2,5 года по возрастной шкале)
 * и с арканом дня.
 */
export function yearArcana(birthDate, year) {
  const { m, d } = parseDate(birthDate);
  return toArcana(d + m + year);
}

/**
 * Блок «сегодня» целиком: период жизни + аркан на сегодня + аркан на завтра.
 *
 * Завтрашний аркан нужен, потому что бот рассылает прогноз ВЕЧЕРОМ НА ЗАВТРА,
 * а кабинет утром показывает сегодняшний. Без обоих чисел вечернее сообщение
 * и экран разойдутся, и это будет выглядеть как ошибка расчёта.
 */
export function buildToday(timeline, birthDate, now = new Date()) {
  const period = currentPeriod(timeline, birthDate, now);
  const todayISO = toISODate(now);
  const tomorrowISO = toISODate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  return {
    ...period,                                        // arcana = аркан периода
    date: todayISO,
    dayArcana: dayArcana(todayISO, period.arcana),
    tomorrowDate: tomorrowISO,
    tomorrowArcana: dayArcana(tomorrowISO, period.arcana),
    year: now.getFullYear(),
    yearArcana: yearArcana(birthDate, now.getFullYear()),
  };
}

// ═══════════════════════════════════════════════════════════
// 8. ГЛАВНАЯ ФУНКЦИЯ
// ═══════════════════════════════════════════════════════════

/**
 * Достраивает полную матрицу из готового ядра.
 * Используется и для личной матрицы, и для парной — методика одна.
 *
 * ПОРЯДОК ВАЖЕН: диагонали зависят от родовых линий, поэтому ancestral
 * и purpose считаются раньше них.
 */
function buildFromCore(core) {
  const ancestral = buildAncestral(core);
  const purpose = buildPurpose(core, ancestral);
  const diagonals = buildDiagonals(core, purpose.social.result);
  const axes = buildAxes(core);
  const chakras = buildChakras(axes);
  const timeline = buildTimeline(core);
  return { core, axes, diagonals, chakras, ancestral, purpose, timeline };
}

/** Разбор строки 'YYYY-MM-DD' с проверкой существования даты. */
function parseDate(birthDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) throw new Error('Дата должна быть в формате YYYY-MM-DD');
  const [, y, m, d] = match.map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
    throw new Error('Такой даты не существует');
  }
  return { y, m, d };
}

/**
 * @param {string} birthDate — 'YYYY-MM-DD'
 * @param {Date} [now] — «сегодня». Параметр нужен только для тестов.
 * @returns полный расчёт матрицы
 */
export function calculateMatrix(birthDate, now = new Date()) {
  const { y, m, d } = parseDate(birthDate);
  const built = buildFromCore(buildCore(d, m, y));
  return {
    birthDate,
    ...built,
    today: buildToday(built.timeline, birthDate, now),
  };
}

// ═══════════════════════════════════════════════════════════
// 9. СОВМЕСТИМОСТЬ
// ═══════════════════════════════════════════════════════════

/**
 * Ядро пары: одноимённые точки двух личных матриц складываются
 * и приводятся к Аркану тем же правилом — суммой цифр.
 *
 * Восстановлено по tvoyamatritsa.ru на паре 13.07.1998 + 09.05.1998:
 * сошлись все девять точек ядра, все точки осей и все предназначения.
 * Вариант с вычитанием 22 даёт 6 совпадений из 9.
 */
export function buildPairCore(coreA, coreB) {
  const out = {};
  for (const k of ['W', 'N', 'E', 'S', 'C', 'NW', 'NE', 'SE', 'SW']) {
    out[k] = toArcana(coreA[k] + coreB[k]);
  }
  return out;
}

/**
 * Матрица пары. Одна и та же для романтической совместимости и для
 * деловой — числа те же, различаются только тексты трактовок.
 *
 * У пары нет своей даты рождения, поэтому блока `today` здесь нет:
 * аркан дня остаётся личным и берётся из partners.a.today / partners.b.today.
 */
export function calculatePair(dateA, dateB, now = new Date()) {
  const a = calculateMatrix(dateA, now);
  const b = calculateMatrix(dateB, now);
  return {
    dates: [dateA, dateB],
    partners: { a, b },
    ...buildFromCore(buildPairCore(a.core, b.core)),
  };
}
