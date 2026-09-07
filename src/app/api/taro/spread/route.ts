import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { arcanaName } from "@/lib/matrix";
import { buildSpreadRequest, drawCards, findSpread, SPREADS, type SpreadId } from "@/lib/tarot";
import { spreadPath } from "@/lib/tarot/spreadUrl";
import { LLM_ENABLED, MODEL_CHAT, complete } from "@/server/llm";
import { loadAccess } from "@/server/entitlements";
import { creditBalance, refundCredits, spendCredits } from "@/server/credits";
import {
  createSpread,
  dropSpread,
  newSpreadCode,
  saveSpreadBody,
  spreadOffer,
  spreadOffers,
  spreadsOfUser,
} from "@/server/spreadStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/taro/spread
 * { kind: 'three', question: 'о чём спрашиваю' }
 *
 * Живой расклад — единственное место в таро, где текст пишется на лету:
 * вопрос у каждого свой, кэшировать нечего. Поэтому здесь списываются
 * кредиты — той же механикой, что у наставника (см. `server/credits`).
 *
 * ПОРЯДОК СТРОГИЙ: доступ → карты → списание → генерация → сохранение.
 * Не вышло сгенерировать — кредиты возвращаются, а пустой расклад
 * удаляется: платят за текст, а не за попытку.
 *
 * КАРТЫ ТЯНЕТ СЕРВЕР криптостойким источником. На клиенте это было бы
 * и подделываемо, и предсказуемо, а человек за раздачу заплатил.
 *
 * ПОДПИСКА НЕ НУЖНА: расклад оплачивается кредитами, как сообщение
 * наставнику. Новому аккаунту база начисляет приветственные кредиты
 * (`grant_welcome_credits`), и первого расклада они покрывают — на этом
 * держится мост от гостя к регистрации на первом экране /taro
 * (приёмка, часть 4). Бесплатное в таро — карта дня по постоянному адресу.
 */

const MAX_QUESTION = 500;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { kind?: string; question?: string };
  const kind = findSpread(String(body.kind ?? ""));
  if (!kind) return NextResponse.json({ error: "bad_kind" }, { status: 400 });

  const question = String(body.question ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_QUESTION);
  if (question.length < 3) return NextResponse.json({ error: "empty_question" }, { status: 400 });

  const access = await loadAccess();
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!LLM_ENABLED) return NextResponse.json({ error: "llm_off" }, { status: 503 });

  const offer = await spreadOffer(kind.id as SpreadId);
  if (!offer.active) return NextResponse.json({ error: "unavailable" }, { status: 409 });
  const price = offer.credits;

  const cards = drawCards(kind, (max) => randomInt(0, max));
  const code = newSpreadCode();

  const built = buildSpreadRequest({
    kind: "spread",
    spread: kind.title,
    question,
    cards: cards.map((c) => ({
      arcanum: c.arcanum,
      name: arcanaName(c.arcanum),
      reversed: c.reversed,
      position: c.position.label,
    })),
  });

  /* ── демо без базы: показываем расклад, но ничего не списываем ── */
  if (access.demo) {
    const text = await write(built);
    if (!text) return NextResponse.json({ error: "generation" }, { status: 502 });
    return NextResponse.json({ code: null, path: null, cards, body: text, credits: 0, demo: true });
  }

  const userId = access.userId;

  // Расклад создаётся до генерации: его код — та самая ссылка, по
  // которой потом находится возврат кредитов в журнале.
  const created = await createSpread({
    code,
    userId,
    kind: kind.id as SpreadId,
    title: kind.title,
    question,
    cards,
    body: "",
    credits: price,
  });
  if (!created) return NextResponse.json({ error: "storage" }, { status: 500 });

  const spent = await spendCredits(userId, price, "spread", code);
  if (!spent.ok) {
    await dropSpread(code);
    if (spent.reason === "no_credits") return NextResponse.json({ error: "no_credits", price }, { status: 402 });
    return NextResponse.json({ error: "credits" }, { status: 500 });
  }

  const text = await write(built);
  if (!text) {
    await refundCredits(userId, price, code);
    await dropSpread(code);
    return NextResponse.json({ error: "generation", refunded: price }, { status: 502 });
  }

  await saveSpreadBody(code, text);

  return NextResponse.json(
    { code, path: spreadPath(code), cards, body: text, credits: price, left: spent.left },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Один запрос к модели. Пусто или сбой — считаем неудачей и возвращаем кредиты. */
async function write(built: ReturnType<typeof buildSpreadRequest>): Promise<string | null> {
  try {
    const out = await complete({
      model: MODEL_CHAT,
      system: built.system,
      messages: [{ role: "user", content: built.user }],
      maxTokens: built.maxTokens,
      temperature: built.temperature,
    });
    const text = out.text.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/taro/spread — состояние витрины и история.
 *
 * Цены отдаёт сервер, а не берёт страница из кода: они лежат в базе
 * рядом с тарифами и меняются без деплоя. Отсюда же кабинет берёт список
 * прошлых раскладов — своим ключом клиент вытащил бы только свои строки,
 * но лишний запрос к базе с браузера здесь не нужен.
 */
export async function GET() {
  const offers = await spreadOffers();
  const kinds = SPREADS.filter((s) => offers[s.id].active).map((s) => ({
    id: s.id,
    title: s.title,
    hint: s.hint,
    cards: s.positions.length,
    credits: offers[s.id].credits,
  }));

  const access = await loadAccess();
  if (!access.userId) {
    return NextResponse.json(
      { kinds, enabled: LLM_ENABLED, authorized: false, plan: false, credits: 0, spreads: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // В демо базы нет: показываем витрину, историю оставляем пустой.
  if (access.demo) {
    return NextResponse.json(
      { kinds, enabled: LLM_ENABLED, authorized: true, plan: true, credits: null, demo: true, spreads: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const [credits, spreads] = await Promise.all([creditBalance(access.userId), spreadsOfUser(access.userId)]);

  return NextResponse.json(
    { kinds, enabled: LLM_ENABLED, authorized: true, plan: Boolean(access.plan), credits, spreads },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
