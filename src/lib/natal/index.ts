/**
 * НАТАЛЬНАЯ КАРТА
 * ===============
 * Модель карты поверх движка эфемерид: положения тел по знакам и домам,
 * асцендент и середина неба, аспекты, разделы разбора и ключи текстов.
 *
 * Расчёт сверен со Swiss Ephemeris на двадцати контрольных датах —
 * см. `natal.test.ts` и эталон `src/lib/ephemeris/fixtures/swissEphemeris.ts`.
 * Сама Swiss Ephemeris в проект не входит: она под AGPL.
 */

export * from "./signs";
export * from "./aspects";
export * from "./chart";
export * from "./sections";
export * from "./prompts";
