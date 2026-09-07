/**
 * ТАРО: КАРТА ДНЯ
 * ===============
 * Один аркан на дату рождения и сегодняшний день. Выбор
 * детерминированный, день считается по Москве — см. `day.ts`.
 *
 * Здесь же живой расклад: четыре вида, колода из 22 старших арканов и
 * промпт. Справочника арканов нет — названия и строки берутся из общего
 * `lib/arcana`.
 */

export * from "./day";
export * from "./card";
export * from "./sections";
export * from "./spreads";
export * from "./spreadPrompts";
export * from "./spreadUrl";
export * from "./ask";
export * from "./prompts";
