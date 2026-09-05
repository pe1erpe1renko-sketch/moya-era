import "server-only";

import { getTexts, type SlotContext } from "@/server/content";
import { arcanaName, weekdayName } from "@/lib/matrix";
// Из конкретного модуля, а не из общего index: под tsx реэкспорты через
// `export *` теряют имена, и это уже подводило в скриптах наполнения.
import { SECTIONS } from "@/lib/matrix/contentPositions";
import { arcanumInfo } from "@/lib/tarot";
import { NUMEROLOGY_NUMBERS } from "@/lib/numerology";
import { cachedTexts } from "@/server/botDigest";

/**
 * ПРОГРЕВ ТЕКСТОВ НА ДЕНЬ.
 *
 * Единственное место, где бот вообще может что-то сгенерировать, — и
 * делает это заранее, один раз на весь сервис, до начала рассылки.
 *
 * Ключи разбираются обратно в контекст промпта: контекст нужен
 * генерации, а список ключей — единственное, что известно снаружи. Ключ,
 * который не разобрался, просто пропускается: выдумывать по нему нечего.
 */

/**
 * Подписи берутся из карты позиций, а не переписываются сюда: они уходят
 * в промпт и влияют на текст, и разойдись они с сайтом — под тем же
 * ключом лёг бы текст, написанный по другому заданию.
 */
const DAY_SECTION = SECTIONS.find((s) => s.slots.some((x) => x.id === "day_energy"));
const DAY_SLOT = DAY_SECTION?.slots.find((x) => x.id === "day_energy");
const DAY_SLOT_LABEL = DAY_SLOT?.label ?? "Аркан дня";
const DAY_SECTION_TITLE = DAY_SECTION?.title ?? "Прогноз";

const DAY_KEY = /^day_(\d+)_(\d+)_(\d{4}-\d{2}-\d{2})$/;
const TARO_KEY = /^taro_day_(\d+)$/;
const NUM_KEY = /^num_brief_dayn_(\d+)$/;

function contextFor(key: string): SlotContext | null {
  const day = DAY_KEY.exec(key);
  if (day) {
    // Контекст ТОТ ЖЕ, что строит сайт для «энергии дня» (см.
    // `readingTexts`): тот же вид, те же поля. Иначе прогрев записал бы
    // под нужным ключом текст, написанный по другому промпту, — и в
    // кабинете человек прочитал бы не то, что пришло утром в боте.
    return {
      key,
      kind: "daily",
      slotLabel: DAY_SLOT_LABEL,
      sectionTitle: DAY_SECTION_TITLE,
      arcana: Number(day[1]),
      periodArcana: Number(day[2]),
      weekday: weekdayName(day[3]),
      date: day[3],
    } as SlotContext;
  }

  const taro = TARO_KEY.exec(key);
  if (taro) {
    const n = Number(taro[1]);
    return { key, kind: "taro_brief", slotLabel: `Что означает эта карта — ${arcanumInfo(n).name}`, arcanum: n } as SlotContext;
  }

  const num = NUM_KEY.exec(key);
  if (num) {
    const value = Number(num[1]);
    const about = NUMEROLOGY_NUMBERS.find((n) => n.id === "dayn");
    return {
      key,
      kind: "num_brief",
      slotLabel: `${about?.title ?? "Число дня"} — ${value}`,
      number: "dayn",
      value,
    } as SlotContext;
  }
  return null;
}

/**
 * Дописывает в общий кэш то, чего в нём ещё нет.
 * @returns сколько текстов пришлось сгенерировать
 */
export async function warmDigestTexts(keys: string[]): Promise<number> {
  const have = await cachedTexts(keys);
  const missing = keys.filter((k) => !have[k]);
  if (missing.length === 0) return 0;

  const contexts = missing.map(contextFor).filter((c): c is SlotContext => c !== null);
  if (contexts.length === 0) return 0;

  const results = await getTexts(contexts, { allowGenerate: true });
  return results.filter((r) => r.source === "generated").length;
}

/** Название аркана — для журналов задачи, чтобы по ним было что читать. */
export const arcanaLabel = arcanaName;
