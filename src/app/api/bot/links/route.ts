import { NextResponse } from "next/server";
import { botLink, canLink, newBotCode, occupiesSlot, receivesDigest } from "@/lib/bot";
import { BOT_NAME, HAS_BOT } from "@/lib/env";
import { loadAccess } from "@/server/entitlements";
import { createLink, linksOfOwner, revokeLink } from "@/server/botStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ССЫЛКИ ПРИВЯЗКИ — /api/bot/links
 *
 * Кабинет — единственное место, где человек узнаёт о боте: по сайту это
 * не размазываем. Здесь он берёт ссылку на своего человека и может её
 * отозвать.
 *
 * Люди заводятся тут же, в кабинете: в боте формы с датой, временем и
 * местом нет и не будет, второй такой не нужно.
 */

const off = () => NextResponse.json({ enabled: false, links: [] });

export async function GET() {
  if (!HAS_BOT || !BOT_NAME) return off();
  const access = await loadAccess();
  if (!access.userId || access.demo) return off();

  const links = await linksOfOwner(access.userId);
  const used = links.filter(occupiesSlot).length;

  return NextResponse.json(
    {
      enabled: true,
      limit: canLink(access.plan?.id ?? null, used),
      links: links
        .filter((l) => !l.revoked)
        .map((l) => ({
          id: l.id,
          personId: l.personId,
          url: botLink(BOT_NAME, l.code),
          bound: l.chatId !== null,
          live: receivesDigest(l),
        })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Новая ссылка на человека. */
export async function POST(req: Request) {
  if (!HAS_BOT || !BOT_NAME) return NextResponse.json({ error: "бот выключен" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { personId?: string };
  const personId = String(body.personId ?? "");
  if (!personId) return NextResponse.json({ error: "нет человека" }, { status: 400 });

  const access = await loadAccess();
  if (!access.userId || access.demo) return NextResponse.json({ error: "нужен вход" }, { status: 401 });

  const links = await linksOfOwner(access.userId);
  // Уже есть живая ссылка на этого человека — отдаём её, а не плодим новые.
  const existing = links.find((l) => l.personId === personId && !l.revoked);
  if (existing) return NextResponse.json({ url: botLink(BOT_NAME, existing.code) });

  const check = canLink(access.plan?.id ?? null, links.filter(occupiesSlot).length);
  if (!check.ok) return NextResponse.json({ error: "limit", ...check }, { status: 402 });

  const code = newBotCode();
  const created = await createLink(access.userId, personId, code);
  if (!created) return NextResponse.json({ error: "не удалось создать ссылку" }, { status: 500 });

  return NextResponse.json({ url: botLink(BOT_NAME, code) }, { headers: { "Cache-Control": "private, no-store" } });
}

/** Отзыв: код гаснет навсегда, чат отписывается. */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "нет ссылки" }, { status: 400 });

  const access = await loadAccess();
  if (!access.userId || access.demo) return NextResponse.json({ error: "нужен вход" }, { status: 401 });

  const ok = await revokeLink(id, access.userId);
  return NextResponse.json({ ok });
}
