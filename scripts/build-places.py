#!/usr/bin/env python3
"""
Справочник мест рождения: src/lib/geo/data/places.json.

Источник — GeoNames (https://www.geonames.org, лицензия CC BY 4.0), выгрузка
cities500.txt (все населённые пункты от 500 жителей, 19 колонок, включая
код типа объекта). Сайт GeoNames из среды разработки недоступен, поэтому
файл берётся из npm-пакета cities-500-structured, который его бандлит:

    npm pack cities-500-structured@1.0.1
    tar xzf cities-500-structured-1.0.1.tgz package/dist/cities500.txt
    python3 scripts/build-places.py package/dist/cities500.txt [--review]

Условие лицензии — указать источник на сайте; строка есть в подвале.

Что попадает в справочник:
  - бывший СССР (15 стран): все населённые пункты от 500 жителей — люди
    1950–1990-х годов рождения часто родились в посёлках и сёлах;
  - остальной мир: города от 50 000 жителей;
  - районы городов (код PPLX), исчезнувшие и исторические места (PPLH,
    PPLQ, PPLW, PPLCH) не берутся: в них не рождаются.

Для каждого места: id GeoNames, русское название, английское название,
страна, регион, координаты, часовой пояс IANA, население и псевдонимы для
поиска (старые и другие кириллические названия: Ленинград, Свердловск,
Горький, Куйбышев). Регион и страна выводятся по-русски из таблиц ниже.

Русское название выбирается из альтернативных названий GeoNames. Языковых
меток в выгрузке нет, поэтому берётся вариант, чья транслитерация ближе к
английскому названию, с поправкой на русскую орфографию (мягкий знак,
двойные согласные, окончания). Для крупных городов, где английское название
идёт от другого языка (Kyiv, Kharkiv, Almaty), стоят явные переопределения.
"""

import datetime as dt
import json
import os
import re
import sys
import unicodedata

USSR = ["RU", "UA", "BY", "KZ", "UZ", "KG", "TJ", "TM", "AZ", "AM", "GE", "MD", "LT", "LV", "EE"]
WORLD_MIN_POPULATION = 50_000

# Страны, где латинское название без кириллицы можно обратно транслитерировать.
REVERSE_TRANSLIT_COUNTRIES = {"RU", "BY", "KZ", "KG", "TJ", "TM", "UZ"}

# Коды объектов GeoNames, которые не берём: районы городов, исчезнувшие и
# исторические населённые пункты.
EXCLUDED_FEATURE_CODES = {"PPLX", "PPLH", "PPLQ", "PPLW", "PPLCH"}

COUNTRIES = {
    "AD": "Андорра", "AE": "ОАЭ", "AF": "Афганистан", "AG": "Антигуа и Барбуда", "AI": "Ангилья",
    "AL": "Албания", "AM": "Армения", "AO": "Ангола", "AQ": "Антарктида", "AR": "Аргентина",
    "AS": "Американское Самоа", "AT": "Австрия", "AU": "Австралия", "AW": "Аруба", "AX": "Аландские острова",
    "AZ": "Азербайджан", "BA": "Босния и Герцеговина", "BB": "Барбадос", "BD": "Бангладеш", "BE": "Бельгия",
    "BF": "Буркина-Фасо", "BG": "Болгария", "BH": "Бахрейн", "BI": "Бурунди", "BJ": "Бенин",
    "BL": "Сен-Бартелеми", "BM": "Бермуды", "BN": "Бруней", "BO": "Боливия", "BQ": "Бонэйр",
    "BR": "Бразилия", "BS": "Багамы", "BT": "Бутан", "BV": "Остров Буве", "BW": "Ботсвана",
    "BY": "Беларусь", "BZ": "Белиз", "CA": "Канада", "CC": "Кокосовые острова", "CD": "ДР Конго",
    "CF": "ЦАР", "CG": "Конго", "CH": "Швейцария", "CI": "Кот-д’Ивуар", "CK": "Острова Кука",
    "CL": "Чили", "CM": "Камерун", "CN": "Китай", "CO": "Колумбия", "CR": "Коста-Рика",
    "CU": "Куба", "CV": "Кабо-Верде", "CW": "Кюрасао", "CX": "Остров Рождества", "CY": "Кипр",
    "CZ": "Чехия", "DE": "Германия", "DJ": "Джибути", "DK": "Дания", "DM": "Доминика",
    "DO": "Доминиканская Республика", "DZ": "Алжир", "EC": "Эквадор", "EE": "Эстония", "EG": "Египет",
    "EH": "Западная Сахара", "ER": "Эритрея", "ES": "Испания", "ET": "Эфиопия", "FI": "Финляндия",
    "FJ": "Фиджи", "FK": "Фолклендские острова", "FM": "Микронезия", "FO": "Фарерские острова", "FR": "Франция",
    "GA": "Габон", "GB": "Великобритания", "GD": "Гренада", "GE": "Грузия", "GF": "Французская Гвиана",
    "GG": "Гернси", "GH": "Гана", "GI": "Гибралтар", "GL": "Гренландия", "GM": "Гамбия",
    "GN": "Гвинея", "GP": "Гваделупа", "GQ": "Экваториальная Гвинея", "GR": "Греция", "GS": "Южная Георгия",
    "GT": "Гватемала", "GU": "Гуам", "GW": "Гвинея-Бисау", "GY": "Гайана", "HK": "Гонконг",
    "HM": "Острова Херд и Макдональд", "HN": "Гондурас", "HR": "Хорватия", "HT": "Гаити", "HU": "Венгрия",
    "ID": "Индонезия", "IE": "Ирландия", "IL": "Израиль", "IM": "Остров Мэн", "IN": "Индия",
    "IO": "Британская территория в Индийском океане", "IQ": "Ирак", "IR": "Иран", "IS": "Исландия", "IT": "Италия",
    "JE": "Джерси", "JM": "Ямайка", "JO": "Иордания", "JP": "Япония", "KE": "Кения",
    "KG": "Кыргызстан", "KH": "Камбоджа", "KI": "Кирибати", "KM": "Коморы", "KN": "Сент-Китс и Невис",
    "KP": "КНДР", "KR": "Южная Корея", "KW": "Кувейт", "KY": "Каймановы острова", "KZ": "Казахстан",
    "LA": "Лаос", "LB": "Ливан", "LC": "Сент-Люсия", "LI": "Лихтенштейн", "LK": "Шри-Ланка",
    "LR": "Либерия", "LS": "Лесото", "LT": "Литва", "LU": "Люксембург", "LV": "Латвия",
    "LY": "Ливия", "MA": "Марокко", "MC": "Монако", "MD": "Молдова", "ME": "Черногория",
    "MF": "Сен-Мартен", "MG": "Мадагаскар", "MH": "Маршалловы Острова", "MK": "Северная Македония", "ML": "Мали",
    "MM": "Мьянма", "MN": "Монголия", "MO": "Макао", "MP": "Северные Марианские острова", "MQ": "Мартиника",
    "MR": "Мавритания", "MS": "Монтсеррат", "MT": "Мальта", "MU": "Маврикий", "MV": "Мальдивы",
    "MW": "Малави", "MX": "Мексика", "MY": "Малайзия", "MZ": "Мозамбик", "NA": "Намибия",
    "NC": "Новая Каледония", "NE": "Нигер", "NF": "Остров Норфолк", "NG": "Нигерия", "NI": "Никарагуа",
    "NL": "Нидерланды", "NO": "Норвегия", "NP": "Непал", "NR": "Науру", "NU": "Ниуэ",
    "NZ": "Новая Зеландия", "OM": "Оман", "PA": "Панама", "PE": "Перу", "PF": "Французская Полинезия",
    "PG": "Папуа — Новая Гвинея", "PH": "Филиппины", "PK": "Пакистан", "PL": "Польша", "PM": "Сен-Пьер и Микелон",
    "PN": "Питкэрн", "PR": "Пуэрто-Рико", "PS": "Палестина", "PT": "Португалия", "PW": "Палау",
    "PY": "Парагвай", "QA": "Катар", "RE": "Реюньон", "RO": "Румыния", "RS": "Сербия",
    "RU": "Россия", "RW": "Руанда", "SA": "Саудовская Аравия", "SB": "Соломоновы Острова", "SC": "Сейшелы",
    "SD": "Судан", "SE": "Швеция", "SG": "Сингапур", "SH": "Остров Святой Елены", "SI": "Словения",
    "SJ": "Шпицберген", "SK": "Словакия", "SL": "Сьерра-Леоне", "SM": "Сан-Марино", "SN": "Сенегал",
    "SO": "Сомали", "SR": "Суринам", "SS": "Южный Судан", "ST": "Сан-Томе и Принсипи", "SV": "Сальвадор",
    "SX": "Синт-Мартен", "SY": "Сирия", "SZ": "Эсватини", "TC": "Тёркс и Кайкос", "TD": "Чад",
    "TF": "Французские Южные территории", "TG": "Того", "TH": "Таиланд", "TJ": "Таджикистан", "TK": "Токелау",
    "TL": "Восточный Тимор", "TM": "Туркменистан", "TN": "Тунис", "TO": "Тонга", "TR": "Турция",
    "TT": "Тринидад и Тобаго", "TV": "Тувалу", "TW": "Тайвань", "TZ": "Танзания", "UA": "Украина",
    "UG": "Уганда", "UM": "Внешние малые острова США", "US": "США", "UY": "Уругвай", "UZ": "Узбекистан",
    "VA": "Ватикан", "VC": "Сент-Винсент и Гренадины", "VE": "Венесуэла", "VG": "Британские Виргинские острова",
    "VI": "Виргинские острова США", "VN": "Вьетнам", "VU": "Вануату", "WF": "Уоллис и Футуна", "WS": "Самоа",
    "XK": "Косово", "YE": "Йемен", "YT": "Майотта", "ZA": "ЮАР", "ZM": "Замбия", "ZW": "Зимбабве",
}

