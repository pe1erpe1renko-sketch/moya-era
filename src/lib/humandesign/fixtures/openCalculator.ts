/**
 * ЭТАЛОН ДИЗАЙНА ЧЕЛОВЕКА — файл сгенерирован, руками не править.
 *
 * Значения сняты один раз с открытого калькулятора human-design-mcp (MIT,
 * ссылается на Jovian Archive; внутри Swiss Ephemeris) и зафиксированы
 * здесь как данные. Те же двадцать контрольных случаев, что и у натальной
 * карты: СССР с декретным и летним временем, 1991 год, южное полушарие,
 * экватор, Мурманск и Норильск.
 *
 * Сверяются: Design-момент, ворота и линии всех двадцати шести активаций,
 * набор активных ворот, полные каналы, определённые центры, тип,
 * авторитет, профиль и определение.
 */

export type OpenCalcActivation = { body: string; gate: number; line: number };

export type OpenCalcCase = {
  label: string;
  place: string;
  lat: number;
  lon: number;
  tz: string;
  localDate: string;
  localTime: string;
  utc: string;
  /** точный момент карты дизайна */
  designUtc: string;
  designDateOnly: string;
  type: string;
  authority: string;
  profile: string;
  definition: string;
  definedCenters: string[];
  /** «20-34» */
  channels: string[];
  gates: number[];
  personality: OpenCalcActivation[];
  design: OpenCalcActivation[];
  cross: Record<string, unknown>;
};

