#!/usr/bin/env python3
"""
Эталонные положения планет для тестов движка эфемерид.

Источник — NASA JPL DE421 через библиотеку Skyfield (pip install skyfield
skyfield-data). Файл de421.bsp идёт в комплекте skyfield-data, ничего
скачивать не нужно. Результат — src/lib/ephemeris/fixtures/jplDe421.ts,
с ним сравнивается astronomy-engine в npm test.

Запуск:  python3 scripts/ephemeris-reference.py

Что считается для каждой даты:
  - видимые геоцентрические эклиптические долгота/широта/расстояние
    относительно истинной эклиптики и равноденствия даты (так же, как
    в астрологических программах);
  - GAST — истинное звёздное время в Гринвиче, в часах;
  - истинный наклон эклиптики;
  - истинный (оскулирующий) лунный узел из вектора состояния Луны.

Шкала времени: до 1972 года гражданское время это UT1 (по Гринвичу),
поэтому даты до 1972 задаются как UT1; с 1972 — как UTC. astronomy-engine
считает вход UT1 = UTC, что для дат рождения верно с точностью до секунды.
"""

import datetime as dt
import json
import os

import numpy as np
from skyfield.api import load, load_file
from skyfield.elementslib import osculating_elements_of
from skyfield.framelib import ecliptic_frame
from skyfield_data import get_skyfield_data_path

DATES = [
    "1931-05-09T03:15:00Z",
    "1935-02-14T04:30:00Z",
    "1938-11-23T22:40:00Z",
    "1945-05-09T20:00:00Z",
    "1953-03-05T18:50:00Z",
    "1961-04-12T06:07:00Z",
    "1968-08-21T00:00:00Z",
    "1972-01-01T00:00:00Z",
    "1977-07-07T07:07:00Z",
    "1981-03-31T21:00:00Z",
    "1986-04-25T21:23:00Z",
    "1990-07-26T09:00:00Z",
    "1991-08-19T03:00:00Z",
    "1994-12-31T23:59:00Z",
    "1999-08-11T11:03:00Z",
    "2000-01-01T12:00:00Z",
    "2004-11-30T18:15:00Z",
    "2008-02-29T12:00:00Z",
    "2011-03-26T23:00:00Z",
    "2014-10-25T22:00:00Z",
    "2020-12-21T18:20:00Z",
    "2024-03-20T03:06:00Z",
    "2026-09-03T12:00:00Z",
    "2029-06-15T15:30:00Z",
]

BODIES = {
    "sun": "sun",
    "moon": "moon",
    "mercury": "mercury",
    "venus": "venus",
    "mars": "mars",
    "jupiter": "jupiter barycenter",
    "saturn": "saturn barycenter",
    "uranus": "uranus barycenter",
    "neptune": "neptune barycenter",
    "pluto": "pluto barycenter",
}


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    eph = load_file(os.path.join(get_skyfield_data_path(), "de421.bsp"))
    ts = load.timescale()
    earth = eph["earth"]
    moon = eph["moon"]

    rows = []
    for iso in DATES:
        d = dt.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
        scale = "ut1" if d.year < 1972 else "utc"
        make = ts.ut1 if scale == "ut1" else ts.utc
        t = make(d.year, d.month, d.day, d.hour, d.minute, d.second)

        here = earth.at(t)
        bodies = {}
        for key, target in BODIES.items():
            apparent = here.observe(eph[target]).apparent()
            lat, lon, dist = apparent.frame_latlon(ecliptic_frame)
            bodies[key] = {
                "lon": round(lon.degrees % 360.0, 6),
                "lat": round(lat.degrees, 6),
                "dist": round(dist.au, 8),
            }

        # Истинный узел: оскулирующие элементы геоцентрической орбиты Луны
        # в системе истинной эклиптики даты.
        geo_moon = (moon - earth).at(t)
        elements = osculating_elements_of(geo_moon, reference_frame=ecliptic_frame.rotation_at(t))
        true_node = float(elements.longitude_of_ascending_node.degrees % 360.0)

        # Истинный наклон эклиптики: угол между полюсами экватора и эклиптики даты.
        z_ecl = ecliptic_frame.rotation_at(t)[2]
        z_eq = t.M[2]
        obliquity = float(np.degrees(np.arccos(np.clip(np.dot(z_ecl, z_eq), -1.0, 1.0))))

        rows.append(
            {
                "utc": iso,
                "timescale": scale,
                "gast": round(float(t.gast), 8),
                "obliquity": round(obliquity, 7),
                "trueNode": round(true_node, 5),
                "bodies": bodies,
            }
        )

    import skyfield

    header = (
        "/**\n"
        " * ЭТАЛОН ДЛЯ ТЕСТОВ ЭФЕМЕРИД — файл сгенерирован, руками не править.\n"
        " * Источник: NASA JPL DE421 через Skyfield %s. Генератор:\n"
        " * scripts/ephemeris-reference.py (там же описано, что именно считается).\n"
        " */\n\n" % skyfield.__version__
    )
    types = (
        "export type ReferenceBody = { lon: number; lat: number; dist: number };\n\n"
        "export type ReferenceDate = {\n"
        "  utc: string;\n"
        "  timescale: \"utc\" | \"ut1\";\n"
        "  /** истинное звёздное время в Гринвиче, часы */\n"
        "  gast: number;\n"
        "  /** истинный наклон эклиптики, градусы */\n"
        "  obliquity: number;\n"
        "  /** истинный (оскулирующий) восходящий узел Луны, градусы */\n"
        "  trueNode: number;\n"
        "  bodies: Record<string, ReferenceBody>;\n"
        "};\n\n"
    )
    payload = {
        "source": "NASA JPL DE421 via Skyfield " + skyfield.__version__,
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
        "dates": rows,
    }
    body = "export const JPL_DE421: { source: string; generated: string; dates: ReferenceDate[] } = "
    body += json.dumps(payload, indent=2, ensure_ascii=False) + ";\n"

    out_dir = os.path.join(root, "src", "lib", "ephemeris", "fixtures")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "jplDe421.ts")
    with open(out, "w", encoding="utf-8") as f:
        f.write(header + types + body)
    print("written", out, "dates:", len(rows))


if __name__ == "__main__":
    main()
