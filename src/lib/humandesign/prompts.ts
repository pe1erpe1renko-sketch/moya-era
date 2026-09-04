/**
 * ПРОМПТЫ ДИЗАЙНА ЧЕЛОВЕКА
 * ========================
 * Устроены так же, как промпты матрицы и натальной карты: тексты пишутся
 * один раз и живут в базе вечно. Ограничения и тон повторены здесь
 * целиком — у каждой системы свой файл и своя версия, чтобы правка одной
 * не перегенерировала другие.
 *
 * ВЕРСИОНИРОВАНИЕ: меняешь текст промпта — поднимай HD_PROMPT_VERSION.
 */

import { CENTERS, type CenterId } from "./centers";
import { gateName } from "./gates";
import { PROFILE_NAMES } from "./sections";
import { AUTHORITIES, CROSS_ANGLES, HD_TYPES, type AuthorityId, type CrossAngle, type HdTypeId } from "./chart";

export const HD_PROMPT_VERSION = 1;

const LIMITS = `ЧЕГО НЕЛЬЗЯ ДЕЛАТЬ НИКОГДА

Не предсказывай события: смерть, болезни, беременность, развод, аварии, сроки, суммы денег. Бодиграф описывает механику решений и энергии, а не будущее.
Не ставь диагнозов и не давай медицинских рекомендаций. Про здоровье говори только как о зонах внимания и образе жизни. Никогда не отговаривай от врача и не предлагай заменить лечение.
Не давай юридических и финансовых советов, не говори, куда вкладывать деньги.
Не пугай. Если тема тяжёлая — говори прямо, но оставляй человеку опору и способность действовать.
Не пиши «энергия вселенной», «высшие силы ведут», «космос посылает», «так распорядилась судьба». Это пустой звук, который обесценивает текст.
Не превращай тип в приговор и не намекай, что один тип лучше другого. Проектор не «слабее» генератора, а устроен иначе.
Не пересказывай учебник и не объясняй, что такое центр или канал вообще. Начинай сразу с человека.
Не используй markdown, заголовки, списки и эмодзи. Только обычный текст абзацами.`;

const VOICE = `КАК ПИСАТЬ

Обращайся на «вы».
Пиши конкретно. Не «энергия трансформации в вашей жизни», а «вы беретесь за чужую задачу раньше, чем вас попросили, и потом не понимаете, почему устали».
Каждый абзац должен давать узнавание: человек читает и думает «это про меня».
Показывай обе стороны — сильную и теневую. Тень формулируй как механизм, а не как приговор.
Заканчивай одним конкретным действием, которое можно сделать на этой неделе.`;

export const HD_SYSTEM_PROMPT = `Ты пишешь трактовки дизайна человека для сервиса «Моя Эра».

Дизайн человека — схема из девяти центров, рассчитанная по реальным положениям планет в двух моментах: при рождении и примерно за 88 дней до него. Ты отвечаешь ровно на один вопрос разбора, а не описываешь систему вообще.

${VOICE}

ГЛАВНОЕ ПРАВИЛО
Дизайн человека описывает не характер, а механику: откуда берётся энергия, как принимается решение, что своё, а что подхвачено у окружающих. Пиши про механику, а не про «предназначение».

${LIMITS}

ФОРМАТ
2–4 абзаца, 150–250 слов. Обычный текст.`;

const BRIEF_VOICE = `КАК ПИСАТЬ

Обращайся на «вы».
Пиши конкретно. Не «энергия трансформации в вашей жизни», а «вы беретесь за чужую задачу раньше, чем вас попросили, и потом не понимаете, почему устали».
Абзац должен давать узнавание: человек читает и думает «это про меня».
Показывай обе стороны — сильную и теневую. Тень формулируй как механизм, а не как приговор.
Заканчивай законченной мыслью, а не намёком на продолжение.`;

/**
 * Промпт коротких абзацев страницы по дате. Отдельный от основного, потому
 * что задача другая: не разбор, а один самостоятельный абзац, который
 * читают вместо разбора, а не перед ним.
 */