export const OPEN_CALCULATOR: { source: string; generated: string; cases: OpenCalcCase[] } = {
  "source": "human-design-mcp (MIT) на Swiss Ephemeris — эталон, снят один раз",
  "generated": "2026-09-04",
  "cases": [
    {
      "label": "Москва, декретное и летнее время",
      "place": "Москва",
      "lat": 55.75222,
      "lon": 37.61556,
      "tz": "Europe/Moscow",
      "localDate": "1990-07-26",
      "localTime": "09:00",
      "utc": "1990-07-26T05:00:00Z",
      "designUtc": "1990-04-25T10:46:36Z",
      "designDateOnly": "1990-04-25",
      "type": "Projector",
      "authority": "Splenic",
      "profile": "2/4",
      "definition": "Split Definition",
      "definedCenters": [
        "Ajna",
        "Head",
        "Root",
        "Spleen"
      ],
      "channels": [
        "24-61",
        "28-38"
      ],
      "gates": [
        1,
        2,
        6,
        19,
        22,
        24,
        27,
        28,
        29,
        31,
        33,
        38,
        41,
        52,
        55,
        58,
        61,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 31,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 41,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 6,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 41,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 29,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 52,
          "line": 4
        },
        {
          "body": "Mars",
          "gate": 24,
          "line": 2
        },
        {
          "body": "Jupiter",
          "gate": 62,
          "line": 5
        },
        {
          "body": "Saturn",
          "gate": 61,
          "line": 1
        },
        {
          "body": "Uranus",
          "gate": 58,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 38,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 1,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 31,
          "line": 6
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 27,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 28,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 24,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 19,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 2,
          "line": 5
        },
        {
          "body": "Venus",
          "gate": 22,
          "line": 4
        },
        {
          "body": "Mars",
          "gate": 55,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 52,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 61,
          "line": 5
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 1
        },
        {
          "body": "Neptune",
          "gate": 38,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 1,
          "line": 4
        },
        {
          "body": "South Node",
          "gate": 33,
          "line": 6
        }
      ],
      "cross": {
        "name": "Right Angle Cross of the Unexpected",
        "name_ru": "Крест Правый угол: the Unexpected",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          31,
          41,
          27,
          28
        ],
        "personality_sun": 31,
        "personality_earth": 41,
        "design_sun": 27,
        "design_earth": 28
      }
    },
    {
      "label": "Ленинград, декретное время",
      "place": "Санкт-Петербург",
      "lat": 59.93863,
      "lon": 30.31413,
      "tz": "Europe/Moscow",
      "localDate": "1961-04-12",
      "localTime": "06:07",
      "utc": "1961-04-12T03:07:00Z",
      "designUtc": "1961-01-14T09:05:49Z",
      "designDateOnly": "1961-01-14",
      "type": "Generator",
      "authority": "Emotional",
      "profile": "2/4",
      "definition": "Single Definition",
      "definedCenters": [
        "Heart",
        "Root",
        "Sacral",
        "Self",
        "Solar Plexus",
        "Spleen"
      ],
      "channels": [
        "25-51",
        "26-44",
        "32-54",
        "37-40",
        "42-53"
      ],
      "gates": [
        4,
        15,
        25,
        26,
        29,
        32,
        37,
        40,
        41,
        42,
        44,
        51,
        53,
        54,
        55,
        59,
        60,
        61,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 42,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 32,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 37,
          "line": 6
        },
        {
          "body": "North Node",
          "gate": 59,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 25,
          "line": 5
        },
        {
          "body": "Venus",
          "gate": 51,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 53,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 41,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 60,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 4,
          "line": 4
        },
        {
          "body": "Neptune",
          "gate": 44,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 40,
          "line": 1
        },
        {
          "body": "South Node",
          "gate": 55,
          "line": 6
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 61,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 62,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 26,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 40,
          "line": 2
        },
        {
          "body": "Mercury",
          "gate": 60,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 37,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 15,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 54,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 61,
          "line": 1
        },
        {
          "body": "Uranus",
          "gate": 29,
          "line": 1
        },
        {
          "body": "Neptune",
          "gate": 44,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 40,
          "line": 3
        },
        {
          "body": "South Node",
          "gate": 37,
          "line": 2
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Maya",
        "name_ru": "Крест Правый угол: Maya",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          42,
          32,
          61,
          62
        ],
        "personality_sun": 42,
        "personality_earth": 32,
        "design_sun": 61,
        "design_earth": 62
      }
    },
    {
      "label": "Новосибирск, летнее время",
      "place": "Новосибирск",
      "lat": 55.02259,
      "lon": 82.93175,
      "tz": "Asia/Novosibirsk",
      "localDate": "1985-07-15",
      "localTime": "12:00",
      "utc": "1985-07-15T04:00:00Z",
      "designUtc": "1985-04-14T15:19:30Z",
      "designDateOnly": "1985-04-14",
      "type": "Generator",
      "authority": "Emotional",
      "profile": "2/5",
      "definition": "Triple Split",
      "definedCenters": [
        "Ajna",
        "Root",
        "Sacral",
        "Self",
        "Solar Plexus",
        "Throat"
      ],
      "channels": [
        "17-62",
        "19-49",
        "2-14",
        "23-43"
      ],
      "gates": [
        1,
        2,
        4,
        5,
        10,
        13,
        14,
        16,
        17,
        19,
        23,
        26,
        28,
        32,
        42,
        43,
        45,
        49,
        50,
        61,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 62,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 61,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 45,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 2,
          "line": 4
        },
        {
          "body": "Mercury",
          "gate": 4,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 16,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 62,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 13,
          "line": 2
        },
        {
          "body": "Saturn",
          "gate": 43,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 5,
          "line": 4
        },
        {
          "body": "Neptune",
          "gate": 10,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 50,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 1,
          "line": 4
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 42,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 32,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 49,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 2,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 17,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 17,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 23,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 19,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 14,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 26,
          "line": 1
        },
        {
          "body": "Neptune",
          "gate": 10,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 28,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 1,
          "line": 6
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Maya",
        "name_ru": "Крест Правый угол: Maya",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          62,
          61,
          42,
          32
        ],
        "personality_sun": 62,
        "personality_earth": 61,
        "design_sun": 42,
        "design_earth": 32
      }
    },
    {
      "label": "Свердловск, зима",
      "place": "Екатеринбург",
      "lat": 56.8519,
      "lon": 60.6122,
      "tz": "Asia/Yekaterinburg",
      "localDate": "1985-01-15",
      "localTime": "23:45",
      "utc": "1985-01-15T18:45:00Z",
      "designUtc": "1984-10-20T19:21:41Z",
      "designDateOnly": "1984-10-20",
      "type": "Manifesting Generator",
      "authority": "Sacral",
      "profile": "6/2",
      "definition": "Split Definition",
      "definedCenters": [
        "Root",
        "Sacral",
        "Self",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "1-8",
        "10-34",
        "28-38"
      ],
      "gates": [
        1,
        3,
        5,
        8,
        9,
        10,
        14,
        28,
        34,
        38,
        43,
        50,
        58,
        59,
        61,
        62,
        63
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 61,
          "line": 6
        },
        {
          "body": "Earth",
          "gate": 62,
          "line": 6
        },
        {
          "body": "Moon",
          "gate": 43,
          "line": 1
        },
        {
          "body": "North Node",
          "gate": 8,
          "line": 2
        },
        {
          "body": "Mercury",
          "gate": 58,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 63,
          "line": 2
        },
        {
          "body": "Mars",
          "gate": 63,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 61,
          "line": 5
        },
        {
          "body": "Saturn",
          "gate": 14,
          "line": 2
        },
        {
          "body": "Uranus",
          "gate": 5,
          "line": 6
        },
        {
          "body": "Neptune",
          "gate": 10,
          "line": 5
        },
        {
          "body": "Pluto",
          "gate": 28,
          "line": 3
        },
        {
          "body": "South Node",
          "gate": 14,
          "line": 2
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 50,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 3,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 59,
          "line": 6
        },
        {
          "body": "North Node",
          "gate": 8,
          "line": 4
        },
        {
          "body": "Mercury",
          "gate": 28,
          "line": 3
        },
        {
          "body": "Venus",
          "gate": 34,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 38,
          "line": 2
        },
        {
          "body": "Jupiter",
          "gate": 58,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 1,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 9,
          "line": 6
        },
        {
          "body": "Neptune",
          "gate": 10,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 50,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 14,
          "line": 4
        }
      ],
      "cross": {
        "name": "Left Angle Cross of Maya",
        "name_ru": "Крест Левый угол: Maya",
        "angle": "Left Angle",
        "angle_ru": "Левый угол",
        "gates": [
          61,
          62,
          50,
          3
        ],
        "personality_sun": 61,
        "personality_earth": 62,
        "design_sun": 50,
        "design_earth": 3
      }
    },
    {
      "label": "Киев, летнее время",
      "place": "Киев",
      "lat": 50.45466,
      "lon": 30.5238,
      "tz": "Europe/Kyiv",
      "localDate": "1978-06-25",
      "localTime": "14:30",
      "utc": "1978-06-25T11:30:00Z",
      "designUtc": "1978-03-26T13:56:41Z",
      "designDateOnly": "1978-03-26",
      "type": "Generator",
      "authority": "Emotional",
      "profile": "6/2",
      "definition": "Split Definition",
      "definedCenters": [
        "Ajna",
        "Heart",
        "Root",
        "Sacral",
        "Self",
        "Solar Plexus",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "10-57",
        "17-62",
        "26-44",
        "29-46",
        "37-40",
        "42-53",
        "5-15"
      ],
      "gates": [
        1,
        4,
        5,
        10,
        12,
        15,
        17,
        18,
        25,
        26,
        29,
        33,
        37,
        39,
        40,
        42,
        44,
        46,
        48,
        50,
        53,
        57,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 15,
          "line": 6
        },
        {
          "body": "Earth",
          "gate": 10,
          "line": 6
        },
        {
          "body": "Moon",
          "gate": 37,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 46,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 53,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 33,
          "line": 4
        },
        {
          "body": "Mars",
          "gate": 40,
          "line": 1
        },
        {
          "body": "Jupiter",
          "gate": 39,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 29,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 44,
          "line": 6
        },
        {
          "body": "Neptune",
          "gate": 5,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 48,
          "line": 5
        },
        {
          "body": "South Node",
          "gate": 25,
          "line": 3
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 17,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 18,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 50,
          "line": 4
        },
        {
          "body": "North Node",
          "gate": 18,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 42,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 42,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 62,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 12,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 4,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 1,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 26,
          "line": 2
        },
        {
          "body": "Pluto",
          "gate": 57,
          "line": 1
        },
        {
          "body": "South Node",
          "gate": 17,
          "line": 3
        }
      ],
      "cross": {
        "name": "Left Angle Cross of the Vessel of Love",
        "name_ru": "Крест Левый угол: the Vessel of Love",
        "angle": "Left Angle",
        "angle_ru": "Левый угол",
        "gates": [
          15,
          10,
          17,
          18
        ],
        "personality_sun": 15,
        "personality_earth": 10,
        "design_sun": 17,
        "design_earth": 18
      }
    },
    {
      "label": "Минск, лето 1991 без декретного",
      "place": "Минск",
      "lat": 53.9,
      "lon": 27.56667,
      "tz": "Europe/Minsk",
      "localDate": "1991-08-19",
      "localTime": "03:00",
      "utc": "1991-08-19T00:00:00Z",
      "designUtc": "1991-05-18T23:58:53Z",
      "designDateOnly": "1991-05-18",
      "type": "Projector",
      "authority": "Emotional",
      "profile": "2/4",
      "definition": "Split Definition",
      "definedCenters": [
        "Root",
        "Self",
        "Solar Plexus",
        "Throat"
      ],
      "channels": [
        "1-8",
        "30-41"
      ],
      "gates": [
        1,
        5,
        8,
        14,
        27,
        29,
        30,
        31,
        38,
        39,
        41,
        47,
        53,
        54,
        59,
        60,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 29,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 30,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 5,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 54,
          "line": 4
        },
        {
          "body": "Mercury",
          "gate": 59,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 59,
          "line": 2
        },
        {
          "body": "Mars",
          "gate": 47,
          "line": 5
        },
        {
          "body": "Jupiter",
          "gate": 29,
          "line": 1
        },
        {
          "body": "Saturn",
          "gate": 60,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 1
        },
        {
          "body": "Neptune",
          "gate": 38,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 1,
          "line": 5
        },
        {
          "body": "South Node",
          "gate": 53,
          "line": 4
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 8,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 14,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 31,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 54,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 27,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 39,
          "line": 2
        },
        {
          "body": "Mars",
          "gate": 62,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 31,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 41,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 54,
          "line": 2
        },
        {
          "body": "Pluto",
          "gate": 1,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 53,
          "line": 6
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Contagion",
        "name_ru": "Крест Правый угол: Contagion",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          29,
          30,
          8,
          14
        ],
        "personality_sun": 29,
        "personality_earth": 30,
        "design_sun": 8,
        "design_earth": 14
      }
    },
    {
      "label": "Владивосток, осень 1991",
      "place": "Владивосток",
      "lat": 43.10562,
      "lon": 131.87353,
      "tz": "Asia/Vladivostok",
      "localDate": "1991-10-15",
      "localTime": "22:00",
      "utc": "1991-10-15T13:00:00Z",
      "designUtc": "1991-07-16T17:12:09Z",
      "designDateOnly": "1991-07-16",
      "type": "Generator",
      "authority": "Sacral",
      "profile": "1/4",
      "definition": "Single Definition",
      "definedCenters": [
        "Root",
        "Sacral",
        "Spleen"
      ],
      "channels": [
        "32-54",
        "42-53"
      ],
      "gates": [
        1,
        4,
        7,
        32,
        38,
        39,
        40,
        41,
        42,
        43,
        46,
        50,
        53,
        54,
        59,
        60,
        61,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 32,
          "line": 1
        },
        {
          "body": "Earth",
          "gate": 42,
          "line": 1
        },
        {
          "body": "Moon",
          "gate": 54,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 38,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 50,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 40,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 50,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 40,
          "line": 1
        },
        {
          "body": "Saturn",
          "gate": 60,
          "line": 5
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 1
        },
        {
          "body": "Neptune",
          "gate": 38,
          "line": 5
        },
        {
          "body": "Pluto",
          "gate": 43,
          "line": 1
        },
        {
          "body": "South Node",
          "gate": 39,
          "line": 5
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 62,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 61,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 46,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 54,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 4,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 59,
          "line": 4
        },
        {
          "body": "Mars",
          "gate": 59,
          "line": 1
        },
        {
          "body": "Jupiter",
          "gate": 7,
          "line": 5
        },
        {
          "body": "Saturn",
          "gate": 41,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 2
        },
        {
          "body": "Neptune",
          "gate": 54,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 1,
          "line": 5
        },
        {
          "body": "South Node",
          "gate": 53,
          "line": 5
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Maya",
        "name_ru": "Крест Правый угол: Maya",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          32,
          42,
          62,
          61
        ],
        "personality_sun": 32,
        "personality_earth": 42,
        "design_sun": 62,
        "design_earth": 61
      }
    },
    {
      "label": "Ташкент, 1992",
      "place": "Ташкент",
      "lat": 41.26465,
      "lon": 69.21627,
      "tz": "Asia/Tashkent",
      "localDate": "1992-07-15",
      "localTime": "12:00",
      "utc": "1992-07-15T07:00:00Z",
      "designUtc": "1992-04-14T18:04:40Z",
      "designDateOnly": "1992-04-14",
      "type": "Generator",
      "authority": "Emotional",
      "profile": "3/5",
      "definition": "Triple Split",
      "definedCenters": [
        "Ajna",
        "Root",
        "Sacral",
        "Solar Plexus",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "17-62",
        "23-43",
        "32-54",
        "6-59"
      ],
      "gates": [
        6,
        7,
        10,
        13,
        15,
        17,
        23,
        25,
        32,
        42,
        43,
        54,
        56,
        59,
        60,
        61,
        62,
        63,
        64
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 62,
          "line": 3
        },
        {
          "body": "Earth",
          "gate": 61,
          "line": 3
        },
        {
          "body": "Moon",
          "gate": 60,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 10,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 7,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 56,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 23,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 64,
          "line": 1
        },
        {
          "body": "Saturn",
          "gate": 13,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 54,
          "line": 1
        },
        {
          "body": "Neptune",
          "gate": 54,
          "line": 3
        },
        {
          "body": "Pluto",
          "gate": 43,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 15,
          "line": 3
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 42,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 32,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 6,
          "line": 1
        },
        {
          "body": "North Node",
          "gate": 10,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 25,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 17,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 63,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 59,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 13,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 54,
          "line": 4
        },
        {
          "body": "Neptune",
          "gate": 54,
          "line": 5
        },
        {
          "body": "Pluto",
          "gate": 43,
          "line": 4
        },
        {
          "body": "South Node",
          "gate": 15,
          "line": 6
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Maya",
        "name_ru": "Крест Правый угол: Maya",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          62,
          61,
          42,
          32
        ],
        "personality_sun": 62,
        "personality_earth": 61,
        "design_sun": 42,
        "design_earth": 32
      }
    },
    {
      "label": "Самара, весна 1991",
      "place": "Самара",
      "lat": 53.20007,
      "lon": 50.15,
      "tz": "Europe/Samara",
      "localDate": "1991-04-15",
      "localTime": "08:20",
      "utc": "1991-04-15T05:20:00Z",
      "designUtc": "1991-01-17T09:12:12Z",
      "designDateOnly": "1991-01-17",
      "type": "Generator",
      "authority": "Sacral",
      "profile": "5/1",
      "definition": "Split Definition",
      "definedCenters": [
        "Root",
        "Sacral",
        "Self",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "10-20",
        "13-33",
        "3-60",
        "32-54"
      ],
      "gates": [
        3,
        8,
        10,
        13,
        19,
        20,
        31,
        32,
        33,
        38,
        41,
        42,
        43,
        52,
        54,
        56,
        60,
        61,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 42,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 32,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 3,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 61,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 42,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 20,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 52,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 31,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 41,
          "line": 5
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 54,
          "line": 2
        },
        {
          "body": "Pluto",
          "gate": 43,
          "line": 1
        },
        {
          "body": "South Node",
          "gate": 62,
          "line": 3
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 60,
          "line": 1
        },
        {
          "body": "Earth",
          "gate": 56,
          "line": 1
        },
        {
          "body": "Moon",
          "gate": 19,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 60,
          "line": 2
        },
        {
          "body": "Mercury",
          "gate": 10,
          "line": 6
        },
        {
          "body": "Venus",
          "gate": 13,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 8,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 33,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 60,
          "line": 2
        },
        {
          "body": "Uranus",
          "gate": 38,
          "line": 2
        },
        {
          "body": "Neptune",
          "gate": 38,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 43,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 56,
          "line": 2
        }
      ],
      "cross": {
        "name": "Left Angle Cross of Maya",
        "name_ru": "Крест Левый угол: Maya",
        "angle": "Left Angle",
        "angle_ru": "Левый угол",
        "gates": [
          42,
          32,
          60,
          56
        ],
        "personality_sun": 42,
        "personality_earth": 32,
        "design_sun": 60,
        "design_earth": 56
      }
    },
    {
      "label": "Калининград, 1935, немецкое время",
      "place": "Калининград",
      "lat": 54.70649,
      "lon": 20.51095,
      "tz": "Europe/Kaliningrad",
      "localDate": "1935-02-14",
      "localTime": "04:30",
      "utc": "1935-02-14T03:30:00Z",
      "designUtc": "1934-11-19T13:00:37Z",
      "designDateOnly": "1934-11-19",
      "type": "Generator",
      "authority": "Emotional",
      "profile": "1/3",
      "definition": "Split Definition",
      "definedCenters": [
        "Ajna",
        "Head",
        "Root",
        "Sacral",
        "Solar Plexus"
      ],
      "channels": [
        "3-60",
        "30-41",
        "47-64"
      ],
      "gates": [
        3,
        8,
        14,
        27,
        28,
        29,
        30,
        31,
        32,
        41,
        43,
        44,
        47,
        49,
        52,
        55,
        56,
        60,
        62,
        63,
        64
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 30,
          "line": 1
        },
        {
          "body": "Earth",
          "gate": 29,
          "line": 1
        },
        {
          "body": "Moon",
          "gate": 52,
          "line": 4
        },
        {
          "body": "North Node",
          "gate": 60,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 55,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 63,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 32,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 43,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 30,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 3,
          "line": 2
        },
        {
          "body": "Neptune",
          "gate": 64,
          "line": 3
        },
        {
          "body": "Pluto",
          "gate": 62,
          "line": 4
        },
        {
          "body": "South Node",
          "gate": 56,
          "line": 5
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 14,
          "line": 3
        },
        {
          "body": "Earth",
          "gate": 8,
          "line": 3
        },
        {
          "body": "Moon",
          "gate": 27,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 41,
          "line": 2
        },
        {
          "body": "Mercury",
          "gate": 28,
          "line": 6
        },
        {
          "body": "Venus",
          "gate": 14,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 47,
          "line": 2
        },
        {
          "body": "Jupiter",
          "gate": 44,
          "line": 1
        },
        {
          "body": "Saturn",
          "gate": 49,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 3,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 64,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 62,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 31,
          "line": 2
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Contagion",
        "name_ru": "Крест Правый угол: Contagion",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          30,
          29,
          14,
          8
        ],
        "personality_sun": 30,
        "personality_earth": 29,
        "design_sun": 14,
        "design_earth": 8
      }
    },
    {
      "label": "Тбилиси, 2000",
      "place": "Тбилиси",
      "lat": 41.69411,
      "lon": 44.83368,
      "tz": "Asia/Tbilisi",
      "localDate": "2000-07-15",
      "localTime": "16:45",
      "utc": "2000-07-15T11:45:00Z",
      "designUtc": "2000-04-14T22:50:46Z",
      "designDateOnly": "2000-04-14",
      "type": "Generator",
      "authority": "Sacral",
      "profile": "3/5",
      "definition": "Split Definition",
      "definedCenters": [
        "Ajna",
        "Head",
        "Root",
        "Sacral"
      ],
      "channels": [
        "24-61",
        "42-53"
      ],
      "gates": [
        2,
        5,
        8,
        9,
        20,
        21,
        24,
        25,
        31,
        32,
        38,
        39,
        40,
        41,
        42,
        49,
        53,
        56,
        60,
        61,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 62,
          "line": 3
        },
        {
          "body": "Earth",
          "gate": 61,
          "line": 3
        },
        {
          "body": "Moon",
          "gate": 38,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 62,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 39,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 31,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 53,
          "line": 5
        },
        {
          "body": "Jupiter",
          "gate": 20,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 8,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 49,
          "line": 2
        },
        {
          "body": "Neptune",
          "gate": 41,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 9,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 61,
          "line": 5
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 42,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 32,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 40,
          "line": 4
        },
        {
          "body": "North Node",
          "gate": 56,
          "line": 4
        },
        {
          "body": "Mercury",
          "gate": 25,
          "line": 6
        },
        {
          "body": "Venus",
          "gate": 21,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 2,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 24,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 2,
          "line": 5
        },
        {
          "body": "Uranus",
          "gate": 49,
          "line": 2
        },
        {
          "body": "Neptune",
          "gate": 41,
          "line": 5
        },
        {
          "body": "Pluto",
          "gate": 5,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 60,
          "line": 4
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Maya",
        "name_ru": "Крест Правый угол: Maya",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          62,
          61,
          42,
          32
        ],
        "personality_sun": 62,
        "personality_earth": 61,
        "design_sun": 42,
        "design_earth": 32
      }
    },
    {
      "label": "Алма-Ата, 1975",
      "place": "Алматы",
      "lat": 43.25667,
      "lon": 76.92861,
      "tz": "Asia/Almaty",
      "localDate": "1975-10-05",
      "localTime": "07:15",
      "utc": "1975-10-05T01:15:00Z",
      "designUtc": "1975-07-05T20:19:29Z",
      "designDateOnly": "1975-07-05",
      "type": "Manifesting Generator",
      "authority": "Sacral",
      "profile": "2/4",
      "definition": "Single Definition",
      "definedCenters": [
        "Ajna",
        "Heart",
        "Sacral",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "20-34",
        "20-57",
        "21-45",
        "23-43",
        "27-50",
        "34-57"
      ],
      "gates": [
        9,
        12,
        18,
        20,
        21,
        23,
        27,
        29,
        34,
        38,
        39,
        42,
        43,
        45,
        48,
        50,
        56,
        57,
        59,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 48,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 21,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 48,
          "line": 1
        },
        {
          "body": "North Node",
          "gate": 43,
          "line": 4
        },
        {
          "body": "Mercury",
          "gate": 57,
          "line": 6
        },
        {
          "body": "Venus",
          "gate": 59,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 12,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 42,
          "line": 1
        },
        {
          "body": "Saturn",
          "gate": 56,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 50,
          "line": 6
        },
        {
          "body": "Neptune",
          "gate": 9,
          "line": 5
        },
        {
          "body": "Pluto",
          "gate": 18,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 23,
          "line": 4
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 39,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 38,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 20,
          "line": 1
        },
        {
          "body": "North Node",
          "gate": 34,
          "line": 1
        },
        {
          "body": "Mercury",
          "gate": 45,
          "line": 6
        },
        {
          "body": "Venus",
          "gate": 29,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 27,
          "line": 2
        },
        {
          "body": "Jupiter",
          "gate": 42,
          "line": 2
        },
        {
          "body": "Saturn",
          "gate": 62,
          "line": 1
        },
        {
          "body": "Uranus",
          "gate": 50,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 9,
          "line": 5
        },
        {
          "body": "Pluto",
          "gate": 18,
          "line": 3
        },
        {
          "body": "South Node",
          "gate": 20,
          "line": 1
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Endeavor",
        "name_ru": "Крест Правый угол: Endeavor",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          48,
          21,
          39,
          38
        ],
        "personality_sun": 48,
        "personality_earth": 21,
        "design_sun": 39,
        "design_earth": 38
      }
    },
    {
      "label": "Москва, последний перевод часов 2011",
      "place": "Москва",
      "lat": 55.75222,
      "lon": 37.61556,
      "tz": "Europe/Moscow",
      "localDate": "2011-03-26",
      "localTime": "23:30",
      "utc": "2011-03-26T20:30:00Z",
      "designUtc": "2010-12-29T16:11:59Z",
      "designDateOnly": "2010-12-29",
      "type": "Projector",
      "authority": "Splenic",
      "profile": "3/5",
      "definition": "Single Definition",
      "definedCenters": [
        "Root",
        "Self",
        "Spleen"
      ],
      "channels": [
        "10-57",
        "18-58"
      ],
      "gates": [
        10,
        11,
        12,
        15,
        17,
        18,
        21,
        25,
        26,
        30,
        36,
        38,
        42,
        43,
        48,
        50,
        52,
        54,
        57,
        58
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 17,
          "line": 3
        },
        {
          "body": "Earth",
          "gate": 18,
          "line": 3
        },
        {
          "body": "Moon",
          "gate": 38,
          "line": 1
        },
        {
          "body": "North Node",
          "gate": 11,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 42,
          "line": 3
        },
        {
          "body": "Venus",
          "gate": 30,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 36,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 21,
          "line": 5
        },
        {
          "body": "Saturn",
          "gate": 48,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 25,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 30,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 58,
          "line": 4
        },
        {
          "body": "South Node",
          "gate": 12,
          "line": 6
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 58,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 52,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 50,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 10,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 26,
          "line": 3
        },
        {
          "body": "Venus",
          "gate": 43,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 54,
          "line": 2
        },
        {
          "body": "Jupiter",
          "gate": 36,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 57,
          "line": 2
        },
        {
          "body": "Uranus",
          "gate": 36,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 30,
          "line": 3
        },
        {
          "body": "Pluto",
          "gate": 58,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 15,
          "line": 5
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Service",
        "name_ru": "Крест Правый угол: Service",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          17,
          18,
          58,
          52
        ],
        "personality_sun": 17,
        "personality_earth": 18,
        "design_sun": 58,
        "design_earth": 52
      }
    },
    {
      "label": "Москва, постоянное зимнее время 2015",
      "place": "Москва",
      "lat": 55.75222,
      "lon": 37.61556,
      "tz": "Europe/Moscow",
      "localDate": "2015-01-15",
      "localTime": "12:00",
      "utc": "2015-01-15T09:00:00Z",
      "designUtc": "2014-10-20T08:36:32Z",
      "designDateOnly": "2014-10-20",
      "type": "Generator",
      "authority": "Sacral",
      "profile": "5/1",
      "definition": "Single Definition",
      "definedCenters": [
        "Sacral",
        "Spleen"
      ],
      "channels": [
        "34-57"
      ],
      "gates": [
        1,
        3,
        4,
        11,
        13,
        21,
        32,
        34,
        37,
        38,
        43,
        48,
        50,
        51,
        55,
        57,
        61,
        62,
        64
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 61,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 62,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 1,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 48,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 13,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 13,
          "line": 2
        },
        {
          "body": "Mars",
          "gate": 55,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 4,
          "line": 2
        },
        {
          "body": "Saturn",
          "gate": 34,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 21,
          "line": 4
        },
        {
          "body": "Neptune",
          "gate": 37,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 38,
          "line": 5
        },
        {
          "body": "South Node",
          "gate": 21,
          "line": 5
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 50,
          "line": 1
        },
        {
          "body": "Earth",
          "gate": 3,
          "line": 1
        },
        {
          "body": "Moon",
          "gate": 64,
          "line": 6
        },
        {
          "body": "North Node",
          "gate": 57,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 57,
          "line": 5
        },
        {
          "body": "Venus",
          "gate": 32,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 11,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 4,
          "line": 1
        },
        {
          "body": "Saturn",
          "gate": 43,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 21,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 55,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 38,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 51,
          "line": 5
        }
      ],
      "cross": {
        "name": "Left Angle Cross of Maya",
        "name_ru": "Крест Левый угол: Maya",
        "angle": "Left Angle",
        "angle_ru": "Левый угол",
        "gates": [
          61,
          62,
          50,
          3
        ],
        "personality_sun": 61,
        "personality_earth": 62,
        "design_sun": 50,
        "design_earth": 3
      }
    },
    {
      "label": "Мурманск, полярная ночь",
      "place": "Мурманск",
      "lat": 68.97917,
      "lon": 33.09251,
      "tz": "Europe/Moscow",
      "localDate": "1975-12-21",
      "localTime": "12:00",
      "utc": "1975-12-21T09:00:00Z",
      "designUtc": "1975-09-24T13:07:35Z",
      "designDateOnly": "1975-09-24",
      "type": "Manifesting Generator",
      "authority": "Sacral",
      "profile": "1/3",
      "definition": "Triple Split",
      "definedCenters": [
        "Ajna",
        "Heart",
        "Root",
        "Sacral",
        "Self",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "21-45",
        "23-43",
        "28-38",
        "29-46",
        "5-15"
      ],
      "gates": [
        1,
        2,
        5,
        9,
        10,
        15,
        18,
        21,
        23,
        25,
        28,
        29,
        31,
        32,
        38,
        42,
        43,
        45,
        46,
        48,
        50,
        56
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 10,
          "line": 1
        },
        {
          "body": "Earth",
          "gate": 15,
          "line": 1
        },
        {
          "body": "Moon",
          "gate": 31,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 43,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 38,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 1,
          "line": 4
        },
        {
          "body": "Mars",
          "gate": 45,
          "line": 5
        },
        {
          "body": "Jupiter",
          "gate": 21,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 56,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 28,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 5,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 48,
          "line": 3
        },
        {
          "body": "South Node",
          "gate": 23,
          "line": 3
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 46,
          "line": 3
        },
        {
          "body": "Earth",
          "gate": 25,
          "line": 3
        },
        {
          "body": "Moon",
          "gate": 2,
          "line": 3
        },
        {
          "body": "North Node",
          "gate": 43,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 32,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 29,
          "line": 2
        },
        {
          "body": "Mars",
          "gate": 45,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 42,
          "line": 2
        },
        {
          "body": "Saturn",
          "gate": 56,
          "line": 5
        },
        {
          "body": "Uranus",
          "gate": 50,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 9,
          "line": 4
        },
        {
          "body": "Pluto",
          "gate": 18,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 23,
          "line": 5
        }
      ],
      "cross": {
        "name": "Right Angle Cross of the Vessel of Love",
        "name_ru": "Крест Правый угол: the Vessel of Love",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          10,
          15,
          46,
          25
        ],
        "personality_sun": 10,
        "personality_earth": 15,
        "design_sun": 46,
        "design_earth": 25
      }
    },
    {
      "label": "Норильск, полярный день",
      "place": "Норильск",
      "lat": 69.33427,
      "lon": 88.2127,
      "tz": "Asia/Krasnoyarsk",
      "localDate": "1988-06-05",
      "localTime": "03:20",
      "utc": "1988-06-04T19:20:00Z",
      "designUtc": "1988-03-06T17:31:01Z",
      "designDateOnly": "1988-03-06",
      "type": "Manifestor",
      "authority": "Emotional",
      "profile": "4/6",
      "definition": "Triple Split",
      "definedCenters": [
        "Ajna",
        "Head",
        "Root",
        "Self",
        "Solar Plexus",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "10-57",
        "12-22",
        "19-49",
        "35-36",
        "47-64"
      ],
      "gates": [
        3,
        5,
        6,
        10,
        12,
        19,
        22,
        23,
        35,
        36,
        37,
        38,
        44,
        47,
        49,
        57,
        58,
        63,
        64
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 35,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 5,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 19,
          "line": 5
        },
        {
          "body": "North Node",
          "gate": 22,
          "line": 2
        },
        {
          "body": "Mercury",
          "gate": 12,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 12,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 37,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 23,
          "line": 2
        },
        {
          "body": "Saturn",
          "gate": 10,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 10,
          "line": 2
        },
        {
          "body": "Neptune",
          "gate": 58,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 44,
          "line": 3
        },
        {
          "body": "South Node",
          "gate": 47,
          "line": 2
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 63,
          "line": 6
        },
        {
          "body": "Earth",
          "gate": 64,
          "line": 6
        },
        {
          "body": "Moon",
          "gate": 57,
          "line": 6
        },
        {
          "body": "North Node",
          "gate": 36,
          "line": 1
        },
        {
          "body": "Mercury",
          "gate": 49,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 3,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 58,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 3,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 10,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 10,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 38,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 44,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 6,
          "line": 1
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Consciousness",
        "name_ru": "Крест Правый угол: Consciousness",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          35,
          5,
          63,
          64
        ],
        "personality_sun": 35,
        "personality_earth": 5,
        "design_sun": 63,
        "design_earth": 64
      }
    },
    {
      "label": "Сидней, южное полушарие",
      "place": "Сидней",
      "lat": -33.86785,
      "lon": 151.20732,
      "tz": "Australia/Sydney",
      "localDate": "2004-11-30",
      "localTime": "18:15",
      "utc": "2004-11-30T07:15:00Z",
      "designUtc": "2004-09-02T13:57:28Z",
      "designDateOnly": "2004-09-02",
      "type": "Manifesting Generator",
      "authority": "Emotional",
      "profile": "3/5",
      "definition": "Single Definition",
      "definedCenters": [
        "Ajna",
        "Heart",
        "Root",
        "Sacral",
        "Solar Plexus",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "11-56",
        "16-48",
        "26-44",
        "27-50",
        "37-40",
        "42-53"
      ],
      "gates": [
        3,
        6,
        9,
        11,
        13,
        16,
        19,
        26,
        27,
        28,
        29,
        37,
        40,
        42,
        44,
        48,
        50,
        53,
        55,
        56,
        62,
        64
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 9,
          "line": 3
        },
        {
          "body": "Earth",
          "gate": 16,
          "line": 3
        },
        {
          "body": "Moon",
          "gate": 53,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 3,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 11,
          "line": 5
        },
        {
          "body": "Venus",
          "gate": 44,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 44,
          "line": 6
        },
        {
          "body": "Jupiter",
          "gate": 48,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 56,
          "line": 1
        },
        {
          "body": "Uranus",
          "gate": 55,
          "line": 4
        },
        {
          "body": "Neptune",
          "gate": 19,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 26,
          "line": 5
        },
        {
          "body": "South Node",
          "gate": 50,
          "line": 6
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 40,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 37,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 42,
          "line": 4
        },
        {
          "body": "North Node",
          "gate": 27,
          "line": 2
        },
        {
          "body": "Mercury",
          "gate": 29,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 62,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 64,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 6,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 62,
          "line": 4
        },
        {
          "body": "Uranus",
          "gate": 55,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 13,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 26,
          "line": 3
        },
        {
          "body": "South Node",
          "gate": 28,
          "line": 2
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Planning",
        "name_ru": "Крест Правый угол: Planning",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          9,
          16,
          40,
          37
        ],
        "personality_sun": 9,
        "personality_earth": 16,
        "design_sun": 40,
        "design_earth": 37
      }
    },
    {
      "label": "Буэнос-Айрес, южное полушарие",
      "place": "Буэнос-Айрес",
      "lat": -34.61315,
      "lon": -58.37723,
      "tz": "America/Argentina/Buenos_Aires",
      "localDate": "1978-06-25",
      "localTime": "04:05",
      "utc": "1978-06-25T07:05:00Z",
      "designUtc": "1978-03-26T09:41:18Z",
      "designDateOnly": "1978-03-26",
      "type": "Generator",
      "authority": "Emotional",
      "profile": "6/2",
      "definition": "Split Definition",
      "definedCenters": [
        "Ajna",
        "Heart",
        "Root",
        "Sacral",
        "Self",
        "Solar Plexus",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "10-57",
        "17-62",
        "26-44",
        "29-46",
        "39-55",
        "42-53",
        "5-15"
      ],
      "gates": [
        1,
        4,
        5,
        10,
        12,
        15,
        17,
        18,
        25,
        26,
        29,
        33,
        39,
        40,
        42,
        44,
        46,
        48,
        50,
        53,
        55,
        57,
        62
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 15,
          "line": 6
        },
        {
          "body": "Earth",
          "gate": 10,
          "line": 6
        },
        {
          "body": "Moon",
          "gate": 55,
          "line": 6
        },
        {
          "body": "North Node",
          "gate": 46,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 53,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 33,
          "line": 4
        },
        {
          "body": "Mars",
          "gate": 40,
          "line": 1
        },
        {
          "body": "Jupiter",
          "gate": 39,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 29,
          "line": 3
        },
        {
          "body": "Uranus",
          "gate": 44,
          "line": 6
        },
        {
          "body": "Neptune",
          "gate": 5,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 48,
          "line": 5
        },
        {
          "body": "South Node",
          "gate": 25,
          "line": 3
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 17,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 18,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 50,
          "line": 1
        },
        {
          "body": "North Node",
          "gate": 18,
          "line": 3
        },
        {
          "body": "Mercury",
          "gate": 42,
          "line": 4
        },
        {
          "body": "Venus",
          "gate": 42,
          "line": 1
        },
        {
          "body": "Mars",
          "gate": 62,
          "line": 5
        },
        {
          "body": "Jupiter",
          "gate": 12,
          "line": 6
        },
        {
          "body": "Saturn",
          "gate": 4,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 1,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 26,
          "line": 2
        },
        {
          "body": "Pluto",
          "gate": 57,
          "line": 1
        },
        {
          "body": "South Node",
          "gate": 17,
          "line": 3
        }
      ],
      "cross": {
        "name": "Left Angle Cross of the Vessel of Love",
        "name_ru": "Крест Левый угол: the Vessel of Love",
        "angle": "Left Angle",
        "angle_ru": "Левый угол",
        "gates": [
          15,
          10,
          17,
          18
        ],
        "personality_sun": 15,
        "personality_earth": 10,
        "design_sun": 17,
        "design_earth": 18
      }
    },
    {
      "label": "Кито, экватор",
      "place": "Кито",
      "lat": -0.22985,
      "lon": -78.52495,
      "tz": "America/Guayaquil",
      "localDate": "2011-03-26",
      "localTime": "10:10",
      "utc": "2011-03-26T15:10:00Z",
      "designUtc": "2010-12-29T11:01:02Z",
      "designDateOnly": "2010-12-29",
      "type": "Projector",
      "authority": "Splenic",
      "profile": "2/4",
      "definition": "Single Definition",
      "definedCenters": [
        "Root",
        "Self",
        "Spleen"
      ],
      "channels": [
        "10-57",
        "18-58",
        "32-54"
      ],
      "gates": [
        10,
        11,
        12,
        15,
        17,
        18,
        21,
        25,
        26,
        30,
        32,
        36,
        42,
        43,
        48,
        52,
        54,
        57,
        58
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 17,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 18,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 58,
          "line": 4
        },
        {
          "body": "North Node",
          "gate": 11,
          "line": 6
        },
        {
          "body": "Mercury",
          "gate": 42,
          "line": 3
        },
        {
          "body": "Venus",
          "gate": 30,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 36,
          "line": 3
        },
        {
          "body": "Jupiter",
          "gate": 21,
          "line": 5
        },
        {
          "body": "Saturn",
          "gate": 48,
          "line": 6
        },
        {
          "body": "Uranus",
          "gate": 25,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 30,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 58,
          "line": 4
        },
        {
          "body": "South Node",
          "gate": 12,
          "line": 6
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 58,
          "line": 4
        },
        {
          "body": "Earth",
          "gate": 52,
          "line": 4
        },
        {
          "body": "Moon",
          "gate": 32,
          "line": 4
        },
        {
          "body": "North Node",
          "gate": 10,
          "line": 5
        },
        {
          "body": "Mercury",
          "gate": 26,
          "line": 3
        },
        {
          "body": "Venus",
          "gate": 43,
          "line": 3
        },
        {
          "body": "Mars",
          "gate": 54,
          "line": 2
        },
        {
          "body": "Jupiter",
          "gate": 36,
          "line": 4
        },
        {
          "body": "Saturn",
          "gate": 57,
          "line": 2
        },
        {
          "body": "Uranus",
          "gate": 36,
          "line": 5
        },
        {
          "body": "Neptune",
          "gate": 30,
          "line": 3
        },
        {
          "body": "Pluto",
          "gate": 58,
          "line": 2
        },
        {
          "body": "South Node",
          "gate": 15,
          "line": 5
        }
      ],
      "cross": {
        "name": "Right Angle Cross of Service",
        "name_ru": "Крест Правый угол: Service",
        "angle": "Right Angle",
        "angle_ru": "Правый угол",
        "gates": [
          17,
          18,
          58,
          52
        ],
        "personality_sun": 17,
        "personality_earth": 18,
        "design_sun": 58,
        "design_earth": 52
      }
    },
    {
      "label": "Нью-Йорк, западное полушарие",
      "place": "Нью-Йорк",
      "lat": 40.71427,
      "lon": -74.00597,
      "tz": "America/New_York",
      "localDate": "1968-08-21",
      "localTime": "23:50",
      "utc": "1968-08-22T03:50:00Z",
      "designUtc": "1968-05-22T03:44:13Z",
      "designDateOnly": "1968-05-22",
      "type": "Manifesting Generator",
      "authority": "Sacral",
      "profile": "5/2",
      "definition": "Single Definition",
      "definedCenters": [
        "Ajna",
        "Head",
        "Sacral",
        "Spleen",
        "Throat"
      ],
      "channels": [
        "16-48",
        "20-34",
        "20-57",
        "23-43",
        "34-57",
        "47-64"
      ],
      "gates": [
        6,
        12,
        14,
        16,
        17,
        20,
        21,
        23,
        29,
        30,
        31,
        33,
        34,
        42,
        43,
        47,
        48,
        51,
        57,
        64
      ],
      "personality": [
        {
          "body": "Sun",
          "gate": 29,
          "line": 5
        },
        {
          "body": "Earth",
          "gate": 30,
          "line": 5
        },
        {
          "body": "Moon",
          "gate": 31,
          "line": 6
        },
        {
          "body": "North Node",
          "gate": 21,
          "line": 1
        },
        {
          "body": "Mercury",
          "gate": 64,
          "line": 2
        },
        {
          "body": "Venus",
          "gate": 64,
          "line": 6
        },
        {
          "body": "Mars",
          "gate": 33,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 64,
          "line": 2
        },
        {
          "body": "Saturn",
          "gate": 42,
          "line": 5
        },
        {
          "body": "Uranus",
          "gate": 6,
          "line": 6
        },
        {
          "body": "Neptune",
          "gate": 43,
          "line": 6
        },
        {
          "body": "Pluto",
          "gate": 47,
          "line": 6
        },
        {
          "body": "South Node",
          "gate": 48,
          "line": 1
        }
      ],
      "design": [
        {
          "body": "Sun",
          "gate": 20,
          "line": 2
        },
        {
          "body": "Earth",
          "gate": 34,
          "line": 2
        },
        {
          "body": "Moon",
          "gate": 17,
          "line": 2
        },
        {
          "body": "North Node",
          "gate": 51,
          "line": 4
        },
        {
          "body": "Mercury",
          "gate": 12,
          "line": 1
        },
        {
          "body": "Venus",
          "gate": 23,
          "line": 5
        },
        {
          "body": "Mars",
          "gate": 16,
          "line": 4
        },
        {
          "body": "Jupiter",
          "gate": 29,
          "line": 3
        },
        {
          "body": "Saturn",
          "gate": 42,
          "line": 1
        },
        {
          "body": "Uranus",
          "gate": 6,
          "line": 3
        },
        {
          "body": "Neptune",
          "gate": 14,
          "line": 1
        },
        {
          "body": "Pluto",
          "gate": 47,
          "line": 4
        },
        {
          "body": "South Node",
          "gate": 57,
          "line": 4
        }
      ],
      "cross": {
        "name": "Left Angle Cross of Contagion",
        "name_ru": "Крест Левый угол: Contagion",
        "angle": "Left Angle",
        "angle_ru": "Левый угол",
        "gates": [
          29,
          30,
          20,
          34
        ],
        "personality_sun": 29,
        "personality_earth": 30,
        "design_sun": 20,
        "design_earth": 34
      }
    }
  ]
};
