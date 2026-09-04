/**
 * ПРОМПТЫ РАЗБОРА ПАРЫ
 * ====================
 * Синастрия и композит. Устроены как промпты остальных систем: тексты
 * пишутся один раз и живут в базе вечно, ограничения и тон повторены
 * целиком, версия своя.
 *
 * ВЕРСИОНИРОВАНИЕ: меняешь текст промпта — поднимай PAIR_PROMPT_VERSION.
 *
 * Отдельная осторожность у этой системы. Разбор пары читают двое, и
 * нередко второй открывает ссылку, которую ему прислали. Текст не должен
 * выносить приговор отношениям, советовать расстаться или намекать, что
 * пара обречена: мы описываем механику, а решают люди.
 */

import { ASPECTS, pointName, type AspectKey, type AspectPoint } from "@/lib/natal";
import { DEFINITIONS, HD_TYPES, findChannel, gateName, type DefinitionId, type HdTypeId } from "@/lib/humandesign";
import { CONNECTION_KINDS, type ConnectionKind } from "./composite";

export const PAIR_PROMPT_VERSION = 1;

const LIMITS = `ЧЕГО НЕЛЬЗЯ ДЕЛАТЬ НИКОГДА

Не предсказывай события: свадьбу, развод, измену, беременность, смерть, сроки. Разбор описывает устройство связи, а не будущее.
Не выноси приговор отношениям. Не советуй расставаться, не пиши «это не ваш человек», «такие пары не живут», «лучше поискать другого». Решение принимают двое, а не текст на сайте.
Не оценивай пару в процентах и не сравнивай с другими парами. Плохих сочетаний не бывает, бывают разные задачи.
Не ставь диагнозов и не давай медицинских рекомендаций. Не давай юридических и финансовых советов.
Не пугай. Если тема тяжёлая — говори прямо, но оставляй обоим опору и способность действовать.
Не пиши «энергия вселенной», «кармическая связь из прошлых жизней», «высшие силы свели». Это пустой звук.
Не пересказывай учебник и не объясняй, что такое аспект или канал. Начинай сразу с людей.
Не используй markdown, заголовки, списки и эмодзи. Только обычный текст абзацами.`;

const VOICE = `КАК ПИСАТЬ

Обращайся к двоим: «вы двое», «один из вас», «второй». На «ты» не переходи.
Пиши конкретно. Не «между вами сильная энергия», а «вы можете три часа спорить о ерунде и разойтись довольными — это у вас способ сближаться».
Показывай обе стороны: что эта связь даёт и чем она же осложняет жизнь.
Трудное описывай как механизм, который можно заметить и учесть, а не как приговор.
Не предполагай, что пара романтическая: то же сочетание бывает у друзей, коллег, родителя и ребёнка.`;

const FORMAT_FULL = `ФОРМАТ
2–4 абзаца, 150–250 слов. Обычный текст.`;

const FORMAT_BRIEF = `ФОРМАТ
Один абзац, 60–90 слов. Обычный текст без заголовка.`;

const BRIEF_RULE = `ГЛАВНОЕ ПРАВИЛО
Это самостоятельный текст, а не начало платного разбора. Не обрывай фразу, не обещай продолжения, не пиши «подробнее ниже» или «а дальше самое интересное». Человек должен закрыть абзац с ощущением, что ему сказали что-то целое про эту пару.`;

export const PAIR_SYSTEM_PROMPT = `Ты пишешь разборы совместимости для сервиса «Моя Эра».

Разбор считается по реальным положениям планет в моменты рождения двоих. Ты отвечаешь ровно на один вопрос разбора, а не описываешь отношения вообще.

${VOICE}

ГЛАВНОЕ ПРАВИЛО
Описывай механику связи, а не людей по отдельности и не судьбу пары. Читатель должен узнать в тексте то, что между ними уже происходит.

${LIMITS}

${FORMAT_FULL}`;

export const PAIR_BRIEF_SYSTEM_PROMPT = `Ты пишешь короткие справки о связи двух людей для сервиса «Моя Эра».

Такая справка стоит на общедоступной странице совместимости. Её часто читает второй человек, которому прислали ссылку, — и читает вместо полного разбора, а не перед ним.

${VOICE}

${BRIEF_RULE}

ЧТО СКАЗАТЬ
Одно-два предложения — что это сочетание означает. Одно-два — как оно выглядит в обычной жизни пары. Одно — обратная сторона того же свойства.

${LIMITS}

${FORMAT_BRIEF}`;