export const HD_BRIEF_SYSTEM_PROMPT = `Ты пишешь короткие справки о центрах бодиграфа для сервиса «Моя Эра».

Такая справка стоит на общедоступной странице бодиграфа по дате рождения. Её читают вместо полного разбора, а не перед ним.

${BRIEF_VOICE}

ГЛАВНОЕ ПРАВИЛО
Это самостоятельный текст, а не начало платного разбора. Не обрывай фразу, не обещай продолжения, не пиши «подробнее в полном разборе», «об этом ниже», «а дальше начинается самое интересное». Человек должен закрыть абзац с ощущением, что ему сказали что-то целое.

ЧТО СКАЗАТЬ
Одно предложение — что это состояние центра означает. Одно-два предложения — как оно выглядит в обычный день: поступок, привычка, реакция. Одно предложение — обратная сторона того же свойства.

${LIMITS}

ФОРМАТ
Один абзац, 45–70 слов. Обычный текст без заголовка.`;

export type HdBriefCenterCtx = { kind: "hd_brief_center"; slotLabel: string; center: CenterId; defined: boolean };
export type HdTypeCtx = { kind: "hd_type"; slotLabel: string; type: HdTypeId };
export type HdStrategyCtx = { kind: "hd_strategy"; slotLabel: string; type: HdTypeId };
export type HdAuthorityCtx = { kind: "hd_authority"; slotLabel: string; authority: AuthorityId };
export type HdProfileCtx = { kind: "hd_profile"; slotLabel: string; profile: string };
export type HdCenterCtx = { kind: "hd_center"; slotLabel: string; center: CenterId; defined: boolean };
export type HdChannelCtx = { kind: "hd_channel"; slotLabel: string; a: number; b: number; name: string };
export type HdGateCtx = { kind: "hd_gate"; slotLabel: string; gate: number };
export type HdCrossCtx = { kind: "hd_cross"; slotLabel: string; angle: CrossAngle; gates: number[] };

export type HdCtx =
  | HdBriefCenterCtx
  | HdTypeCtx
  | HdStrategyCtx
  | HdAuthorityCtx
  | HdProfileCtx
  | HdCenterCtx
  | HdChannelCtx
  | HdGateCtx
  | HdCrossCtx;

const HD_KINDS = new Set([
  "hd_brief_center",
  "hd_type",
  "hd_strategy",
  "hd_authority",
  "hd_profile",
  "hd_center",
  "hd_channel",
  "hd_gate",
  "hd_cross",
]);

export function isHdCtx(ctx: { kind?: string }): ctx is HdCtx {
  return typeof ctx.kind === "string" && HD_KINDS.has(ctx.kind);
}

const ANGLE_ABOUT: Record<CrossAngle, string> = {
  right: "Правый угол: жизнь разворачивается через собственный путь, а не через других. Судьба человека — его личное дело.",
  juxtaposition: "Юкстапозиция: фиксированная судьба, узкая и своя. Человек делает своё дело независимо от того, зовут его или нет.",
  left: "Левый угол: жизнь разворачивается через других людей и встречи. Многое приходит извне, а не изнутри.",
};

