/**
 * КАРТА ПОЗИЦИЙ КАРТЫ ДНЯ
 * =======================
 * Единственный источник правды о том, из чего состоит страница карты дня
 * и какой текст к какой позиции привязан.
 *
 * КЛЮЧИ ТЕКСТОВ в общей таблице matrix_texts:
 *   taro_day_9          — короткая справка об аркане дня (бесплатно)
 *   taro_on_9_13        — аркан дня 9 на фоне аркана рождения 13
 *   taro_use_9          — что с этим делать сегодня
 *   taro_shadow_9       — обратная сторона этого дня
 *
 * ИДЕНТИФИКАТОРЫ НЕ ПЕРЕИМЕНОВЫВАТЬ: на них висят тексты в базе.
 *
 * БЕСПЛАТНО: сама карта, её название и короткая справка. Разбор «эта
 * карта на фоне вашей карты рождения» — по подписке. Причина та же, что
 * на остальных страницах: человек, пришедший из поиска, должен увидеть
 * живой результат, а не замок с порога.
 *
 * ПОЧЕМУ ИМЕННО ТАК СЧИТАЮТСЯ КЛЮЧИ. Пар «аркан дня × аркан рождения»
 * ровно 22 × 22 = 484, и это единственная позиция, где они перемножаются.
 * Две остальные зависят только от аркана дня — по 22 текста. Если бы
 * перемножались все три, вышло бы полторы тысячи текстов на одну
 * страницу, и половина из них не прочиталась бы никогда.
 */

export type TarotSlotKind = "brief" | "pair" | "day";

export type TarotSlot = {
  /** устойчивый идентификатор */
  id: string;
  label: string;
  hint?: string;
  kind: TarotSlotKind;
  free: boolean;
  /** ключ текста в базе */
  key: string;
};

export type TarotSection = {
  id: string;
  title: string;
  lead: string;
  slots: TarotSlot[];
};

export type DayCard = {
  /** дата рождения, YYYY-MM-DD */
  birth: string;
  /** московские сутки, на которые выпала карта, YYYY-MM-DD */
  day: string;
  /** аркан дня, 1..22 */
  arcanum: number;
  /** аркан рождения — тот же, что в матрице и в быстром расчёте */
  birthArcanum: number;
};

/** Короткая справка — бесплатная часть страницы. */
export function briefSlot(card: DayCard): TarotSlot {
  return {
    id: "taro_day",
    label: "Что означает эта карта",
    kind: "brief",
    free: true,
    key: `taro_day_${card.arcanum}`,
  };
}

/** Разделы полного разбора. Всё платное. */
export function tarotSections(card: DayCard): TarotSection[] {
  return [
    {
      id: "taro_full",
      title: "Эта карта на фоне вашей карты рождения",
      lead: "Один и тот же аркан дня ложится по-разному на разных людей: он попадает либо в то, что вам и так даётся, либо в то, чего у вас мало. Поэтому разбор считается по двум числам сразу — аркану дня и аркану рождения.",
      slots: [
        {
          id: "taro_on",
          label: "Как этот день ложится на ваше устройство",
          hint: `${card.arcanum} на ${card.birthArcanum}`,
          kind: "pair",
          free: false,
          key: `taro_on_${card.arcanum}_${card.birthArcanum}`,
        },
        {
          id: "taro_use",
          label: "Что с этим делать сегодня",
          kind: "day",
          free: false,
          key: `taro_use_${card.arcanum}`,
        },
        {
          id: "taro_shadow",
          label: "Обратная сторона этого дня",
          kind: "day",
          free: false,
          key: `taro_shadow_${card.arcanum}`,
        },
      ],
    },
  ];
}

/** Слот по идентификатору — для проверки запроса с клиента. */
export function findTarotSlot(card: DayCard, id: string): TarotSlot | null {
  const all = [briefSlot(card), ...tarotSections(card).flatMap((s) => s.slots)];
  return all.find((s) => s.id === id) ?? null;
}

/** Сколько всего вопросов на странице и сколько из них открыто. */
export function countTarotSlots(card: DayCard): { free: number; total: number } {
  const paid = tarotSections(card).reduce((n, s) => n + s.slots.length, 0);
  return { free: 1, total: 1 + paid };
}