/* ─── контексты ─────────────────────────────────────────────────── */

export type SynBriefCtx = {
  kind: "syn_brief";
  slotLabel: string;
  a: AspectPoint | null;
  b: AspectPoint | null;
  aspect: AspectKey | null;
};

export type SynAspectCtx = {
  kind: "syn_aspect";
  slotLabel: string;
  a: AspectPoint;
  b: AspectPoint;
  aspect: AspectKey;
};

export type SynHouseCtx = { kind: "syn_house"; slotLabel: string; body: string; house: number };

export type HdcBriefCtx = { kind: "hdc_brief"; slotLabel: string; first: HdTypeId; second: HdTypeId };
export type HdcTypeCtx = { kind: "hdc_type"; slotLabel: string; first: HdTypeId; second: HdTypeId };
export type HdcDefinitionCtx = { kind: "hdc_definition"; slotLabel: string; definition: DefinitionId };
export type HdcChannelCtx = { kind: "hdc_channel"; slotLabel: string; a: number; b: number; connection: ConnectionKind };
export type PairMatrixBriefCtx = { kind: "pair_brief_matrix"; slotLabel: string; arcana: number };

export type PairCtx =
  | SynBriefCtx
  | SynAspectCtx
  | SynHouseCtx
  | HdcBriefCtx
  | HdcTypeCtx
  | HdcDefinitionCtx
  | HdcChannelCtx
  | PairMatrixBriefCtx;

const PAIR_KINDS = new Set([
  "syn_brief",
  "syn_aspect",
  "syn_house",
  "hdc_brief",
  "hdc_type",
  "hdc_definition",
  "hdc_channel",
  "pair_brief_matrix",
]);

export function isPairCtx(ctx: { kind?: string }): ctx is PairCtx {
  return typeof ctx.kind === "string" && PAIR_KINDS.has(ctx.kind);
}

const BRIEF_KINDS = new Set(["syn_brief", "hdc_brief", "pair_brief_matrix"]);

const HOUSE_MEANING: Record<number, string> = {
  1: "внешность, первое впечатление, способ входить в жизнь",
  2: "деньги, вещи, чувство собственной ценности",
  3: "речь, учёба, ближний круг, короткие поездки",
  4: "дом, семья, корни, то, что внутри и не для всех",
  5: "творчество, дети, влюблённость, игра и риск",
  6: "работа, режим, здоровье, ежедневные обязанности",
  7: "партнёрство, брак, договоры, отношения один на один",
  8: "кризисы, чужие ресурсы, глубина, то, что меняет необратимо",
  9: "смыслы, дальние страны, вера, высшее образование",
  10: "карьера, репутация, то, каким человека видит общество",
  11: "друзья, сообщества, планы на будущее",
  12: "уединение, внутренняя жизнь, то, что скрыто от самого себя",
};

const ASPECT_TONE: Record<AspectKey, string> = {
  conjunction: "Соединение: две темы слиты и работают как одна. Различить их внутри пары трудно.",
  opposition: "Оппозиция: темы стоят друг напротив друга. Каждый видит в другом то, чего не признаёт в себе.",
  trine: "Тригон: темы поддерживают друг друга. Покажи, где лёгкость превращается в то, что пара не развивает, потому что и так получается.",
  square: "Квадрат: темы тянут в разные стороны. Покажи механику трения и что оно даёт, если его не подавлять.",
  sextile: "Секстиль: темы помогают друг другу, но только когда пара делает шаг навстречу. Само не сработает.",
};

const typePair = (a: HdTypeId, b: HdTypeId) =>
  `Первый — ${HD_TYPES[a].name} (стратегия: ${HD_TYPES[a].strategy}). Второй — ${HD_TYPES[b].name} (стратегия: ${HD_TYPES[b].strategy}).`;

