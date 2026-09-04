/**
 * Тела и точки, которые умеет считать движок.
 *
 * Планеты, Солнце и Луна — из astronomy-engine. Земля — точка напротив
 * Солнца (нужна дизайну человека). Узлы и Лилит считаются в nodes.ts.
 */

export type BodyId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "earth"
  | "north_node"
  | "south_node"
  | "lilith";

export type BodyKind = "luminary" | "planet" | "point";

export type BodyInfo = {
  id: BodyId;
  /** «Меркурий» */
  name: string;
  /** «Меркурия» */
  genitive: string;
  glyph: string;
  kind: BodyKind;
};

const RAW: Array<[BodyId, string, string, string, BodyKind]> = [
  ["sun", "Солнце", "Солнца", "☉", "luminary"],
  ["moon", "Луна", "Луны", "☽", "luminary"],
  ["mercury", "Меркурий", "Меркурия", "☿", "planet"],
  ["venus", "Венера", "Венеры", "♀", "planet"],
  ["mars", "Марс", "Марса", "♂", "planet"],
  ["jupiter", "Юпитер", "Юпитера", "♃", "planet"],
  ["saturn", "Сатурн", "Сатурна", "♄", "planet"],
  ["uranus", "Уран", "Урана", "♅", "planet"],
  ["neptune", "Нептун", "Нептуна", "♆", "planet"],
  ["pluto", "Плутон", "Плутона", "♇", "planet"],
  ["earth", "Земля", "Земли", "⊕", "point"],
  ["north_node", "Северный узел", "Северного узла", "☊", "point"],
  ["south_node", "Южный узел", "Южного узла", "☋", "point"],
  ["lilith", "Лилит", "Лилит", "⚸", "point"],
];

export const BODIES: Record<BodyId, BodyInfo> = Object.fromEntries(
  RAW.map(([id, name, genitive, glyph, kind]) => [id, { id, name, genitive, glyph, kind }]),
) as Record<BodyId, BodyInfo>;

export const ALL_BODIES: BodyId[] = RAW.map(([id]) => id);

/** Тела натальной карты: десять классических плюс узел и Лилит. */
export const NATAL_BODIES: BodyId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "north_node",
  "lilith",
];

/** Тринадцать активаций дизайна человека, в порядке бодиграфа. */
export const HD_BODIES: BodyId[] = [
  "sun",
  "earth",
  "moon",
  "north_node",
  "south_node",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];
