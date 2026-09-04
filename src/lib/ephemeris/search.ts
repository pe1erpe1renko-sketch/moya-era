/**
 * Поиск момента по долготе Солнца. Нужен дизайну человека: Design-дата
 * это момент, когда Солнце было на 88° долготы раньше, чем при рождении.
 * Это не «88 дней назад»: Солнце идёт неравномерно, и разброс реально
 * от 86 до 92 суток.
 */

import { angleDiff, norm360 } from "./angles";
import { bodyLongitude } from "./positions";
import { addDays } from "./time";

/** Среднее движение Солнца, градусов в сутки — стартовое приближение. */
const MEAN_SUN_SPEED = 360 / 365.2422;

/**
 * Момент вблизи `near`, когда долгота Солнца равна `target`.
 * Метод Ньютона по долготе; сходится за 3–4 шага до 1e-7°.
 */
export function searchSunLongitude(target: number, near: Date): Date {
  let t = near;
  for (let i = 0; i < 20; i++) {
    const diff = angleDiff(bodyLongitude("sun", t), target);
    if (Math.abs(diff) < 1e-7) return t;
    const h = 0.25;
    const speed = angleDiff(bodyLongitude("sun", addDays(t, h)), bodyLongitude("sun", addDays(t, -h))) / (2 * h);
    t = addDays(t, -diff / (speed > 0.5 ? speed : MEAN_SUN_SPEED));
  }
  return t;
}

/** Design-дата дизайна человека: Солнце на 88° раньше натального. */
export function designMoment(natal: Date): Date {
  const target = norm360(bodyLongitude("sun", natal) - 88);
  return searchSunLongitude(target, addDays(natal, -88));
}