# Коды регионов GeoNames (admin1) → русское название. Азербайджан, Молдова и
# Латвия делятся на десятки районов, там регион не показываем.
REGIONS = {
    # Россия
    "RU.01": "Адыгея", "RU.03": "Республика Алтай", "RU.04": "Алтайский край", "RU.05": "Амурская область",
    "RU.06": "Архангельская область", "RU.07": "Астраханская область", "RU.08": "Башкортостан",
    "RU.09": "Белгородская область", "RU.10": "Брянская область", "RU.11": "Бурятия", "RU.12": "Чечня",
    "RU.13": "Челябинская область", "RU.15": "Чукотский АО", "RU.16": "Чувашия", "RU.17": "Дагестан",
    "RU.19": "Ингушетия", "RU.20": "Иркутская область", "RU.21": "Ивановская область",
    "RU.22": "Кабардино-Балкария", "RU.23": "Калининградская область", "RU.24": "Калмыкия",
    "RU.25": "Калужская область", "RU.27": "Карачаево-Черкесия", "RU.28": "Карелия",
    "RU.29": "Кемеровская область", "RU.30": "Хабаровский край", "RU.31": "Хакасия",
    "RU.32": "Ханты-Мансийский АО", "RU.33": "Кировская область", "RU.34": "Коми",
    "RU.37": "Костромская область", "RU.38": "Краснодарский край", "RU.40": "Курганская область",
    "RU.41": "Курская область", "RU.42": "Ленинградская область", "RU.43": "Липецкая область",
    "RU.44": "Магаданская область", "RU.45": "Марий Эл", "RU.46": "Мордовия", "RU.47": "Московская область",
    "RU.48": "Москва", "RU.49": "Мурманская область", "RU.50": "Ненецкий АО",
    "RU.51": "Нижегородская область", "RU.52": "Новгородская область", "RU.53": "Новосибирская область",
    "RU.54": "Омская область", "RU.55": "Оренбургская область", "RU.56": "Орловская область",
    "RU.57": "Пензенская область", "RU.59": "Приморский край", "RU.60": "Псковская область",
    "RU.61": "Ростовская область", "RU.62": "Рязанская область", "RU.63": "Якутия",
    "RU.64": "Сахалинская область", "RU.65": "Самарская область", "RU.66": "Санкт-Петербург",
    "RU.67": "Саратовская область", "RU.68": "Северная Осетия", "RU.69": "Смоленская область",
    "RU.70": "Ставропольский край", "RU.71": "Свердловская область", "RU.72": "Тамбовская область",
    "RU.73": "Татарстан", "RU.75": "Томская область", "RU.76": "Тульская область",
    "RU.77": "Тверская область", "RU.78": "Тюменская область", "RU.79": "Тыва",
    "RU.80": "Удмуртия", "RU.81": "Ульяновская область", "RU.83": "Владимирская область",
    "RU.84": "Волгоградская область", "RU.85": "Вологодская область", "RU.86": "Воронежская область",
    "RU.87": "Ямало-Ненецкий АО", "RU.88": "Ярославская область", "RU.89": "Еврейская АО",
    "RU.90": "Пермский край", "RU.91": "Красноярский край", "RU.92": "Камчатский край",
    "RU.93": "Забайкальский край",
    # Украина
    "UA.01": "Черкасская область", "UA.02": "Черниговская область", "UA.03": "Черновицкая область",
    "UA.04": "Днепропетровская область", "UA.05": "Донецкая область", "UA.06": "Ивано-Франковская область",
    "UA.07": "Харьковская область", "UA.08": "Херсонская область", "UA.09": "Хмельницкая область",
    "UA.10": "Кировоградская область", "UA.11": "Крым", "UA.12": "Киев", "UA.13": "Киевская область",
    "UA.14": "Луганская область", "UA.15": "Львовская область", "UA.16": "Николаевская область",
    "UA.17": "Одесская область", "UA.18": "Полтавская область", "UA.19": "Ровненская область",
    "UA.20": "Севастополь", "UA.21": "Сумская область", "UA.22": "Тернопольская область",
    "UA.23": "Винницкая область", "UA.24": "Волынская область", "UA.25": "Закарпатская область",
    "UA.26": "Запорожская область", "UA.27": "Житомирская область",
    # Беларусь
    "BY.01": "Брестская область", "BY.02": "Гомельская область", "BY.03": "Гродненская область",
    "BY.04": "Минск", "BY.05": "Минская область", "BY.06": "Могилёвская область", "BY.07": "Витебская область",
    # Казахстан
    "KZ.01": "Алматинская область", "KZ.02": "Алматы", "KZ.03": "Акмолинская область",
    "KZ.04": "Актюбинская область", "KZ.05": "Астана", "KZ.06": "Атырауская область",
    "KZ.07": "Западно-Казахстанская область", "KZ.08": "Байконур", "KZ.09": "Мангистауская область",
    "KZ.10": "Туркестанская область", "KZ.11": "Павлодарская область", "KZ.12": "Карагандинская область",
    "KZ.12510143": "Абайская область", "KZ.12510144": "Жетысуская область", "KZ.12510145": "Улытауская область",
    "KZ.13": "Костанайская область", "KZ.14": "Кызылординская область",
    "KZ.15": "Восточно-Казахстанская область", "KZ.1537272": "Шымкент",
    "KZ.16": "Северо-Казахстанская область", "KZ.17": "Жамбылская область",
    # Узбекистан
    "UZ.01": "Андижанская область", "UZ.02": "Бухарская область", "UZ.03": "Ферганская область",
    "UZ.05": "Хорезмская область", "UZ.06": "Наманганская область", "UZ.07": "Навоийская область",
    "UZ.08": "Кашкадарьинская область", "UZ.09": "Каракалпакстан", "UZ.10": "Самаркандская область",
    "UZ.12": "Сурхандарьинская область", "UZ.13": "Ташкент", "UZ.14": "Ташкентская область",
    "UZ.15": "Джизакская область", "UZ.16": "Сырдарьинская область",
    # Кыргызстан
    "KG.01": "Бишкек", "KG.02": "Чуйская область", "KG.03": "Джалал-Абадская область",
    "KG.04": "Нарынская область", "KG.06": "Таласская область", "KG.07": "Иссык-Кульская область",
    "KG.08": "Ошская область", "KG.09": "Баткенская область", "KG.10": "Ош",
    # Таджикистан
    "TJ.01": "Горно-Бадахшанская АО", "TJ.02": "Хатлонская область", "TJ.03": "Согдийская область",
    "TJ.04": "Душанбе", "TJ.RR": "Районы республиканского подчинения",
    # Туркменистан
    "TM.01": "Ахалский велаят", "TM.02": "Балканский велаят", "TM.03": "Дашогузский велаят",
    "TM.04": "Лебапский велаят", "TM.05": "Марыйский велаят", "TM.S": "Ашхабад",
    # Армения
    "AM.01": "Арагацотн", "AM.02": "Арарат", "AM.03": "Армавир", "AM.04": "Гегаркуник", "AM.05": "Котайк",
    "AM.06": "Лори", "AM.07": "Ширак", "AM.08": "Сюник", "AM.09": "Тавуш", "AM.10": "Вайоц-Дзор", "AM.11": "Ереван",
    # Грузия
    "GE.02": "Абхазия", "GE.04": "Аджария", "GE.51": "Тбилиси", "GE.65": "Гурия", "GE.66": "Имеретия",
    "GE.67": "Кахетия", "GE.68": "Квемо-Картли", "GE.69": "Мцхета-Мтианети",
    "GE.70": "Рача-Лечхуми и Квемо-Сванети", "GE.71": "Самегрело-Земо-Сванети",
    "GE.72": "Самцхе-Джавахети", "GE.73": "Шида-Картли",
    # Литва
    "LT.56": "Алитусский уезд", "LT.57": "Каунасский уезд", "LT.58": "Клайпедский уезд",
    "LT.59": "Мариямпольский уезд", "LT.60": "Паневежский уезд", "LT.61": "Шяуляйский уезд",
    "LT.62": "Таурагский уезд", "LT.63": "Тельшяйский уезд", "LT.64": "Утенский уезд", "LT.65": "Вильнюсский уезд",
    # Эстония
    "EE.01": "Харьюмаа", "EE.02": "Хийумаа", "EE.03": "Ида-Вирумаа", "EE.04": "Ярвамаа", "EE.05": "Йыгевамаа",
    "EE.07": "Ляэнемаа", "EE.08": "Ляэне-Вирумаа", "EE.11": "Пярнумаа", "EE.12": "Пылвамаа", "EE.13": "Рапламаа",
    "EE.14": "Сааремаа", "EE.18": "Тартумаа", "EE.19": "Валгамаа", "EE.20": "Вильяндимаа", "EE.21": "Вырумаа",
}

