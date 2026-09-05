#!/usr/bin/env python3
"""
Иллюстрации арканов: public/arcana/.

Заказчик присылает 22 файла JPEG, названные 01–22 по номеру аркана,
примерно 896×1200 и по 300 КБ каждый. Оригиналы нужны целиком: из них
собираются карточки-талисманы (очередь 3). Но на странице разбора
иллюстраций до двадцати пяти сразу, и семь мегабайт туда отдавать
нельзя — поэтому рядом кладутся уменьшенные версии.

    python3 scripts/build-arcana.py <каталог с 01.jpeg … 22.jpeg>

Что получается:
    public/arcana/01.jpeg        оригинал, ~900×1200 — талисманы
    public/arcana/lg/01.jpeg     ширина 560 — крупные (карта дня, расчёт)
    public/arcana/md/01.jpeg     ширина 320 — средние (шапка разбора)
    public/arcana/sm/01.jpeg     ширина 240 — мелкие (сферы, кабинет)

Ширины взяты с запасом вдвое против размера на экране: на телефонах с
плотным экраном картинка шириной 120 точек занимает 240 пикселей, и без
запаса она была бы мыльной. Три ступени, а не две, потому что с двумя
шапка разбора — рамка в 132 точки — тянула файл на 560 пикселей и одна
весила больше, чем все остальные картинки страницы вместе.

Пропорции НЕ выравниваем: у присланных файлов они чуть разные (от 0,736
до 0,750), и обрезать чужую работу ради круглого числа незачем. Рамку
задаёт вёрстка, картинка вписывается в неё по `object-cover`.

Требуется Pillow: pip install Pillow
"""

import sys
from pathlib import Path

from PIL import Image

ARCANA = 22
SIZES = {"lg": 560, "md": 320, "sm": 240}
QUALITY = 82

def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = Path(sys.argv[1])
    out = Path(__file__).resolve().parent.parent / "public" / "arcana"

    missing = [n for n in range(1, ARCANA + 1) if not (src / f"{n:02d}.jpeg").exists()]
    if missing:
        print(f"Нет файлов: {', '.join(f'{n:02d}.jpeg' for n in missing)}")
        return 1

    for folder in ["", *SIZES]:
        (out / folder).mkdir(parents=True, exist_ok=True)

    total = {"": 0, **{k: 0 for k in SIZES}}
    for n in range(1, ARCANA + 1):
        name = f"{n:02d}.jpeg"
        with Image.open(src / name) as im:
            im = im.convert("RGB")
            full = out / name
            im.save(full, "JPEG", quality=90, optimize=True, progressive=True)
            total[""] += full.stat().st_size

            for folder, width in SIZES.items():
                height = round(im.height * width / im.width)
                small = im.resize((width, height), Image.LANCZOS)
                path = out / folder / name
                small.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
                total[folder] += path.stat().st_size
            print(f"{name}  {im.width}×{im.height}")

    for folder, size in total.items():
        print(f"{folder or 'оригиналы':>10}: {size / 1024 / 1024:.2f} МБ  ({size / ARCANA / 1024:.0f} КБ на файл)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
