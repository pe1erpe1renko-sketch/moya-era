/**
 * СВОДКА ПАРЫ ЧЕЛОВЕЧЕСКИМ ЯЗЫКОМ — из уже посчитанных чисел, без нейросети.
 *
 * Наверху синастрии и композита стоит пять предложений: сколько сильных
 * связей, где притяжение, где трение, что самое заметное и что с домами
 * (или с центрами). Всё это выводится арифметически из расчёта, поэтому
 * появляется мгновенно, одинаково для всех и ничего не стоит.
 *
 * Тексты описывают устройство пары, а не обещают события: «трение в
 * быте», а не «вы поссоритесь из-за денег».
 */

import { ASPECTS, pointName } from "@/lib/natal";
import { CENTERS, DEFINITIONS } from "@/lib/humandesign";
import { CONNECTION_KINDS, connectionCenters, countKinds, type Composite, type ConnectionChannel } from "./composite";
import type { Synastry, SynastryAspect } from "./synastry";
import { ASPECT_GLOSS, houseGloss, synastryTheme, themeById, type ThemeId } from "./themes";

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** «Солнце первого и Луна второго в тригоне» */
export function describeAspect(x: SynastryAspect): string {
  const IN: Record<string, string> = {
    conjunction: "в соединении",
    trine: "в тригоне",
    sextile: "в секстиле",
    square: "в квадрате",
    opposition: "в оппозиции",
  };
  return `${pointName(x.a)} первого и ${pointName(x.b)} второго ${IN[x.aspect.key] ?? ASPECTS[x.aspect.key].name.toLowerCase()}`;
}

/** Аспект считается точным, если отклонение меньше половины допустимого. */
export const STRONG_ASPECT = 0.5;

