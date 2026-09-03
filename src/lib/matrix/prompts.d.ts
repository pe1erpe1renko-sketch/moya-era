import type { Matrix, PairMatrix } from "./matrixEngine";

export const PROMPT_VERSION: number;
export const ARCANA_NAMES: Record<number, string>;
export const SYSTEM_PROMPT: string;
export const PAIR_SYSTEM_PROMPT: string;
export const DAILY_SYSTEM_PROMPT: string;
export const YEAR_SYSTEM_PROMPT: string;
export const IMAGE_SYSTEM_PROMPT: string;
export const MENTOR_SYSTEM_PROMPT: string;
export const MENTOR_HINTS: string[];

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SectionCtx = { kind?: "section"; sectionTitle: string; sectionLead?: string; slotLabel: string; arcana: number };
export type PairCtx = { kind: "pair"; pairKind: "love" | "business" | "parentChild"; sectionTitle: string; sectionLead?: string; slotLabel: string; arcana: number };
export type PointCtx = { kind: "point"; slotLabel: string; arcana: number };
export type DailyCtx = { kind: "daily"; arcana: number; periodArcana: number; weekday: string; date: string };
export type YearCtx = { kind: "year"; yearArcana: number; periodArcana: number; year: number; aspect: "main" | "focus" | "risk" | "money" | "love" };
export type ImageCtx = { kind: "image"; theme: string; themeAbout: string; arcana: number };
export type MentorCtx = {
  kind: "mentor";
  matrix: Matrix | PairMatrix;
  person: { name?: string; birthDate?: string; sex?: "м" | "ж" } | null;
  plan: { label?: string } | null;
  messages: ChatMessage[];
};
export type RequestCtx = SectionCtx | PairCtx | PointCtx | DailyCtx | YearCtx | ImageCtx | MentorCtx;

export type BuiltRequest = {
  version: number;
  temperature: number;
  system: string;
  user?: string;
  messages?: ChatMessage[];
  maxTokens: number;
};

export function buildUserPrompt(p: SectionCtx): string;
export function buildPairPrompt(p: PairCtx): string;
export function buildPointPrompt(p: PointCtx): string;
export function buildDailyPrompt(p: DailyCtx): string;
export function buildYearPrompt(p: YearCtx): string;
export function buildImagePrompt(p: ImageCtx): string;
export function buildMentorContext(matrix: Matrix | PairMatrix, person: MentorCtx["person"], plan: MentorCtx["plan"]): string;
export function buildRequest(ctx: RequestCtx): BuiltRequest;
