/**
 * ЧТО ПОКАЗАТЬ НА КАРТОЧКЕ — галочки перед скачиванием.
 *
 * Человек выкладывает карточку в открытый доступ, поэтому решает он, а
 * не мы. Всё включено по умолчанию, кроме даты рождения.
 *
 * ПОЧЕМУ ДАТА ВЫКЛЮЧЕНА. Дата рождения вместе с именем — это ровно то,
 * что спрашивают при восстановлении доступа к счёту. Включить её человек
 * может, но пусть это будет его решением, а не нашей настройкой по
 * умолчанию. Предупреждаем один раз, коротко и без запугивания: пугать
 * человека на его же празднике — плохая манера.
 */

export type ImageChoices = {
  name: boolean;
  title: boolean;
  line: boolean;
  date: boolean;
};

export const DEFAULT_CHOICES: ImageChoices = { name: true, title: true, line: true, date: false };

/** Предупреждение о дате — ровно одно и ровно в этом месте. */
export const DATE_WARNING =
  "Дата рождения вместе с именем — то, что спрашивают при восстановлении доступа в банке. Подумайте, прежде чем публиковать";

export const CHOICE_LABELS: Array<{ key: keyof ImageChoices; label: string }> = [
  { key: "name", label: "Имя" },
  { key: "title", label: "Название аркана" },
  { key: "line", label: "Строка смысла" },
  { key: "date", label: "Дата рождения" },
];

/** Выбор запоминается на следующий раз — в браузере этого человека. */
export const CHOICES_KEY = "era_image_choices";

export function readChoices(): ImageChoices {
  if (typeof window === "undefined") return DEFAULT_CHOICES;
  try {
    const raw = window.localStorage.getItem(CHOICES_KEY);
    if (!raw) return DEFAULT_CHOICES;
    const v = JSON.parse(raw) as Partial<ImageChoices>;
    return {
      name: typeof v.name === "boolean" ? v.name : DEFAULT_CHOICES.name,
      title: typeof v.title === "boolean" ? v.title : DEFAULT_CHOICES.title,
      line: typeof v.line === "boolean" ? v.line : DEFAULT_CHOICES.line,
      date: typeof v.date === "boolean" ? v.date : DEFAULT_CHOICES.date,
    };
  } catch {
    return DEFAULT_CHOICES;
  }
}

export function writeChoices(c: ImageChoices) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHOICES_KEY, JSON.stringify(c));
  } catch {
    /* приватный режим — выбор просто не запомнится */
  }
}
