/**
 * КНОПКИ ПОД УТРЕННЕЙ СВОДКОЙ.
 *
 * Отдельно от маршрута вебхука: их собирает и рассылка, а импортировать
 * один маршрут из другого — верный способ однажды затащить в задачу по
 * расписанию половину обработчика сообщений.
 *
 * КАРТИНКА В СООБЩЕНИЕ НЕ ВКЛАДЫВАЕТСЯ. Ежедневная картинка каждому —
 * это лишний трафик при той же пользе: кому нужна, тот нажмёт.
 */

import { isoToChartUrlDate } from "@/lib/chartUrl";
import { BUTTONS } from "./replies";

export type DigestButton = { text: string; url: string };

export function digestButtons(siteUrl: string, birthDate: string, invite: boolean): DigestButton[][] {
  const date = isoToChartUrlDate(birthDate);
  const rows: DigestButton[][] = [
    [{ text: BUTTONS.reading, url: `${siteUrl}/matrica/${date}` }],
    [{ text: BUTTONS.mentor, url: `${siteUrl}/nastavnik` }],
    [{ text: BUTTONS.image, url: `${siteUrl}/taro/${date}` }],
  ];
  // Приглашение на сайт — для тех, кто пришёл только в бота. Не чаще
  // раза в десять сводок: каждое утро звать одного и того же человека —
  // это уже не помощь.
  if (invite) rows.push([{ text: BUTTONS.fullReading, url: `${siteUrl}/matrica-sudby` }]);
  return rows;
}