# Явные русские названия: (страна, английское название GeoNames) → название.
# Нужны там, где английское название идёт не от русского (Kyiv, Almaty)
# или эвристика выбирает не тот вариант (Moscow → Москов).
OVERRIDES = {
    ("RU", "Moscow"): "Москва", ("RU", "Saint Petersburg"): "Санкт-Петербург",
    ("RU", "Rostov-na-Donu"): "Ростов-на-Дону", ("RU", "Yoshkar-Ola"): "Йошкар-Ола",
    ("RU", "Naberezhnyye Chelny"): "Набережные Челны", ("RU", "Nizhniy Novgorod"): "Нижний Новгород",
    ("RU", "Sevastopol"): "Севастополь", ("RU", "Simferopol"): "Симферополь",
    ("UA", "Kyiv"): "Киев", ("UA", "Kharkiv"): "Харьков", ("UA", "Odesa"): "Одесса", ("UA", "Dnipro"): "Днепр",
    ("UA", "Donetsk"): "Донецк", ("UA", "Zaporizhzhia"): "Запорожье", ("UA", "Lviv"): "Львов",
    ("UA", "Kryvyi Rih"): "Кривой Рог", ("UA", "Kryvyy Rih"): "Кривой Рог", ("UA", "Mykolaiv"): "Николаев",
    ("UA", "Mykolayiv"): "Николаев", ("UA", "Sevastopol"): "Севастополь", ("UA", "Zaporizhzhya"): "Запорожье",
    ("UA", "Vinnytsya"): "Винница", ("UA", "Makiyivka"): "Макеевка", ("UA", "Kamyanske"): "Каменское",
    ("UA", "Kamianske"): "Каменское", ("UA", "Zhovti Vody"): "Жёлтые Воды",
    ("UA", "Mariupol"): "Мариуполь", ("UA", "Luhansk"): "Луганск", ("UA", "Vinnytsia"): "Винница",
    ("UA", "Makiivka"): "Макеевка", ("UA", "Simferopol"): "Симферополь", ("UA", "Chernihiv"): "Чернигов",
    ("UA", "Kherson"): "Херсон", ("UA", "Poltava"): "Полтава", ("UA", "Khmelnytskyi"): "Хмельницкий",
    ("UA", "Cherkasy"): "Черкассы", ("UA", "Chernivtsi"): "Черновцы", ("UA", "Zhytomyr"): "Житомир",
    ("UA", "Sumy"): "Сумы", ("UA", "Rivne"): "Ровно", ("UA", "Horlivka"): "Горловка",
    ("UA", "Ivano-Frankivsk"): "Ивано-Франковск", ("UA", "Kamianske"): "Каменское",
    ("UA", "Kropyvnytskyi"): "Кропивницкий", ("UA", "Kropyvnytskyy"): "Кропивницкий", ("UA", "Ternopil"): "Тернополь",
    ("UA", "Kremenchuk"): "Кременчуг",
    ("UA", "Lutsk"): "Луцк", ("UA", "Bila Tserkva"): "Белая Церковь", ("UA", "Kerch"): "Керчь",
    ("UA", "Melitopol"): "Мелитополь", ("UA", "Kramatorsk"): "Краматорск", ("UA", "Uzhhorod"): "Ужгород",
    ("UA", "Brovary"): "Бровары", ("UA", "Yevpatoriya"): "Евпатория", ("UA", "Berdiansk"): "Бердянск",
    ("UA", "Nikopol"): "Никополь", ("UA", "Sloviansk"): "Славянск", ("UA", "Alchevsk"): "Алчевск",
    ("UA", "Pavlohrad"): "Павлоград", ("UA", "Sieverodonetsk"): "Северодонецк", ("UA", "Yalta"): "Ялта",
    ("UA", "Feodosiya"): "Феодосия", ("UA", "Kamianets-Podilskyi"): "Каменец-Подольский",
    ("BY", "Minsk"): "Минск", ("BY", "Homyel'"): "Гомель", ("BY", "Mahilyow"): "Могилёв",
    ("BY", "Vitebsk"): "Витебск", ("BY", "Hrodna"): "Гродно", ("BY", "Brest"): "Брест",
    ("BY", "Babruysk"): "Бобруйск", ("BY", "Bobruysk"): "Бобруйск", ("BY", "Baranovichi"): "Барановичи",
    ("BY", "Barysaw"): "Борисов",
    ("BY", "Pinsk"): "Пинск", ("BY", "Orsha"): "Орша", ("BY", "Mazyr"): "Мозырь",
    ("BY", "Salihorsk"): "Солигорск", ("BY", "Navapolatsk"): "Новополоцк", ("BY", "Lida"): "Лида",
    ("BY", "Maladzyechna"): "Молодечно", ("BY", "Polatsk"): "Полоцк", ("BY", "Zhlobin"): "Жлобин",
    ("BY", "Svyetlahorsk"): "Светлогорск", ("BY", "Rechytsa"): "Речица", ("BY", "Zhodzina"): "Жодино",
    ("BY", "Slutsk"): "Слуцк", ("BY", "Kobryn"): "Кобрин", ("BY", "Slonim"): "Слоним",
    ("KZ", "Almaty"): "Алматы", ("KZ", "Astana"): "Астана", ("KZ", "Shymkent"): "Шымкент",
    ("KZ", "Karagandy"): "Караганда", ("KZ", "Aktobe"): "Актобе", ("KZ", "Taraz"): "Тараз",
    ("KZ", "Pavlodar"): "Павлодар", ("KZ", "Oskemen"): "Усть-Каменогорск", ("KZ", "Semey"): "Семей",
    ("KZ", "Atyrau"): "Атырау", ("KZ", "Kostanay"): "Костанай", ("KZ", "Kyzylorda"): "Кызылорда",
    ("KZ", "Oral"): "Уральск", ("KZ", "Petropavl"): "Петропавловск", ("KZ", "Aktau"): "Актау",
    ("KZ", "Temirtau"): "Темиртау", ("KZ", "Turkestan"): "Туркестан", ("KZ", "Kokshetau"): "Кокшетау",
    ("KZ", "Taldykorgan"): "Талдыкорган", ("KZ", "Ekibastuz"): "Экибастуз", ("KZ", "Rudnyy"): "Рудный",
    ("KZ", "Zhezqazghan"): "Жезказган", ("KZ", "Balqash"): "Балхаш", ("KZ", "Kentau"): "Кентау",
    ("KZ", "Ust-Kamenogorsk"): "Усть-Каменогорск", ("KZ", "Turkistan"): "Туркестан",
    ("KZ", "Zhezkazgan"): "Жезказган", ("KZ", "Balkhash"): "Балхаш",
    ("UZ", "Tashkent"): "Ташкент", ("UZ", "Samarkand"): "Самарканд", ("UZ", "Bukhara"): "Бухара",
    ("UZ", "Namangan"): "Наманган", ("UZ", "Andijon"): "Андижан", ("UZ", "Fergana"): "Фергана",
    ("UZ", "Nukus"): "Нукус", ("UZ", "Qarshi"): "Карши", ("UZ", "Kokand"): "Коканд",
    ("UZ", "Margilan"): "Маргилан", ("UZ", "Jizzax"): "Джизак", ("UZ", "Urgench"): "Ургенч",
    ("UZ", "Termiz"): "Термез", ("UZ", "Tirmiz"): "Термез", ("UZ", "Navoiy"): "Навои", ("UZ", "Angren"): "Ангрен",
    ("UZ", "Chirchiq"): "Чирчик", ("UZ", "Urganch"): "Ургенч", ("UZ", "Shahrisabz"): "Шахрисабз",
    ("UZ", "Olmaliq"): "Алмалык", ("UZ", "Qo‘qon"): "Коканд", ("UZ", "Marg‘ilon"): "Маргилан",
    ("KG", "Bishkek"): "Бишкек", ("KG", "Osh"): "Ош", ("KG", "Jalal-Abad"): "Джалал-Абад",
    ("KG", "Karakol"): "Каракол", ("KG", "Tokmok"): "Токмок", ("KG", "Kara-Balta"): "Кара-Балта",
    ("TJ", "Dushanbe"): "Душанбе", ("TJ", "Khujand"): "Худжанд", ("TJ", "Kŭlob"): "Куляб",
    ("TJ", "Bokhtar"): "Бохтар", ("TJ", "Istaravshan"): "Истаравшан",
    ("TM", "Ashgabat"): "Ашхабад", ("TM", "Türkmenabat"): "Туркменабад", ("TM", "Daşoguz"): "Дашогуз",
    ("TM", "Mary"): "Мары", ("TM", "Balkanabat"): "Балканабад", ("TM", "Türkmenbaşy"): "Туркменбаши",
    ("AZ", "Baku"): "Баку", ("AZ", "Ganja"): "Гянджа", ("AZ", "Sumqayıt"): "Сумгаит", ("AZ", "Sumgayit"): "Сумгаит",
    ("AZ", "Lankaran"): "Ленкорань", ("AZ", "Mingelchaur"): "Мингечевир", ("AZ", "Nakhchivan"): "Нахичевань",
    ("AZ", "Shirvan"): "Ширван", ("AZ", "Shaki"): "Шеки",
    ("AM", "Yerevan"): "Ереван", ("AM", "Gyumri"): "Гюмри", ("AM", "Vanadzor"): "Ванадзор",
    ("AM", "Vagharshapat"): "Вагаршапат", ("AM", "Hrazdan"): "Раздан", ("AM", "Abovyan"): "Абовян",
    ("GE", "Tbilisi"): "Тбилиси", ("GE", "Batumi"): "Батуми", ("GE", "Kutaisi"): "Кутаиси",
    ("GE", "Rust'avi"): "Рустави", ("GE", "Rustavi"): "Рустави", ("GE", "Sokhumi"): "Сухум",
    ("GE", "Zugdidi"): "Зугдиди",
    ("GE", "Gori"): "Гори", ("GE", "P'ot'i"): "Поти", ("GE", "Ts'khinvali"): "Цхинвал",
    ("MD", "Chisinau"): "Кишинёв", ("MD", "Tiraspol"): "Тирасполь", ("MD", "Bălţi"): "Бельцы",
    ("MD", "Bender"): "Бендеры", ("MD", "Rîbniţa"): "Рыбница", ("MD", "Cahul"): "Кагул",
    ("MD", "Ungheni"): "Унгены", ("MD", "Soroca"): "Сороки", ("MD", "Orhei"): "Оргеев", ("MD", "Comrat"): "Комрат",
    ("LT", "Vilnius"): "Вильнюс", ("LT", "Kaunas"): "Каунас", ("LT", "Klaipėda"): "Клайпеда",
    ("LT", "Šiauliai"): "Шяуляй", ("LT", "Panevėžys"): "Паневежис", ("LT", "Alytus"): "Алитус",
    ("LT", "Marijampolė"): "Мариямполе", ("LT", "Mažeikiai"): "Мажейкяй", ("LT", "Jonava"): "Йонава",
    ("LT", "Utena"): "Утена", ("LT", "Visaginas"): "Висагинас",
    ("LV", "Riga"): "Рига", ("LV", "Daugavpils"): "Даугавпилс", ("LV", "Liepāja"): "Лиепая",
    ("LV", "Jelgava"): "Елгава", ("LV", "Jūrmala"): "Юрмала", ("LV", "Ventspils"): "Вентспилс",
    ("LV", "Rēzekne"): "Резекне", ("LV", "Valmiera"): "Валмиера", ("LV", "Jēkabpils"): "Екабпилс",
    ("LV", "Ogre"): "Огре",
    ("EE", "Tallinn"): "Таллин", ("EE", "Tartu"): "Тарту", ("EE", "Narva"): "Нарва",
    ("EE", "Pärnu"): "Пярну", ("EE", "Kohtla-Järve"): "Кохтла-Ярве", ("EE", "Viljandi"): "Вильянди",
    ("EE", "Rakvere"): "Раквере", ("EE", "Maardu"): "Маарду", ("EE", "Sillamäe"): "Силламяэ",
    ("EE", "Kuressaare"): "Курессааре",
    # Мир: города, у которых английское название не транслитерируется с русского
    ("US", "New York City"): "Нью-Йорк", ("US", "Los Angeles"): "Лос-Анджелес", ("US", "Chicago"): "Чикаго",
    ("US", "Miami"): "Майами", ("US", "San Francisco"): "Сан-Франциско", ("US", "Boston"): "Бостон",
    ("US", "Washington"): "Вашингтон", ("US", "Seattle"): "Сиэтл", ("US", "Houston"): "Хьюстон",
    ("US", "Dallas"): "Даллас", ("US", "Philadelphia"): "Филадельфия", ("US", "Brooklyn"): "Бруклин",
    ("US", "San Diego"): "Сан-Диего", ("US", "Las Vegas"): "Лас-Вегас", ("US", "Denver"): "Денвер",
    ("US", "Atlanta"): "Атланта", ("US", "Phoenix"): "Финикс", ("US", "Detroit"): "Детройт",
    ("GB", "London"): "Лондон", ("GB", "Manchester"): "Манчестер", ("GB", "Edinburgh"): "Эдинбург",
    ("FR", "Paris"): "Париж", ("FR", "Marseille"): "Марсель", ("FR", "Lyon"): "Лион", ("FR", "Nice"): "Ницца",
    ("DE", "Berlin"): "Берлин", ("DE", "Munich"): "Мюнхен", ("DE", "Hamburg"): "Гамбург",
    ("DE", "Frankfurt am Main"): "Франкфурт-на-Майне", ("DE", "Köln"): "Кёльн", ("DE", "Düsseldorf"): "Дюссельдорф",
    ("DE", "Stuttgart"): "Штутгарт", ("DE", "Leipzig"): "Лейпциг", ("DE", "Dresden"): "Дрезден",
    ("DE", "Hannover"): "Ганновер", ("DE", "Nuremberg"): "Нюрнберг", ("DE", "Bremen"): "Бремен",
    ("IL", "Tel Aviv"): "Тель-Авив", ("IL", "Haifa"): "Хайфа", ("IL", "Jerusalem"): "Иерусалим",
    ("IL", "Beersheba"): "Беэр-Шева", ("IL", "Ashdod"): "Ашдод", ("IL", "Netanya"): "Нетания",
    ("IL", "Rishon LeẔiyyon"): "Ришон-ле-Цион", ("IL", "Petaẖ Tiqwa"): "Петах-Тиква", ("IL", "Bat Yam"): "Бат-Ям",
    ("TR", "Istanbul"): "Стамбул", ("TR", "Ankara"): "Анкара", ("TR", "Antalya"): "Анталья", ("TR", "İzmir"): "Измир",
    ("CZ", "Prague"): "Прага", ("CZ", "Brno"): "Брно", ("PL", "Warsaw"): "Варшава", ("PL", "Kraków"): "Краков",
    ("PL", "Gdańsk"): "Гданьск", ("PL", "Wrocław"): "Вроцлав", ("PL", "Łódź"): "Лодзь", ("PL", "Poznań"): "Познань",
    ("AT", "Vienna"): "Вена", ("IT", "Rome"): "Рим", ("IT", "Milan"): "Милан", ("IT", "Naples"): "Неаполь",
    ("IT", "Turin"): "Турин", ("IT", "Florence"): "Флоренция", ("IT", "Venice"): "Венеция", ("IT", "Genoa"): "Генуя",
    ("ES", "Madrid"): "Мадрид", ("ES", "Barcelona"): "Барселона", ("ES", "Valencia"): "Валенсия",
    ("ES", "Seville"): "Севилья", ("PT", "Lisbon"): "Лиссабон", ("PT", "Porto"): "Порту",
    ("NL", "Amsterdam"): "Амстердам", ("NL", "Rotterdam"): "Роттердам", ("NL", "The Hague"): "Гаага",
    ("BE", "Brussels"): "Брюссель", ("BE", "Antwerpen"): "Антверпен", ("CH", "Zürich"): "Цюрих",
    ("CH", "Geneva"): "Женева", ("CH", "Bern"): "Берн", ("SE", "Stockholm"): "Стокгольм",
    ("SE", "Gothenburg"): "Гётеборг", ("FI", "Helsinki"): "Хельсинки", ("NO", "Oslo"): "Осло",
    ("DK", "Copenhagen"): "Копенгаген", ("GR", "Athens"): "Афины", ("GR", "Thessaloníki"): "Салоники",
    ("CY", "Nicosia"): "Никосия", ("CY", "Limassol"): "Лимасол", ("CY", "Larnaca"): "Ларнака",
    ("AE", "Dubai"): "Дубай", ("AE", "Abu Dhabi"): "Абу-Даби", ("QA", "Doha"): "Доха",
    ("CN", "Beijing"): "Пекин", ("CN", "Shanghai"): "Шанхай", ("CN", "Harbin"): "Харбин",
    ("JP", "Tokyo"): "Токио", ("JP", "Osaka"): "Осака", ("KR", "Seoul"): "Сеул", ("KR", "Busan"): "Пусан",
    ("TH", "Bangkok"): "Бангкок", ("VN", "Hanoi"): "Ханой", ("VN", "Ho Chi Minh City"): "Хошимин",
    ("IN", "Delhi"): "Дели", ("IN", "New Delhi"): "Нью-Дели", ("IN", "Mumbai"): "Мумбаи", ("IN", "Kolkata"): "Калькутта",
    ("AU", "Sydney"): "Сидней", ("AU", "Melbourne"): "Мельбурн", ("AU", "Brisbane"): "Брисбен", ("AU", "Perth"): "Перт",
    ("NZ", "Auckland"): "Окленд", ("CA", "Toronto"): "Торонто", ("CA", "Vancouver"): "Ванкувер",
    ("CA", "Montréal"): "Монреаль", ("CA", "Calgary"): "Калгари", ("CA", "Ottawa"): "Оттава",
    ("RO", "Bucharest"): "Бухарест", ("BG", "Sofia"): "София", ("BG", "Varna"): "Варна", ("BG", "Burgas"): "Бургас",
    ("RS", "Belgrade"): "Белград", ("HR", "Zagreb"): "Загреб", ("HU", "Budapest"): "Будапешт",
    ("SK", "Bratislava"): "Братислава", ("SI", "Ljubljana"): "Любляна", ("ME", "Podgorica"): "Подгорица",
    ("MN", "Ulan Bator"): "Улан-Батор", ("EG", "Cairo"): "Каир", ("EG", "Alexandria"): "Александрия",
    ("IR", "Tehran"): "Тегеран", ("IQ", "Baghdad"): "Багдад", ("AF", "Kabul"): "Кабул", ("SY", "Damascus"): "Дамаск",
    ("LB", "Beirut"): "Бейрут", ("MX", "Mexico City"): "Мехико", ("AR", "Buenos Aires"): "Буэнос-Айрес",
    ("BR", "São Paulo"): "Сан-Паулу", ("BR", "Rio de Janeiro"): "Рио-де-Жанейро", ("PE", "Lima"): "Лима",
    ("CO", "Bogotá"): "Богота", ("CL", "Santiago"): "Сантьяго", ("CU", "Havana"): "Гавана",
    ("ZA", "Johannesburg"): "Йоханнесбург", ("ZA", "Cape Town"): "Кейптаун", ("MA", "Casablanca"): "Касабланка",
    ("TN", "Tunis"): "Тунис", ("DZ", "Algiers"): "Алжир", ("KE", "Nairobi"): "Найроби",
}

