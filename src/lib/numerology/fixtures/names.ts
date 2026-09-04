/**
 * ЭТАЛОН ТАБЛИЦЫ БУКВ
 *
 * Числа судьбы, снятые с тех же двух открытых калькуляторов, что и числа
 * по датам: PyPI `numerology` 1.8 и npm `@thanhpham99/numerology` 1.0.2.
 * Оба используют одну и ту же пифагорейскую таблицу латиницы — это и
 * проверяется тестом побуквенно.
 *
 * Расхождения между ними те же, что и по датам, и той же природы: первый
 * сворачивает имя и фамилию по отдельности, второй складывает всё разом и
 * местами не доводит свёртку до конца (отдаёт 10). Мы складываем всё
 * разом и сворачиваем один раз — как и даты.
 */

export type NameReference = {
  /** полное имя латиницей */
  name: string;
  /** число судьбы по первому эталону */
  ref1: number;
  /** по второму */
  ref2: number;
};

export const NAME_REFERENCE: NameReference[] = [
  { name: "Ivan Ivanov", ref1: 3, ref2: 3 },
  { name: "Maria Petrova", ref1: 4, ref2: 4 },
  { name: "John Smith", ref1: 8, ref2: 8 },
  { name: "Anna Lee", ref1: 7, ref2: 7 },
  { name: "Alexander Pushkin", ref1: 11, ref2: 11 },
  { name: "Lev Tolstoy", ref1: 3, ref2: 3 },
  { name: "Olga Sokolova", ref1: 1, ref2: 10 },
  { name: "Dmitry Mendeleev", ref1: 3, ref2: 3 },
  { name: "Ada Lovelace", ref1: 9, ref2: 9 },
  { name: "Grace Hopper", ref1: 4, ref2: 4 },
  { name: "Alan Turing", ref1: 9, ref2: 9 },
  { name: "Marie Curie", ref1: 3, ref2: 3 },
];
