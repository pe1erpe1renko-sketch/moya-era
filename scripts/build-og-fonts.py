#!/usr/bin/env python3
"""
Шрифты для серверной отрисовки карточки образа: public/fonts/og/.

Карточку рисует next/og (Satori), а он понимает только ttf, otf и woff —
woff2, которым живёт сайт, для него не существует. Без своих шрифтов
карточка на публичной странице вышла бы набранной системной засечкой и
перестала быть похожей на ту, что человек скачал.

    python3 scripts/build-og-fonts.py

Кириллица и латиница у Forum и Onest лежат раздельными подмножествами —
их и оставляем раздельными: Satori берёт тот файл, в котором есть нужный
знак. Веса берём только те, что стоят на карточке: Forum 400 и Onest
400/500.

Требуется fonttools с поддержкой brotli: pip install fonttools brotli
"""

from pathlib import Path

from fontTools.ttLib import TTFont

SOURCES = [
    "forum-cyrillic-400-normal",
    "forum-latin-400-normal",
    "onest-cyrillic-400-normal",
    "onest-latin-400-normal",
    "onest-cyrillic-500-normal",
    "onest-latin-500-normal",
]


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    src = root / "public" / "fonts"
    out = root / "public" / "fonts" / "og"
    out.mkdir(parents=True, exist_ok=True)

    total = 0
    for name in SOURCES:
        path = src / f"{name}.woff2"
        if not path.exists():
            print(f"Нет файла {path}")
            return 1
        font = TTFont(path)
        font.flavor = None  # снимаем упаковку woff2 — получается обычный ttf
        target = out / f"{name}.ttf"
        font.save(target)
        size = target.stat().st_size
        total += size
        print(f"{name}.ttf  {size / 1024:.0f} КБ")
    print(f"итого {total / 1024:.0f} КБ")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