# Старые названия, которых нет среди альтернативных имён GeoNames, но по
# которым люди ищут место рождения. Только для поиска, не для показа.
EXTRA_ALIASES = {
    ("KG", "Bishkek"): ["Фрунзе", "Пишпек"],
    ("KZ", "Astana"): ["Целиноград", "Акмолинск"],
    ("KZ", "Atyrau"): ["Гурьев"],
    ("KZ", "Aktau"): ["Шевченко"],
    ("KZ", "Taraz"): ["Джамбул", "Аулие-Ата"],
    ("KZ", "Semey"): ["Семипалатинск"],
    ("KZ", "Kokshetau"): ["Кокчетав"],
    ("KZ", "Oral"): ["Уральск"],
    ("KZ", "Kostanay"): ["Кустанай"],
    ("KZ", "Petropavl"): ["Петропавловск"],
    ("KZ", "Zhezqazghan"): ["Джезказган"],
    ("KZ", "Karagandy"): ["Караганда"],
    ("KZ", "Shymkent"): ["Чимкент"],
    ("KZ", "Aktobe"): ["Актюбинск"],
    ("KZ", "Ust-Kamenogorsk"): ["Усть-Каменогорск", "Оскемен"],
    ("KZ", "Turkestan"): ["Туркестан"],
    ("AM", "Gyumri"): ["Ленинакан", "Александрополь", "Кумайри"],
    ("AM", "Vanadzor"): ["Кировакан"],
    ("AZ", "Ganja"): ["Кировабад"],
    ("TJ", "Khujand"): ["Ленинабад"],
    ("TJ", "Bokhtar"): ["Курган-Тюбе"],
    ("TM", "Türkmenabat"): ["Чарджоу"],
    ("TM", "Daşoguz"): ["Ташауз"],
    ("TM", "Balkanabat"): ["Небит-Даг"],
    ("TM", "Türkmenbaşy"): ["Красноводск"],
    ("UZ", "Fergana"): ["Фергана", "Скобелев"],
    ("RU", "Naberezhnyye Chelny"): ["Брежнев"],
    ("RU", "Rybinsk"): ["Андропов", "Щербаков"],
    ("RU", "Izhevsk"): ["Устинов"],
    ("RU", "Sergiyev Posad"): ["Загорск"],
    ("RU", "Orenburg"): ["Чкалов"],
    ("RU", "Vladikavkaz"): ["Орджоникидзе", "Дзауджикау"],
    ("RU", "Perm"): ["Молотов"],
    ("RU", "Tver"): ["Калинин"],
    ("RU", "Samara"): ["Куйбышев"],
    ("RU", "Nizhniy Novgorod"): ["Горький"],
    ("RU", "Yekaterinburg"): ["Свердловск"],
    ("RU", "Saint Petersburg"): ["Ленинград", "Петроград", "Питер"],
    ("RU", "Volgograd"): ["Сталинград", "Царицын"],
    ("RU", "Kaliningrad"): ["Кёнигсберг"],
    ("RU", "Novokuznetsk"): ["Сталинск"],
    ("RU", "Engels"): ["Покровск"],
    ("RU", "Tolyatti"): ["Ставрополь-на-Волге"],
    ("RU", "Lugansk"): ["Ворошиловград"],
    ("UA", "Luhansk"): ["Ворошиловград"],
    ("UA", "Mariupol"): ["Жданов"],
    ("UA", "Dnipro"): ["Днепропетровск", "Екатеринослав"],
    ("UA", "Kamyanske"): ["Днепродзержинск"],
    ("UA", "Kropyvnytskyy"): ["Кировоград", "Елисаветград"],
    ("UA", "Alchevsk"): ["Коммунарск", "Ворошиловск"],
    ("UA", "Horishni Plavni"): ["Комсомольск"],
    ("UA", "Kamianske"): ["Днепродзержинск"],
    ("UA", "Pokrovsk"): ["Красноармейск"],
    ("UA", "Myrnohrad"): ["Димитров"],
    ("UA", "Toretsk"): ["Дзержинск"],
    ("UA", "Bakhmut"): ["Артёмовск"],
    ("UA", "Khrustalnyi"): ["Красный Луч"],
    ("UA", "Kadiyivka"): ["Стаханов"],
    ("UA", "Sorokyne"): ["Краснодон"],
    ("UA", "Dovzhansk"): ["Свердловск"],
    ("MD", "Chisinau"): ["Кишинев"],
    ("EE", "Tallinn"): ["Таллинн", "Ревель"],
    ("LV", "Daugavpils"): ["Двинск"],
    ("LV", "Liepāja"): ["Либава"],
    ("LT", "Klaipėda"): ["Мемель"],
    ("GE", "Sokhumi"): ["Сухуми"],
    ("GE", "Ts'khinvali"): ["Цхинвали"],
}