/** Тема, в которой больше всего аспектов из списка; при равенстве — самый точный. */
function leadingTheme(list: SynastryAspect[]): { theme: ThemeId; best: SynastryAspect } | null {
  if (list.length === 0) return null;
  const count = new Map<ThemeId, number>();
  for (const x of list) {
    const t = synastryTheme(x.a, x.b);
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  let theme: ThemeId = synastryTheme(list[0].a, list[0].b);
  let max = 0;
  for (const [t, n] of count) {
    if (n > max) {
      max = n;
      theme = t;
    }
  }
  const best = list.find((x) => synastryTheme(x.a, x.b) === theme) ?? list[0];
  return { theme, best };
}

/** Пять предложений о синастрии. */
export function synastrySummary(s: Synastry): string[] {
  const n = s.aspects.length;
  const out: string[] = [];

  if (n === 0) {
    out.push("Между вашими картами нет заметных аспектов: связь здесь держится не на небе, а на выборе.");
  } else {
    const strong = s.aspects.filter((x) => x.strength >= STRONG_ASPECT).length;
    const tail =
      strong === 0
        ? "но ни одного точного — связь мягкая, её надо замечать"
        : `${strong} из них ${strong === 1 ? "точный" : "точные"} — такие связи чувствуются сразу`;
    out.push(`Между вашими картами ${n} ${plural(n, "аспект", "аспекта", "аспектов")}, ${tail}.`);
  }

  // Притяжение: мягкие аспекты и соединения личных планет.
  const soft = s.aspects.filter(
    (x) => x.aspect.tone === "soft" || (x.aspect.key === "conjunction" && synastryTheme(x.a, x.b) !== "life"),
  );
  const pull = leadingTheme(soft);
  out.push(
    pull
      ? `Притяжение сильнее всего ${themeById(pull.theme).where}: ${describeAspect(pull.best)}.`
      : "Мягких аспектов нет — тепло здесь не даётся само, его приходится создавать.",
  );

  // Трение: квадраты и оппозиции.
  const hard = s.aspects.filter((x) => x.aspect.tone === "hard");
  const rub = leadingTheme(hard);
  out.push(
    rub
      ? `Трение — ${themeById(rub.theme).where}: ${describeAspect(rub.best)}, и это ${ASPECT_GLOSS[rub.best.aspect.key].split(" — ")[1]}.`
      : "Жёстких аспектов нет: трения мало, но и напряжения, которое двигает вперёд, тоже.",
  );

  // Самое заметное: главная связь личных планет или самый точный аспект.
  const lead = s.leading ?? s.aspects[0] ?? null;
  if (lead) out.push(`Самое заметное — ${describeAspect(lead)}: ${ASPECT_GLOSS[lead.aspect.key]}.`);
  else out.push("Ни одна личная планета одного не встаёт в аспект к планете другого — на первый план выходит то, что вы делаете вместе.");

  // Дома.
  if (s.unknown.houses || s.overlays.length === 0) {
    out.push("Домов пока нет: для них нужны время и место рождения обоих — тогда станет видно, в какие области жизни вы друг другу попадаете.");
  } else {
    const top = (owner: 0 | 1): number | null => {
      const count = new Map<number, number>();
      for (const o of s.overlays) if (o.owner === owner) count.set(o.house, (count.get(o.house) ?? 0) + 1);
      let best: number | null = null;
      let max = 0;
      for (const [house, c] of count) {
        if (c > max) {
          max = c;
          best = house;
        }
      }
      return best;
    };
    const h1 = top(0);
    const h2 = top(1);
    if (h1 && h2) {
      out.push(
        `Планеты первого чаще всего попадают в ${h1}-й дом второго (${houseGloss(h1)}), планеты второго — в ${h2}-й дом первого (${houseGloss(h2)}).`,
      );
    }
  }

  return out;
}

const WHO = ["первого", "второго"] as const;
const OTHER = ["второго", "первого"] as const;

function channelName(c: ConnectionChannel): string {
  return `«${c.channel.name}» (${c.channel.a}—${c.channel.b})`;
}

/** Пять предложений о композите. */
export function compositeSummary(c: Composite): string[] {
  const n = c.channels.length;
  const k = c.definedCenters.length;
  const counts = countKinds(c);
  const out: string[] = [];

  if (n === 0) {
    out.push("Ни один канал в этой паре не замыкается: общей схемы нет, и связь держится на том, что вы выбираете делать вместе.");
  } else {
    out.push(
      `Вдвоём у вас ${n} ${plural(n, "канал", "канала", "каналов")} и ${k} ${plural(k, "определённый центр", "определённых центра", "определённых центров")} из девяти.`,
    );
  }

  // Притяжение: электромагнитные каналы.
  const em = c.channels.filter((x) => x.kind === "electromagnetic");
  if (em.length > 0) {
    const names = em.slice(0, 2).map(channelName).join(" и ");
    out.push(
      `${em.length} из них ${em.length === 1 ? "электромагнитный — он существует" : plural(em.length, "электромагнитный", "электромагнитных — они существуют", "электромагнитных — они существуют")} только вдвоём, и это главное притяжение пары: ${names}.`,
    );
  } else if (counts.companionship > 0) {
    out.push("Электромагнитных каналов нет, зато есть общие: вы устроены похоже, и притяжение здесь — узнавание.");
  } else {
    out.push("Электромагнитных каналов нет: притяжение здесь не механическое, а выбранное.");
  }

  // Трение: доминирование и компромисс.
  const rub = c.channels.find((x) => x.kind === "dominance") ?? c.channels.find((x) => x.kind === "compromise") ?? null;
  if (rub && rub.owner !== null) {
    const tail =
      rub.kind === "dominance"
        ? `а у ${OTHER[rub.owner]} его нет — тема одного накрывает обоих`
        : `а у ${OTHER[rub.owner]} только половина — он знает тему наполовину, и это сложнее, чем не знать вовсе`;
    out.push(`Трение — там, где канал ${channelName(rub)} целиком у ${WHO[rub.owner]}, ${tail}.`);
  } else {
    out.push("Доминирования и компромиссов нет: никто не накрывает другого своей темой.");
  }

  // Самое заметное: центры только вместе, иначе компаньонство, иначе определение.
  const together = connectionCenters(c);
  const comp = c.channels.find((x) => x.kind === "companionship");
  if (together.length > 0) {
    const names = together
      .slice(0, 2)
      .map((id) => `«${CENTERS[id].name}»`)
      .join(" и ");
    out.push(
      `${together.length === 1 ? "Центр" : "Центры"} ${names} ${together.length === 1 ? "появляется" : "появляются"} только вместе: поодиночке ${together.length === 1 ? "его" : "их"} нет ни у кого — это и есть эффект пары.`,
    );
  } else if (comp) {
    out.push(`Канал ${channelName(comp)} есть у обоих: понимаете друг друга без слов, но и слепые пятна у вас общие.`);
  } else {
    out.push(`Общая схема пары — ${DEFINITIONS[c.definition].toLowerCase()}: новых центров вдвоём не появляется.`);
  }

  // Чем пара становится вместе.
  out.push(`Вместе вы работаете как ${c.type.name.toLowerCase()}: ${c.type.strategyLine}`);

  return out;
}

/** Подпись к видам связи — для «Как это читать». */
export const KIND_LINES = (Object.keys(CONNECTION_KINDS) as Array<keyof typeof CONNECTION_KINDS>).map(
  (k) => `${CONNECTION_KINDS[k].name} — ${CONNECTION_KINDS[k].about}`,
);

/** «Как это читать» — три абзаца на каждый взгляд. Свёрнуты по умолчанию. */
export const HOW_TO_READ: Record<"synastry" | "composite", string[]> = {
  synastry: [
    "Синастрия сравнивает две натальные карты: планеты одного человека накладываются на карту другого. Каждая пара планет, вставшая под определённым углом, — аспект. Чем меньше отклонение от точного угла (орбис), тем сильнее аспект чувствуется.",
    "Мягкие аспекты — тригон и секстиль — дают то, что получается само: понимание, лёгкость, поддержку. Жёсткие — квадрат и оппозиция — дают трение, и это не плохо: именно оно заставляет пару расти. Соединение усиливает обе планеты сразу, и его характер зависит от того, какие это планеты.",
    "Наложение домов показывает, в какую область жизни одного попадает планета другого: седьмой дом — партнёрство, четвёртый — дом и семья, десятый — цели. Дома считаются только по времени и месту рождения обоих, поэтому без них этот раздел пуст — и мы честно об этом говорим.",
  ],
  composite: [
    "Композит кладёт два бодиграфа на одну схему: если ворота одного человека и ворота другого замыкают канал, он горит у пары, хотя ни у кого поодиночке его нет. Закрашенные центры определены вдвоём, пустые открыты у обоих.",
    "У каждого канала пары есть вид связи. Электромагнитный — половины у разных людей: и притяжение, и трение сразу. Компаньонство — канал целиком у обоих: понимание без слов, но общие слепые пятна. Доминирование — целиком у одного, у другого ничего: тема одного накрывает обоих. Компромисс — у одного целиком, у другого половина: второй знает тему наполовину.",
    "Самое интересное — центры, которые появляются только вместе. Их нет ни у кого из двоих, а в паре они определены: это и есть то, чем пара отличается от двух отдельных людей. Нажмите на любой центр схемы — увидите, откуда он взялся и о чём он.",
  ],
};
