/**
 * ПРИВЯЗКА ЧАТА К ПРОФИЛЮ ЧЕЛОВЕКА.
 *
 * Владелец заводит людей на сайте, в кабинете: там уже есть форма с
 * датой, временем и местом, и второй такой в боте не нужно. Бот только
 * выдаёт на каждого человека ссылку вида t.me/bot?start=КОД и показывает
 * список.
 *
 * ТРИ ПРАВИЛА, которые здесь и живут:
 *  1. Первый нажавший «Старт» занимает ссылку. Остальным отказ — иначе
 *     пересланная кому-то ссылка увела бы чужую рассылку.
 *  2. Владелец может отозвать привязку: старый код гаснет навсегда, а
 *     чат отписывается. Отозванный код не оживает даже у того, кто его
 *     уже открывал.
 *  3. Сколько людей можно подключить к рассылке — по тарифу. На число
 *     профилей на сайте это не влияет: у Практика их по-прежнему
 *     сколько угодно, ограничение только на подключённых к боту.
 */

import { isShortCode, randomCode } from "@/lib/shortCode";

/** Длина кода привязки. Он живёт в ссылке t.me/bot?start=КОД. */
export const BOT_CODE_LENGTH = 12;

export function newBotCode(random: () => number = Math.random): string {
  return randomCode(BOT_CODE_LENGTH, random);
}

export function isBotCode(value: string): boolean {
  return isShortCode(value, BOT_CODE_LENGTH);
}

/** Ссылка привязки. Имя бота приходит из настроек. */
export function botLink(botName: string, code: string): string {
  return `https://t.me/${botName}?start=${code}`;
}

/** Состояние привязки — ровно то, что нужно для решений. */
export type BotLink = {
  code: string;
  /** null — ссылку ещё не открывали */
  chatId: number | null;
  /** отозвана владельцем: код погашен навсегда */
  revoked: boolean;
  /** человек отписался кнопкой в боте */
  active: boolean;
  /** человек заблокировал бота: слать больше нечего */
  blocked: boolean;
};

export type ClaimResult =
  | { ok: true; kind: "claimed" }
  | { ok: true; kind: "already_yours" }
  | { ok: false; reason: "revoked" | "taken" | "unknown" };

/**
 * Может ли этот чат занять ссылку.
 *
 * Повторное нажатие «Старт» тем же человеком — не ошибка: ссылку
 * открывают заново, теряют чат, меняют телефон. Отвечаем спокойно.
 */
export function claim(link: BotLink | null, chatId: number): ClaimResult {
  if (!link) return { ok: false, reason: "unknown" };
  if (link.revoked) return { ok: false, reason: "revoked" };
  if (link.chatId === null) return { ok: true, kind: "claimed" };
  if (link.chatId === chatId) return { ok: true, kind: "already_yours" };
  return { ok: false, reason: "taken" };
}

/** Идёт ли этой привязке утренняя сводка. */
export function receivesDigest(link: BotLink): boolean {
  return link.chatId !== null && !link.revoked && link.active && !link.blocked;
}

/** Считается ли привязка занимающей место в тарифе. */
export function occupiesSlot(link: BotLink): boolean {
  // Отозванная не считается: место освободилось. Отписавшийся и
  // заблокировавший — считаются: человек подключён, просто молчит, и
  // отобрать у него место без ведома владельца нельзя.
  return !link.revoked;
}
