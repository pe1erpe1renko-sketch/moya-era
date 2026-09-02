import type { CSSProperties } from "react";

/** Глубина дуги-перехода — общая переменная --transition-depth. */
export const ARC_H = "var(--transition-depth)";

/**
 * Стили верхней кромки чёрной секции, наезжающей на предыдущий экран.
 * Форма, цвет кромки, глубина и отрицательный отступ — как на главной.
 */
export const arcTransitionStyle: CSSProperties = {
  background: "#000000",
  borderTop: "2px solid rgba(159, 186, 185, 0.5)",
  borderTopLeftRadius: `100% ${ARC_H}`,
  borderTopRightRadius: `100% ${ARC_H}`,
  marginTop: `calc(-1 * ${ARC_H})`,
};
