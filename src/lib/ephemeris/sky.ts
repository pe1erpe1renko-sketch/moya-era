/**
 * Небо на момент: положения тел плюс дома, если известно место.
 * Точка входа для натальной карты и дизайна человека.
 */

import { NATAL_BODIES, type BodyId } from "./bodies";
import { trueObliquity } from "./frames";
import { houses, type HouseSystem, type Houses } from "./houses";
import { positions, type EclipticPosition, type NodeType } from "./positions";

export type SkyOptions = {
  bodies?: BodyId[];
  nodeType?: NodeType;
  /** Место рождения: без него дома не считаются. */
  place?: { latitude: number; longitude: number } | null;
  houseSystem?: HouseSystem;
};

export type Sky = {
  /** момент в UTC, ISO */
  utc: string;
  positions: EclipticPosition[];
  houses: Houses | null;
  obliquity: number;
};

export function computeSky(utc: Date, opts: SkyOptions = {}): Sky {
  const list = positions(utc, opts.bodies ?? NATAL_BODIES, { nodeType: opts.nodeType });
  const place = opts.place ?? null;
  return {
    utc: utc.toISOString(),
    positions: list,
    houses: place ? houses(utc, place.latitude, place.longitude, opts.houseSystem ?? "placidus") : null,
    obliquity: trueObliquity(utc),
  };
}