export function buildPairPrompt(ctx: PairCtx): string {
  if (ctx.kind === "syn_brief") {
    if (!ctx.a || !ctx.b || !ctx.aspect) {
      return `Между личными планетами двух карт нет ни одного аспекта в пределах орбиса.

Напиши короткую справку о том, что это значит для пары: связь держится не на притяжении светил, а на чём-то другом — на выборе, на общем деле, на привычке быть рядом. Без сожаления и без обещаний.`;
    }
    return `Главная связь пары: ${pointName(ctx.a)} первого и ${pointName(ctx.b)} второго, ${ASPECTS[ctx.aspect].name.toLowerCase()}.
${ASPECT_TONE[ctx.aspect]}

Напиши короткую справку об этой связи: что она означает для пары и как выглядит в обычной жизни.`;
  }

  if (ctx.kind === "syn_aspect") {
    return `Вопрос разбора: «${ctx.slotLabel}»
Конфигурация: ${pointName(ctx.a)} первого человека и ${pointName(ctx.b)} второго, ${ASPECTS[ctx.aspect].name.toLowerCase()}.
${ASPECT_TONE[ctx.aspect]}

Ответь именно на этот вопрос: что эта связка делает с парой. Помни, чья планета первая: «${pointName(ctx.a)} первого» и «${pointName(ctx.b)} второго» — не одно и то же, роли в паре разные.`;
  }

  if (ctx.kind === "syn_house") {
    return `Вопрос разбора: «${ctx.slotLabel}»
Конфигурация: ${ctx.body} одного человека попадает в ${ctx.house} дом другого.
О чём этот дом: ${HOUSE_MEANING[ctx.house] ?? "область жизни"}.

Ответь именно на этот вопрос: в какую область жизни второго попадает первый и что там происходит.`;
  }

  if (ctx.kind === "hdc_brief") {
    return `Главная связь пары: два типа дизайна человека.
${typePair(ctx.first, ctx.second)}

Напиши короткую справку о том, как эти двое обмениваются энергией: что даётся легко, а что выматывает обоих. Без советов «как надо жить» — только механика и узнавание.`;
  }

  if (ctx.kind === "hdc_type") {
    return `Вопрос разбора: «${ctx.slotLabel}»
${typePair(ctx.first, ctx.second)}
Признак верного пути у первого: ${HD_TYPES[ctx.first].signature}; у второго: ${HD_TYPES[ctx.second].signature}.
Признак жизни не по себе у первого: ${HD_TYPES[ctx.first].notSelf}; у второго: ${HD_TYPES[ctx.second].notSelf}.

Ответь именно на этот вопрос: как эта пара типов работает вместе. Где стратегии совпадают, где мешают друг другу и что каждому даётся легче, если помнить про другого.`;
  }

  if (ctx.kind === "hdc_definition") {
    return `Вопрос разбора: «${ctx.slotLabel}»
Определение общей схемы пары: ${DEFINITIONS[ctx.definition]}.
Определение показывает, из скольких несвязанных кусков собрана схема. Единое — пара самодостаточна вдвоём; раздвоенное и дальше — паре нужны люди и обстоятельства извне, чтобы куски соединились.

Ответь именно на этот вопрос: что это значит для двоих в обычной жизни.`;
  }

  if (ctx.kind === "hdc_channel") {
    const channel = findChannel(ctx.a, ctx.b);
    const info = CONNECTION_KINDS[ctx.connection];
    return `Вопрос разбора: «${ctx.slotLabel}»
Канал ${ctx.a}—${ctx.b}, «${channel?.name ?? ""}». Ворота ${ctx.a} — ${gateName(ctx.a)}; ворота ${ctx.b} — ${gateName(ctx.b)}.
Вид связи: ${info.name} — ${info.about}.

Ответь именно на этот вопрос: что эта связка даёт паре и где она же мешает. Пиши про вид связи, а не про канал вообще: один и тот же канал в электромагнитной и в компаньонской связи работает по-разному.`;
  }

  return `Главная связь пары по матрице судьбы: аркан пары ${ctx.arcana}.
Аркан пары складывается из центральных арканов двоих и описывает не людей, а задачу, которая возникает именно в этом сочетании.

Напиши короткую справку об этой задаче: в чём она и как проявляется в обычной жизни двоих. Не оценивай совместимость и не говори, подходят ли они друг другу.`;
}

export type BuiltPairRequest = {
  version: number;
  temperature: number;
  system: string;
  user: string;
  maxTokens: number;
};

export function buildPairRequest(ctx: PairCtx): BuiltPairRequest {
  const brief = BRIEF_KINDS.has(ctx.kind);
  return {
    version: PAIR_PROMPT_VERSION,
    temperature: 0.8,
    system: brief ? PAIR_BRIEF_SYSTEM_PROMPT : PAIR_SYSTEM_PROMPT,
    user: buildPairPrompt(ctx),
    maxTokens: brief ? 400 : 900,
  };
}
