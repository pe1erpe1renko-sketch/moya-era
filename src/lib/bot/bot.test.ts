/**
 * Телеграм-бот: привязка, лимиты, направления, расписание и сборка сводки.
 *
 * Смысл проверок. Вживую бота без токена не запустить, поэтому всё, что
 * можно решить арифметикой и правилами, проверяется здесь. Три вещи
 * ломаются тише всего и стоят дороже всего:
 *  - пересланная ссылка привязки уводит чужую рассылку;
 *  - сводка расходится с тем, что человек видит в кабинете;
 *  - ключи текстов перестают совпадать с сайтом, и расход на нейросеть
 *    из фиксированного становится пропорциональным числу подписчиков.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateMatrix, dailyTextKey, arcanaName } from "../matrix";
import { dayCardArcanum, moscowDay } from "../tarot";
import { dayArcana } from "../matrix";
import { personalDay } from "../numerology";
import {
  batchSize,
  botLimit,
  botLink,
  BOT_CODE_LENGTH,
  BOT_TOPICS,
  buildDigestSource,
  canLink,
  claim,
  DEFAULT_BOT_TZ,
  DIGEST_HOUR,
  digestKeys,
  digestLines,
  digestMessage,
  isBotCode,
  isDue,
  localParts,
  minutesToSend,
  newBotCode,
  normalizeTopics,
  occupiesSlot,
  receivesDigest,
  SEND_GAP_MS,
  toggleTopic,
  BUTTONS,
  digestButtons,
  INVITE_EVERY,
  REPLIES,
  showsInvite,
  ZONES,
  zoneLabel,
  isKnownZone,
  type BotLink,
} from "./index";

const link = (over: Partial<BotLink> = {}): BotLink => ({
  code: "abcdefghjkmn",
  chatId: null,
  revoked: false,
  active: true,
  blocked: false,
  ...over,
});

describe("привязка чата", () => {
  it("код нужной длины и без похожих знаков", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = newBotCode();
      assert.equal(c.length, BOT_CODE_LENGTH);
      assert.ok(isBotCode(c), c);
      for (const ch of c) seen.add(ch);
    }
    for (const bad of ["0", "o", "1", "l", "i"]) assert.ok(!seen.has(bad), `в коде встретился «${bad}»`);
  });

  it("коды не повторяются", () => {
    assert.equal(new Set(Array.from({ length: 5000 }, () => newBotCode())).size, 5000);
  });

  it("ссылка собирается из имени бота", () => {
    assert.equal(botLink("moyaera_bot", "abcdefghjkmn"), "https://t.me/moyaera_bot?start=abcdefghjkmn");
  });

  it("первый нажавший занимает ссылку", () => {
    assert.deepEqual(claim(link(), 111), { ok: true, kind: "claimed" });
  });

  it("второму отказ — иначе пересланная ссылка уведёт чужую рассылку", () => {
    const taken = link({ chatId: 111 });
    assert.deepEqual(claim(taken, 222), { ok: false, reason: "taken" });
    assert.deepEqual(claim(taken, 333), { ok: false, reason: "taken" });
  });

  it("тот же человек может нажать «Старт» ещё раз", () => {
    assert.deepEqual(claim(link({ chatId: 111 }), 111), { ok: true, kind: "already_yours" });
  });

  it("отозванный код не оживает ни для кого", () => {
    assert.deepEqual(claim(link({ revoked: true }), 111), { ok: false, reason: "revoked" });
    // Даже для того, кто уже был к нему привязан.
    assert.deepEqual(claim(link({ revoked: true, chatId: 111 }), 111), { ok: false, reason: "revoked" });
  });

  it("незнакомый код — отказ, а не молчание", () => {
    assert.deepEqual(claim(null, 111), { ok: false, reason: "unknown" });
  });

  it("сводка идёт только живой привязке", () => {
    assert.equal(receivesDigest(link({ chatId: 111 })), true);
    assert.equal(receivesDigest(link({ chatId: null })), false, "ссылку не открывали");
    assert.equal(receivesDigest(link({ chatId: 111, active: false })), false, "отписался");
    assert.equal(receivesDigest(link({ chatId: 111, blocked: true })), false, "заблокировал бота");
    assert.equal(receivesDigest(link({ chatId: 111, revoked: true })), false, "владелец отозвал");
  });

  it("место в тарифе освобождает только отзыв", () => {
    assert.equal(occupiesSlot(link({ chatId: 111 })), true);
    assert.equal(occupiesSlot(link({ chatId: 111, active: false })), true, "отписка не отбирает место у владельца");
    assert.equal(occupiesSlot(link({ chatId: 111, blocked: true })), true);
    assert.equal(occupiesSlot(link({ revoked: true })), false);
  });
});

describe("лимиты по тарифу", () => {
  it("Базовый 1, Семейный 5, Практик 15", () => {
    assert.equal(botLimit("basic"), 1);
    assert.equal(botLimit("family"), 5);
    assert.equal(botLimit("pro"), 15);
  });

  it("без подписки бот не подключается", () => {
    for (const none of [null, undefined, "", "нет такого тарифа"]) {
      assert.equal(botLimit(none), 0);
      assert.deepEqual(canLink(none, 0), { ok: false, limit: 0, reason: "no_plan" });
    }
  });

  it("подключить можно ровно до предела", () => {
    assert.deepEqual(canLink("basic", 0), { ok: true, left: 1 });
    assert.deepEqual(canLink("basic", 1), { ok: false, limit: 1, reason: "full" });
    assert.deepEqual(canLink("family", 4), { ok: true, left: 1 });
    assert.deepEqual(canLink("family", 5), { ok: false, limit: 5, reason: "full" });
    assert.deepEqual(canLink("pro", 14), { ok: true, left: 1 });
    assert.deepEqual(canLink("pro", 15), { ok: false, limit: 15, reason: "full" });
  });

  it("у Практика предел только на подключённых к боту", () => {
    // На сайте профилей сколько угодно — это проверяется тем, что лимит
    // бота живёт отдельным числом и нигде не смешан с числом профилей.
    assert.equal(botLimit("pro"), 15);
    assert.notEqual(botLimit("pro"), Infinity);
  });
});

describe("направления сводки", () => {
  it("их три, и астрологии среди них нет", () => {
    assert.equal(BOT_TOPICS.length, 3);
    assert.deepEqual(BOT_TOPICS.map((t) => t.id), ["matrix", "tarot", "numerology"]);
    assert.ok(!BOT_TOPICS.some((t) => /астрол|натал/i.test(t.label + t.hint)));
  });

  it("включаются и выключаются по одному", () => {
    let t: readonly string[] = ["matrix", "tarot", "numerology"];
    t = toggleTopic(t, "tarot");
    assert.deepEqual(t, ["matrix", "numerology"]);
    t = toggleTopic(t, "tarot");
    assert.deepEqual(t, ["matrix", "tarot", "numerology"], "порядок не должен зависеть от порядка нажатий");
  });

  it("можно выключить всё", () => {
    let t: readonly string[] = ["matrix", "tarot", "numerology"];
    for (const x of ["matrix", "tarot", "numerology"] as const) t = toggleTopic(t, x);
    assert.deepEqual(t, []);
  });

  it("мусор из базы отбрасывается", () => {
    assert.deepEqual(normalizeTopics(["matrix", "астрология", "", "tarot"]), ["matrix", "tarot"]);
    assert.deepEqual(normalizeTopics(null), []);
    assert.deepEqual(normalizeTopics(["tarot", "tarot"]), ["tarot"], "без повторов");
  });
});

describe("когда слать", () => {
  const msk = "Europe/Moscow";

  it("до восьми утра по местным часам не слать", () => {
    // 04:00 UTC — это 07:00 в Москве.
    assert.equal(isDue({ tz: msk, lastSentDay: null }, new Date("2026-09-06T04:00:00Z")), false);
    assert.equal(isDue({ tz: msk, lastSentDay: null }, new Date("2026-09-06T05:00:00Z")), true);
  });

  it("дважды в день не слать", () => {
    const now = new Date("2026-09-06T09:00:00Z");
    assert.equal(isDue({ tz: msk, lastSentDay: "2026-09-06" }, now), false);
    assert.equal(isDue({ tz: msk, lastSentDay: "2026-09-05" }, now), true);
  });

  it("пропущенный запуск наверстывается, а не теряется", () => {
    // Даже если задача не отработала утром, к вечеру сводка всё равно уйдёт.
    assert.equal(isDue({ tz: msk, lastSentDay: "2026-09-05" }, new Date("2026-09-06T18:00:00Z")), true);
  });

  it("считается по поясу человека, а не сервера", () => {
    const moment = new Date("2026-09-06T00:30:00Z"); // 03:30 в Москве, 10:30 во Владивостоке
    assert.equal(isDue({ tz: msk, lastSentDay: null }, moment), false);
    assert.equal(isDue({ tz: "Asia/Vladivostok", lastSentDay: null }, moment), true);
  });

  it("пояса со сдвигом на полчаса и сорок пять минут не теряются", () => {
    // Индия +5:30, Непал +5:45: у оконного правила они выпали бы.
    for (const tz of ["Asia/Kolkata", "Asia/Kathmandu"]) {
      assert.equal(isDue({ tz, lastSentDay: null }, new Date("2026-09-06T03:00:00Z")), true, tz);
      assert.equal(isDue({ tz, lastSentDay: null }, new Date("2026-09-05T23:00:00Z")), false, tz);
    }
  });

  it("негодный пояс не ломает рассылку, а откатывается к московскому", () => {
    const moment = new Date("2026-09-06T05:00:00Z");
    assert.equal(isDue({ tz: "Марс/Олимп", lastSentDay: null }, moment), isDue({ tz: DEFAULT_BOT_TZ, lastSentDay: null }, moment));
  });

  it("местная дата и час считаются верно", () => {
    assert.deepEqual(localParts(new Date("2026-09-06T20:59:00Z"), msk), { date: "2026-09-06", hour: 23 });
    assert.deepEqual(localParts(new Date("2026-09-06T21:01:00Z"), msk), { date: "2026-09-07", hour: 0 });
  });

  it("час рассылки — восемь утра", () => {
    assert.equal(DIGEST_HOUR, 8);
  });
});

describe("скорость рассылки", () => {
  it("не быстрее, чем разрешает телеграм", () => {
    // Предел примерно тридцать сообщений в секунду; идём с запасом.
    assert.ok(1000 / SEND_GAP_MS <= 30, `${1000 / SEND_GAP_MS} сообщений в секунду — слишком быстро`);
  });

  it("за минуту успевает больше тысячи", () => {
    assert.ok(batchSize(60_000) > 1000, `${batchSize(60_000)}`);
  });

  it("видно, когда рассылка перестанет укладываться в утро", () => {
    // Час на рассылку — это примерно девяносто тысяч сводок.
    assert.ok(minutesToSend(1000) <= 1, "тысяча сводок должна уходить за минуту");
    assert.ok(minutesToSend(200_000) > 60, "на двухстах тысячах пора дробить рассылку");
  });
});

describe("сборка сводки", () => {
  const NOW = new Date("2026-09-06T09:00:00Z");
  const BIRTH = "1998-07-13";
  const all = ["matrix", "tarot", "numerology"] as const;

  it("числа берутся из тех же расчётов, что и сайт", () => {
    const src = buildDigestSource(BIRTH, "Пётр", NOW)!;
    const day = moscowDay(NOW);
    assert.equal(src.day, day);

    const m = calculateMatrix(BIRTH, new Date(`${day}T12:00:00Z`));
    assert.equal(src.matrix!.dayArcana, m.today.dayArcana, "аркан дня разошёлся с матрицей");
    assert.equal(src.matrix!.periodArcana, m.today.arcana);
    assert.equal(src.tarot, dayCardArcanum(BIRTH, day), "карта дня разошлась с /taro/<дата>");
    assert.equal(src.numerology, personalDay(13, 7, day));
  });

  it("ключи текстов — те же, что на сайте", () => {
    const src = buildDigestSource(BIRTH, null, NOW)!;
    const keys = digestKeys(src, all);
    assert.equal(keys.length, 3);
    assert.ok(keys.includes(dailyTextKey(src.matrix!.dayArcana, src.matrix!.periodArcana, src.day)));
    assert.ok(keys.includes(`taro_day_${src.tarot}`));
    assert.ok(keys.includes(`num_brief_dayn_${src.numerology}`));
  });

  it("расход на нейросеть не зависит от числа подписчиков", () => {
    // Аркан дня выводится из аркана периода, поэтому на сутки приходится
    // не больше двадцати двух разных ключей на весь сервис.
    const day = moscowDay(NOW);
    const keys = new Set<string>();
    for (let y = 1950; y <= 2005; y += 1) {
      for (const d of ["01-15", "07-13", "11-30"]) {
        const src = buildDigestSource(`${y}-${d}`, null, NOW);
        if (src?.matrix) keys.add(dailyTextKey(src.matrix.dayArcana, src.matrix.periodArcana, day));
      }
    }
    assert.ok(keys.size <= 22, `на сутки вышло ${keys.size} ключей аркана дня вместо двадцати двух`);
  });

  it("выключенные направления не попадают ни в ключи, ни в строки", () => {
    const src = buildDigestSource(BIRTH, null, NOW)!;
    assert.deepEqual(digestKeys(src, ["tarot"]), [`taro_day_${src.tarot}`]);
    const lines = digestLines(src, ["tarot"], {});
    assert.equal(lines.length, 1);
    assert.equal(lines[0].topic, "tarot");
  });

  it("пустая сводка не отправляется", () => {
    const src = buildDigestSource(BIRTH, "Пётр", NOW)!;
    assert.equal(digestMessage(src, [], {}), null);
  });

  it("имя подставляется при отправке, а без имени пустого места не остаётся", () => {
    const src = buildDigestSource(BIRTH, "Пётр", NOW)!;
    const withName = digestMessage(src, all, {})!;
    assert.ok(withName.startsWith("Пётр, доброе утро."), withName.slice(0, 40));

    const noName = digestMessage({ ...src, name: null }, all, {})!;
    assert.ok(noName.startsWith("Доброе утро."), noName.slice(0, 40));
    assert.ok(!/,\s*доброе/.test(noName), "осталась запятая от имени");
    assert.ok(!noName.includes("undefined") && !noName.includes("null"));
  });

  it("текст берётся из кэша, а без него остаётся только заголовок", () => {
    const src = buildDigestSource(BIRTH, null, NOW)!;
    const key = dailyTextKey(src.matrix!.dayArcana, src.matrix!.periodArcana, src.day);
    const withText = digestMessage(src, ["matrix"], { [key]: "Готовый текст из базы" })!;
    assert.ok(withText.includes("Готовый текст из базы"));

    const withoutText = digestMessage(src, ["matrix"], {})!;
    assert.ok(withoutText.includes(`Аркан дня — ${src.matrix!.dayArcana}, ${arcanaName(src.matrix!.dayArcana)}`));
    assert.ok(!withoutText.includes("Готовый текст"));
  });

  it("в сводке нет ни обещаний событий, ни срочности", () => {
    const src = buildDigestSource(BIRTH, "Пётр", NOW)!;
    const body = digestMessage(src, all, {})!;
    for (const bad of ["осталось", "успей", "только сегодня", "скидка", "таймер", "спешите"]) {
      assert.ok(!body.toLowerCase().includes(bad), `в сводке встретилось «${bad}»`);
    }
    assert.ok(body.includes("вы") || !/\bты\b/i.test(body), "обращение должно быть на «вы»");
  });

  it("негодная дата рождения не даёт сводки", () => {
    for (const bad of ["", "13-07-1998", "не дата"]) assert.equal(buildDigestSource(bad, null, NOW), null, bad);
  });
});

describe("что бот говорит", () => {
  const all = Object.values(REPLIES).map((v) => (typeof v === "function" ? v("Пётр") : v));

  it("ни срочности, ни обещаний событий", () => {
    // Запрещено не слово «осталось» само по себе — оно обычный глагол
    // («всё, что приходило раньше, осталось у вас»), — а фальшивый
    // дефицит: «осталось три места», таймеры, скидки, обещания событий.
    const forbidden: Array<[RegExp, string]> = [
      [/осталось\s+\d|осталось\s+мест|мест\s+осталось/i, "осталось N мест"],
      [/успей|поспеш|спешите|не упусти/i, "подгоняем"],
      [/только сегодня|последний день|до конца дня/i, "срочность"],
      [/скидк|зачёркн|акци[яи]\b/i, "торговля"],
      [/таймер|обратный отсчёт/i, "таймер"],
      [/вас ждёт|вам предстоит|обязательно случится|гарантируем/i, "обещание событий"],
    ];
    for (const text of all) {
      for (const [re, what] of forbidden) {
        assert.ok(!re.test(text), `в реплике «${what}»: ${text.slice(0, 70)}`);
      }
    }
  });

  it("обращение на «вы», без панибратства", () => {
    for (const text of all) {
      assert.ok(!/\bты\b|\bтебе\b|\bтвой\b|привет!|дружище/i.test(text), text.slice(0, 60));
    }
  });

  it("отказ второму объясняет причину, а не просто отказывает", () => {
    assert.ok(REPLIES.taken.includes("одна ссылка"), REPLIES.taken);
    assert.ok(REPLIES.taken.length > 80, "объяснение должно быть человеческим");
  });

  it("при отписке сказано, что архив остаётся", () => {
    assert.ok(/остал|никуда не денется/i.test(REPLIES.unsubscribed), REPLIES.unsubscribed);
  });

  it("отписка есть кнопкой в самом боте", () => {
    assert.equal(BUTTONS.unsubscribe, "Отписаться");
    assert.equal(BUTTONS.subscribe, "Включить сводку");
  });

  it("под сводкой обещаны три кнопки", () => {
    assert.equal(BUTTONS.reading, "Открыть разбор");
    assert.equal(BUTTONS.mentor, "Спросить наставника");
    assert.equal(BUTTONS.image, "Сделать образ дня");
  });

  it("приглашение на сайт — не чаще раза в десять сообщений", () => {
    assert.equal(INVITE_EVERY, 10);
    const shown = Array.from({ length: 100 }, (_, i) => showsInvite(i)).filter(Boolean).length;
    assert.equal(shown, 9, `за сто сводок приглашение показалось ${shown} раз`);
    assert.equal(showsInvite(0), false, "в первой сводке звать некуда — человек только что подключился");
    assert.equal(showsInvite(10), true);
    assert.equal(showsInvite(11), false);
  });

  it("все пояса в кнопках настоящие", () => {
    assert.ok(ZONES.length >= 10);
    for (const z of ZONES) {
      assert.ok(isKnownZone(z.tz), `${z.tz} не знает даже браузер`);
      assert.ok(z.label.length > 0);
      assert.equal(zoneLabel(z.tz), z.label);
    }
    assert.equal(new Set(ZONES.map((z) => z.tz)).size, ZONES.length, "пояса повторяются");
  });

  it("незнакомый пояс подписывается сам собой, а не пустотой", () => {
    assert.equal(zoneLabel("Asia/Nowhere"), "Asia/Nowhere");
  });
});

describe("кнопки под сводкой", () => {
  const SITE = "https://moya-era.vercel.app";

  it("три кнопки: разбор, наставник, образ", () => {
    const rows = digestButtons(SITE, "1998-07-13", false);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.flat().map((b) => b.text), [BUTTONS.reading, BUTTONS.mentor, BUTTONS.image]);
  });

  it("адреса ведут на постоянные страницы этой даты", () => {
    const rows = digestButtons(SITE, "1998-07-13", false).flat();
    assert.equal(rows[0].url, `${SITE}/matrica/13-07-1998`);
    assert.equal(rows[2].url, `${SITE}/taro/13-07-1998`);
    for (const b of rows) assert.ok(b.url.startsWith(SITE), b.url);
  });

  it("адрес сайта подставляется, а не вписан в кнопки", () => {
    const rows = digestButtons("https://moyaera.ru", "1998-07-13", false).flat();
    for (const b of rows) assert.ok(b.url.startsWith("https://moyaera.ru"), b.url);
  });

  it("приглашение на сайт появляется только когда положено", () => {
    assert.equal(digestButtons(SITE, "1998-07-13", false).length, 3);
    const withInvite = digestButtons(SITE, "1998-07-13", true);
    assert.equal(withInvite.length, 4);
    assert.equal(withInvite[3][0].text, BUTTONS.fullReading);
  });

  it("картинки в сообщении нет — только кнопка", () => {
    // Кнопки — это только ссылки; вложений здесь не бывает по устройству.
    for (const b of digestButtons(SITE, "1998-07-13", true).flat()) {
      assert.ok(typeof b.url === "string" && b.url.length > 0, b.text);
    }
  });
});

describe("потолок генерации на сутки", () => {
  const day = "2026-09-06";

  /** Тот же список, что прогревает задача подготовки, но без сервера. */
  const keysForDay = (d: string) => {
    const keys: string[] = [];
    for (let period = 1; period <= 22; period++) keys.push(dailyTextKey(dayArcana(d, period), period, d));
    for (let n = 1; n <= 22; n++) keys.push(`taro_day_${n}`);
    for (let n = 1; n <= 9; n++) keys.push(`num_brief_dayn_${n}`);
    return keys;
  };

  it("на сутки ровно 53 ключа, и из них новых — только 22", () => {
    const keys = new Set(keysForDay(day));
    assert.equal(keys.size, 53, `вышло ${keys.size} ключей`);
    // Тарошные и числовые пишутся один раз навсегда: они одни и те же в
    // любой день, а значит после первого дня уже лежат в базе.
    const another = new Set(keysForDay("2027-03-01"));
    const shared = [...keys].filter((k) => another.has(k));
    assert.equal(shared.length, 31, "переиспользуются 22 карты таро и 9 чисел дня");
    assert.equal(keys.size - shared.length, 22, "каждый день добавляется ровно 22 аркана дня");
  });

  it("ключ, который прогревают, — тот же, по которому пойдёт рассылка", () => {
    const prepared = new Set(keysForDay(day));
    for (const birth of ["1998-07-13", "1960-01-05", "2004-12-31", "1975-06-30"]) {
      const src = buildDigestSource(birth, null, new Date(`${day}T09:00:00Z`))!;
      for (const key of digestKeys(src, ["matrix", "tarot", "numerology"])) {
        assert.ok(prepared.has(key), `ключ ${key} не готовится заранее`);
      }
    }
  });
});
