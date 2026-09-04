/**
 * ДЕВЯТЬ ЦЕНТРОВ БОДИГРАФА
 *
 * У каждого центра свой набор ворот. Центр определён, когда в нём горит
 * хотя бы один полный канал; иначе он открыт. Моторные центры дают
 * энергию — от них зависит тип: связь мотора с горлом делает манифестора,
 * а определённый сакрал — генератора.
 *
 * Состав ворот сверен с открытым калькулятором human-design-mcp (MIT,
 * ссылается на Jovian Archive).
 */

export type CenterId =
  | "head"
  | "ajna"
  | "throat"
  | "self"
  | "heart"
  | "sacral"
  | "spleen"
  | "solar"
  | "root";

export type Center = {
  id: CenterId;
  name: string;
  /** «в голове», для фраз «определён в …» */
  gates: number[];
  /** мотор — источник энергии */
  motor: boolean;
  /** центр осознания */
  awareness: boolean;
  /** центр давления */
  pressure: boolean;
  /** о чём этот центр — короткая подпись в интерфейсе */
  about: string;
};

export const CENTERS: Record<CenterId, Center> = {
  head: {
    id: "head",
    name: "Голова",
    gates: [61, 63, 64],
    motor: false,
    awareness: false,
    pressure: true,
    about: "Давление думать: вопросы, идеи и то, что не даёт покоя",
  },
  ajna: {
    id: "ajna",
    name: "Аджна",
    gates: [4, 11, 17, 24, 43, 47],
    motor: false,
    awareness: true,
    pressure: false,
    about: "Как вы обрабатываете информацию и приходите к выводам",
  },
  throat: {
    id: "throat",
    name: "Горло",
    gates: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62],
    motor: false,
    awareness: false,
    pressure: false,
    about: "Выражение и действие: как вы проявляетесь вовне",
  },
  self: {
    id: "self",
    name: "Самость",
    gates: [1, 2, 7, 10, 13, 15, 25, 46],
    motor: false,
    awareness: false,
    pressure: false,
    about: "Направление и ощущение себя: кто вы и куда идёте",
  },
  heart: {
    id: "heart",
    name: "Воля",
    gates: [21, 26, 40, 51],
    motor: true,
    awareness: false,
    pressure: false,
    about: "Воля, обещания и самооценка через доказанное",
  },
  sacral: {
    id: "sacral",
    name: "Сакральный",
    gates: [3, 5, 9, 14, 27, 29, 34, 42, 59],
    motor: true,
    awareness: false,
    pressure: false,
    about: "Жизненная энергия и отклик",
  },
  spleen: {
    id: "spleen",
    name: "Селезёнка",
    gates: [18, 28, 32, 44, 48, 50, 57],
    motor: false,
    awareness: true,
    pressure: false,
    about: "Интуиция, здоровье и мгновенное чувство безопасности",
  },
  solar: {
    id: "solar",
    name: "Солнечное сплетение",
    gates: [6, 22, 30, 36, 37, 49, 55],
    motor: true,
    awareness: true,
    pressure: false,
    about: "Эмоции и их волна",
  },
  root: {
    id: "root",
    name: "Корневой",
    gates: [19, 38, 39, 41, 52, 53, 54, 58, 60],
    motor: true,
    awareness: false,
    pressure: true,
    about: "Давление и топливо для действия",
  },
};

export const CENTER_ORDER: CenterId[] = [
  "head",
  "ajna",
  "throat",
  "self",
  "heart",
  "sacral",
  "spleen",
  "solar",
  "root",
];

export const MOTOR_CENTERS: CenterId[] = CENTER_ORDER.filter((id) => CENTERS[id].motor);

const GATE_TO_CENTER: Record<number, CenterId> = (() => {
  const map: Record<number, CenterId> = {};
  for (const id of CENTER_ORDER) for (const gate of CENTERS[id].gates) map[gate] = id;
  return map;
})();

/** Центр, которому принадлежат ворота. */
export function centerOfGate(gate: number): CenterId {
  const center = GATE_TO_CENTER[gate];
  if (!center) throw new Error(`Ворота ${gate} не привязаны к центру`);
  return center;
}
