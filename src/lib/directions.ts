const matrixImg = "/images/matrix.png";
const natalImg = "/images/natal.png";
const humandesignImg = "/images/humandesign2.png";
const numerologyImg = "/images/numerology.png";
const tarotImg = "/images/tarot.png";
const synastryImg = "/images/synastry2.png";

export type Direction = {
  id: "matrix" | "natal" | "humandesign" | "numerology" | "tarot" | "synastry";
  title: string;
  desc: string;
  image: string;
  path:
    | "/matrica-sudby"
    | "/natalnaya-karta"
    | "/dizayn-cheloveka"
    | "/numerologiya"
    | "/taro"
    | "/sovmestimost";
};

/** Single source of truth for the wheel. */
export const directions: Direction[] = [
  { id: "matrix", title: "Матрица судьбы", desc: "Ваш рисунок в 22 арканах", image: matrixImg, path: "/matrica-sudby" },
  { id: "natal", title: "Натальная карта", desc: "Небо в минуту вашего рождения", image: natalImg, path: "/natalnaya-karta" },
  { id: "humandesign", title: "Дизайн человека", desc: "Как вы устроены на самом деле", image: humandesignImg, path: "/dizayn-cheloveka" },
  { id: "numerology", title: "Нумерология", desc: "Числа, из которых вы собраны", image: numerologyImg, path: "/numerologiya" },
  { id: "tarot", title: "Таро", desc: "Вопрос, заданный вовремя", image: tarotImg, path: "/taro" },
  { id: "synastry", title: "Совместимость", desc: "Вы двое как одна система", image: synastryImg, path: "/sovmestimost" },
];