RU_LETTERS = set("абвгдежзийклмнопрстуфхцчшщъыьэюяё")
TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i",
    "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y",
    "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def is_cyrillic(s: str) -> bool:
    return re.search(r"[Ѐ-ӿ]", s) is not None


def is_russian_alphabet(s: str) -> bool:
    letters = [c for c in s.lower() if c.isalpha()]
    return bool(letters) and all(c in RU_LETTERS for c in letters)


def translit(s: str) -> str:
    return "".join(TRANSLIT.get(c, c) for c in s.lower())


def ascii_fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[’'`ʻʼ]", "", s).lower()


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return 1.0 - levenshtein(a, b) / max(len(a), len(b))


# Шаблоны, которых в русской орфографии не бывает: украинские (Омськ,
# Липецьк, Череповець, Нижньовартовськ), белорусские (Балашыха), кавказские
# и тюркские формы русскими буквами (Магьачкъала, Барнауыл).
FOREIGN_PATTERNS = [
    (r"ьк", -3.0), (r"ць(\b|$)", -3.0), (r"ьо", -2.0), (r"ський", -3.0),
    (r"[шжчщ]ы", -2.0), (r"уы", -2.0), (r"[гкхнчл]ъ", -3.0), (r"[гк]ь", -3.0),
    (r"ъ(\b|$)", -3.0),
]


def russianness(s: str, ussr: bool = True) -> float:
    """Поправка на русскую орфографию против украинских и белорусских форм в русских буквах."""
    low = s.lower()
    score = 0.0
    score += min(low.count("ь"), 2) * 0.5
    score += 0.5 * ("ы" in low)
    if ussr:
        score += 0.5 * ("ё" in low)
    for pattern, penalty in FOREIGN_PATTERNS:
        if re.search(pattern, low):
            score += penalty
    if re.search(r"(сс|лл|нн|тт|мм|рр|пп|кк)", low):
        score += 1.0
    if re.search(r"ив$|ив[\s-]", low):
        score -= 2.0
    if re.search(r"(ому|ем|ом|ою|ею)$", low):
        score -= 1.5
    if " " in low and "-" not in low and len(low.split()) > 2:
        score -= 0.5
    return score


def pick_russian_name(name_en: str, candidates: list[str], ussr: bool = True) -> str | None:
    if not candidates:
        return None
    target = ascii_fold(name_en)
    best, best_score = None, -1e9
    for cand in sorted(set(candidates), key=lambda c: (len(c), c)):
        score = 3.0 * similarity(translit(cand).replace("'", ""), target) + russianness(cand, ussr)
        if score > best_score:
            best, best_score = cand, score
    return best


REVERSE = [
    ("shch", "щ"), ("zh", "ж"), ("kh", "х"), ("ts", "ц"), ("ch", "ч"), ("sh", "ш"),
    ("yu", "ю"), ("ya", "я"), ("ye", "е"), ("yo", "ё"), ("ë", "ё"),
]
REVERSE_SINGLE = {
    "a": "а", "b": "б", "v": "в", "g": "г", "d": "д", "e": "е", "z": "з", "i": "и", "k": "к", "l": "л",
    "m": "м", "n": "н", "o": "о", "p": "п", "r": "р", "s": "с", "t": "т", "u": "у", "f": "ф", "h": "х",
    "c": "к", "w": "в", "x": "кс", "j": "дж", "q": "к", "’": "ь", "'": "ь", "\"": "ъ",
}
VOWELS = set("aeiouy")


def reverse_translit(s: str) -> str:
    """Латиница BGN/PCGN → кириллица для мест без кириллического названия."""
    out = []
    low = s.lower()
    i = 0
    while i < len(low):
        matched = False
        for lat, cyr in REVERSE:
            if low.startswith(lat, i):
                out.append(cyr)
                i += len(lat)
                matched = True
                break
        if matched:
            continue
        c = low[i]
        if c == "y":
            nxt = low[i + 1] if i + 1 < len(low) else ""
            prev = low[i - 1] if i > 0 else ""
            at_end = not nxt.isalpha()
            if low.startswith("yy", i):
                out.append("ый")
                i += 2
                continue
            if prev == "i" and at_end:
                out.append("й")
            elif prev in VOWELS and (at_end or nxt not in VOWELS):
                out.append("й")
            elif nxt in VOWELS and prev == "":
                out.append("й")
            else:
                out.append("ы")
            i += 1
            continue
        out.append(REVERSE_SINGLE.get(c, c))
        i += 1
    text = "".join(out)
    # Заглавные буквы: как в исходнике, по словам.
    words = text.split(" ")
    return " ".join("-".join(p[:1].upper() + p[1:] for p in w.split("-")) for w in words)


def load_cities(path: str):
    """Читает cities500.txt GeoNames: 19 колонок через табуляцию, без заголовка."""
    rows = {}
    skipped = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 19 or cols[6] != "P":
                continue
            if cols[7] in EXCLUDED_FEATURE_CODES:
                skipped += 1
                continue
            rows[cols[0]] = {
                "geonameid": int(cols[0]),
                "name": cols[1],
                "asciiname": cols[2],
                "alternatenames": [a for a in cols[3].split(",") if a] if cols[3] else [],
                "latitude": float(cols[4]),
                "longitude": float(cols[5]),
                "feature": cols[7],
                "countrycode": cols[8],
                "admin1code": cols[10],
                "population": int(cols[14] or 0),
                "timezone": cols[17],
            }
    print(f"прочитано {len(rows)} мест, отброшено районов и исчезнувших: {skipped}")
    return rows


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args or not os.path.isfile(args[0]):
        sys.exit("Укажи путь к cities500.txt (см. шапку файла, как его получить)")
    cities = load_cities(args[0])

    rows = []
    stats = {"overrides": 0, "russian": 0, "cyrillic_other": 0, "reverse": 0, "latin": 0}
    review = []
    for c in cities.values():
        cc = c["countrycode"]
        pop = int(c.get("population") or 0)
        in_ussr = cc in USSR
        if not in_ussr and pop < WORLD_MIN_POPULATION:
            continue
        name_en = c["name"]
        alts = [a.strip() for a in (c.get("alternatenames") or []) if a and a.strip()]
        russian = [a for a in alts if is_russian_alphabet(a)]
        cyr_any = [a for a in alts if is_cyrillic(a)]

        name_ru = OVERRIDES.get((cc, name_en))
        if name_ru:
            stats["overrides"] += 1
        elif russian:
            name_ru = pick_russian_name(name_en, russian, in_ussr)
            stats["russian"] += 1
        elif cyr_any:
            name_ru = pick_russian_name(name_en, cyr_any, in_ussr)
            stats["cyrillic_other"] += 1
        elif cc in REVERSE_TRANSLIT_COUNTRIES:
            name_ru = reverse_translit(name_en)
            stats["reverse"] += 1
        else:
            name_ru = name_en
            stats["latin"] += 1

        aliases = []
        seen = {name_ru.lower()}
        for a in EXTRA_ALIASES.get((cc, name_en), []) + russian + [x for x in cyr_any if x not in russian]:
            key = a.lower()
            if key in seen or len(a) < 3:
                continue
            seen.add(key)
            aliases.append(a)

        a1 = c.get("admin1code") or ""
        admin1 = f"{cc}.{a1}" if a1 and a1 != "00" else ""
        rows.append([
            int(c["geonameid"]), name_ru, name_en, cc, admin1,
            round(float(c["latitude"]), 5), round(float(c["longitude"]), 5),
            c.get("timezone") or "", pop, aliases,
        ])
        if in_ussr:
            review.append((pop, cc, name_en, name_ru, russian[:8]))

    rows.sort(key=lambda r: (-r[8], r[1]))

    used_overrides = {(r[3], r[2]) for r in rows}
    unused = sorted(k for k in OVERRIDES if k not in used_overrides)
    if unused:
        print("переопределения без совпадений (проверь написание):", unused)

    missing_countries = sorted({r[3] for r in rows if r[3] not in COUNTRIES})
    if missing_countries:
        print("НЕТ РУССКОГО НАЗВАНИЯ СТРАНЫ:", missing_countries)
    used_regions = {r[4] for r in rows if r[4]}
    missing_regions = sorted(a for a in used_regions if a.split(".")[0] in ("RU", "UA", "BY", "KZ", "UZ", "KG", "TJ", "TM", "AM", "GE", "LT", "EE") and a not in REGIONS)
    if missing_regions:
        print("НЕТ РУССКОГО НАЗВАНИЯ РЕГИОНА:", missing_regions)

    payload = {
        "source": "GeoNames (CC BY 4.0), выгрузка cities500.txt",
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
        "count": len(rows),
        "countries": {k: v for k, v in sorted(COUNTRIES.items()) if k in {r[3] for r in rows}},
        "regions": {k: v for k, v in sorted(REGIONS.items()) if k in used_regions},
        "places": rows,
    }
    out_dir = os.path.join(root, "src", "lib", "geo", "data")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "places.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(out)
    print(f"written {out}: {len(rows)} мест, {size / 1e6:.2f} МБ")
    print("names:", stats)

    if "--review" in sys.argv:
        review.sort(key=lambda r: -r[0])
        for pop, cc, name_en, name_ru, cands in review[:220]:
            if (cc, name_en) in OVERRIDES:
                continue
            print(f"{cc} {name_en:28} → {name_ru:28} {cands}")


if __name__ == "__main__":
    main()