export function buildHdPrompt(ctx: HdCtx): string {
  if (ctx.kind === "hd_brief_center") {
    const c = CENTERS[ctx.center];
    return `Центр: ${c.name}. О чём он: ${c.about}.
Состояние: ${ctx.defined ? "определён — работает одинаково всегда, независимо от окружения" : "открыт — усиливает то, что приходит от людей рядом"}.

Напиши одну короткую справку об этом состоянии центра: что оно означает и как выглядит в жизни.`;
  }

  if (ctx.kind === "hd_type") {
    const t = HD_TYPES[ctx.type];
    return `Вопрос разбора: «${ctx.slotLabel}»
Тип: ${t.name}. Их примерно ${t.share} среди людей.
Стратегия этого типа: ${t.strategy}. Признак верного пути: ${t.signature}. Признак жизни не по себе: ${t.notSelf}.

Опиши, как этот тип устроен изнутри: откуда берётся энергия, что даётся легко и что выматывает. Без советов «как надо жить» — только механика и узнавание.`;
  }

  if (ctx.kind === "hd_strategy") {
    const t = HD_TYPES[ctx.type];
    return `Вопрос разбора: «${ctx.slotLabel}»
Тип: ${t.name}. Стратегия: ${t.strategy}. ${t.strategyLine}

Объясни стратегию так, чтобы её можно было применить завтра: что конкретно человек делает иначе. Покажи, что происходит, когда он действует против стратегии, — через усталость и сопротивление, а не через мистику.`;
  }

  if (ctx.kind === "hd_authority") {
    const a = AUTHORITIES[ctx.authority];
    return `Вопрос разбора: «${ctx.slotLabel}»
Авторитет: ${a.name}. ${a.line}

Опиши, как этот авторитет работает в обычной жизни: по каким признакам человек узнаёт «да» и «нет» внутри себя, и что сбивает сигнал.`;
  }

  if (ctx.kind === "hd_profile") {
    return `Вопрос разбора: «${ctx.slotLabel}»
Профиль: ${ctx.profile}${PROFILE_NAMES[ctx.profile] ? ` — ${PROFILE_NAMES[ctx.profile]}` : ""}.
Первая цифра — как человек устроен для себя, вторая — как он проявляется для других.

Опиши обе роли и то, как они спорят и дополняют друг друга.`;
  }

  if (ctx.kind === "hd_center") {
    const c = CENTERS[ctx.center];
    return `Вопрос разбора: «${ctx.slotLabel}»
Центр: ${c.name}. О чём он: ${c.about}.
Состояние: ${ctx.defined ? "определён — работает одинаково всегда, независимо от окружения" : "открыт — усиливает то, что приходит от людей рядом"}.

Опиши, как это состояние проявляется в жизни. ${
      ctx.defined
        ? "Покажи, на что здесь можно опереться и где устойчивость превращается в упрямство."
        : "Покажи, где человек подхватывает чужое и принимает его за своё, и в чём при этом его мудрость."
    }`;
  }

  if (ctx.kind === "hd_channel") {
    return `Вопрос разбора: «${ctx.slotLabel}»
Канал ${ctx.a}—${ctx.b}, «${ctx.name}». Ворота ${ctx.a} — ${gateName(ctx.a)}; ворота ${ctx.b} — ${gateName(ctx.b)}.
Канал горит целиком, значит эта связка работает у человека постоянно.

Опиши, что даёт эта связка и где она мешает.`;
  }

  if (ctx.kind === "hd_gate") {
    return `Вопрос разбора: «${ctx.slotLabel}»
Ворота ${ctx.gate} — ${gateName(ctx.gate)}. Центр: ${CENTERS[centerOfGateSafe(ctx.gate)].name}.

Опиши, как эта тема проявляется у человека в поведении. Коротко и узнаваемо.`;
  }

  return `Вопрос разбора: «${ctx.slotLabel}»
Крест воплощения: ${CROSS_ANGLES[ctx.angle]}. ${ANGLE_ABOUT[ctx.angle]}
Ворота креста: Солнце личности ${ctx.gates[0]} (${gateName(ctx.gates[0])}), Земля личности ${ctx.gates[1]} (${gateName(ctx.gates[1])}), Солнце дизайна ${ctx.gates[2]} (${gateName(ctx.gates[2])}), Земля дизайна ${ctx.gates[3]} (${gateName(ctx.gates[3])}).

Опиши общее направление жизни, которое задаёт этот крест. Без обещаний событий и без пафоса про миссию.`;
}

/** Центр ворот; вынесено, чтобы не тянуть импорт в шапку. */
function centerOfGateSafe(gate: number): CenterId {
  for (const [id, center] of Object.entries(CENTERS)) {
    if (center.gates.includes(gate)) return id as CenterId;
  }
  return "throat";
}

export type BuiltHdRequest = {
  version: number;
  temperature: number;
  system: string;
  user: string;
  maxTokens: number;
};

export function buildHdRequest(ctx: HdCtx): BuiltHdRequest {
  const brief = ctx.kind === "hd_brief_center";
  return {
    version: HD_PROMPT_VERSION,
    temperature: 0.8,
    system: brief ? HD_BRIEF_SYSTEM_PROMPT : HD_SYSTEM_PROMPT,
    user: buildHdPrompt(ctx),
    maxTokens: brief ? 300 : 900,
  };
}
