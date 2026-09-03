import type { Matrix, PairMatrix } from "./matrixEngine";

export type Slot = {
  id: string;
  label: string;
  path: string;
  free?: boolean;
  daily?: boolean;
};

export type Section = {
  id: string;
  title: string;
  lead: string;
  access: "free" | "paid";
  yearly?: boolean;
  daily?: boolean;
  slots: Slot[];
};

export type PairKind = "love" | "parentChild" | "business";

export type CalcType = {
  id: string;
  slug: string;
  pair: boolean;
  title: string;
  lead: string;
  note?: string;
  full?: boolean;
  sections: Section[];
};

export type PointSlot = { id: string; label: string; path: string };

export type SectionData = {
  id: string;
  title: string;
  lead: string;
  access: "free" | "paid";
  locked: boolean;
  slots: Array<{ id: string; label: string; arcana: number; key: string; locked: boolean; free: boolean }>;
};

export const SECTIONS: Section[];
export const PAIR_SECTIONS: Record<PairKind, Section[]>;
export const FINANCE_EXTRA: Section[];
export const CHILD_SECTIONS: Section[];
export const CALC_TYPES: CalcType[];
export const FORECAST_VIEW: CalcType;
export const POINT_SLOTS: PointSlot[];
export const ALL_SLOTS: Array<Slot & { sectionId: string; sectionTitle: string; access: "free" | "paid" }>;
export const FREE_SECTIONS: Section[];
export const PAID_SECTIONS: Section[];

export function resolvePath(matrix: Matrix | PairMatrix, path: string): number;
export function arcanaImage(arcana: number): string;
export function textKey(slotId: string, arcana: number): string;
export function dailyTextKey(dayArcana: number, periodArcana: number, isoDate: string): string;
export function findSectionForPoint(path: string): { sectionId: string; sectionTitle: string; access: string } | null;
export function calcTypeBySlug(slug: string): CalcType | null;
export function buildSectionData(matrix: Matrix, opts?: { unlocked?: boolean }): SectionData[];
