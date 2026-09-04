/**
 * ТРИ ВЗГЛЯДА НА ОДНУ ПАРУ
 *
 * Матрица, синастрия и композит — не три разных страницы, а три взгляда на
 * одну и ту же пару. Адрес один: /sovmestimost/13-07-1998/09-04-1992,
 * переключение отражается якорем (#sinastriya). Отдельных индексируемых
 * страниц не заводим: это были бы три страницы про одну пару, и поисковик
 * посчитал бы их дублями.
 */

export type PairViewId = "matrix" | "synastry" | "composite";

export type PairView = {
  id: PairViewId;
  /** якорь в адресе */
  anchor: string;
  /** подпись на переключателе */
  tab: string;
  title: string;
  lead: string;
  /** что нужно для полного расчёта, кроме дат */
  needs: string | null;
};

export const PAIR_VIEWS: PairView[] = [
  {
    id: "matrix",
    anchor: "matrica",
    tab: "Матрица",
    title: "Совместимость по матрице судьбы",
    lead: "Аркан пары: задача, которая возникает именно в этом сочетании и не возникла бы ни с кем другим.",
    needs: null,
  },
  {
    id: "synastry",
    anchor: "sinastriya",
    tab: "Синастрия",
    title: "Синастрия: две натальные карты",
    lead: "Как небо одного отзывается в небе другого: аспекты между картами и то, в какие области жизни вы друг другу попадаете.",
    needs: "время и место рождения обоих",
  },
  {
    id: "composite",
    anchor: "kompozit",
    tab: "Композит",
    title: "Композит: бодиграф пары",
    lead: "Что загорается в вас двоих вместе: каналы, которых нет ни у кого поодиночке, и центры, появляющиеся только в паре.",
    needs: "время и место рождения обоих",
  },
];

export const DEFAULT_VIEW: PairViewId = "matrix";

export function viewById(id: string | null | undefined): PairView {
  return PAIR_VIEWS.find((v) => v.id === id) ?? PAIR_VIEWS[0];
}

/** Взгляд по якорю адреса: '#sinastriya' → синастрия. */
export function viewByAnchor(anchor: string | null | undefined): PairView {
  const clean = (anchor ?? "").replace(/^#/, "");
  return PAIR_VIEWS.find((v) => v.anchor === clean) ?? PAIR_VIEWS[0];
}
