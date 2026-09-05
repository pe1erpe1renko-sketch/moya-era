import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildImageData, findImageTheme } from "@/lib/image";
import { imagePath } from "@/lib/image/code";
import { formatDateLong } from "@/lib/matrix";
import { saveImage } from "@/server/imageStore";
import { loadAccess } from "@/server/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/image
 * { date: '1998-07-13', theme: 'core', name: 'Пётр', show: { name, title, line, date } }
 *
 * Создаёт запись карточки и возвращает её постоянный адрес.
 *
 * Число считается ЗДЕСЬ, а не берётся из запроса: иначе на публичной
 * странице можно было бы выложить любой аркан под любой датой.
 *
 * Сохраняется только то, что человек разрешил показать. Снял галочку —
 * поле не сохраняется вовсе, а не прячется при выводе: так на странице
 * физически нечего показать лишнего, даже по ошибке.
 *
 * ДОСТУП. Первая карточка бесплатно всем и без регистрации — иначе канал
 * привлечения не работает: человек ещё ничего нам не должен, а карточку
 * уже выкладывает. Дальше по подписке.
 *
 * КРЕДИТЫ НЕ ТРАТЯТСЯ. Карточка собирается из готовых картинок, расхода
 * на нейросеть здесь нет, и списывать за неё нечего.
 *
 * Отметка о бесплатной карточке лежит в cookie, потому что у
 * незарегистрированного человека больше ничего и нет. Подделать её
 * несложно — и пусть: это канал привлечения, а не замок. Настоящий
 * замок стоит на разборах, там он и проверяется по базе.
 */

/** Первая карточка бесплатно; отметка живёт год. */
const FREE_COOKIE = "era_image_free";
const FREE_MAX_AGE = 60 * 60 * 24 * 365;
export async function POST(req: Request) {
  let body: {
    date?: string;
    theme?: string;
    name?: string;
    show?: { name?: boolean; title?: boolean; line?: boolean; date?: boolean };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const date = String(body.date ?? "");
  const theme = findImageTheme(String(body.theme ?? ""));
  if (!theme) return NextResponse.json({ error: "bad theme" }, { status: 400 });

  const data = buildImageData(theme.id, date);
  if (!data) return NextResponse.json({ error: "bad date" }, { status: 400 });

  const show = body.show ?? {};
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";

  const access = await loadAccess();
  const jar = await cookies();
  const usedFree = jar.get(FREE_COOKIE)?.value === "1";
  // Подписка открывает карточки без счёта; без неё — одна и навсегда.
  const subscribed = access.demo || Boolean(access.plan);

  if (!subscribed && usedFree) {
    return NextResponse.json(
      {
        error: "locked",
        reason: access.userId ? "no_subscription" : "not_logged_in",
        message: "Первая карточка бесплатна, следующие открывает подписка",
      },
      { status: 402, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const code = await saveImage({
    theme: data.theme,
    label: data.label,
    arcana: data.arcanum,
    title: show.title ? data.title : null,
    line: show.line ? data.line : null,
    name: show.name && name ? name : null,
    birthDate: show.date ? date : null,
    userId: access.demo ? null : access.userId,
  });

  const res = NextResponse.json(
    { code, path: imagePath(code), date: show.date ? formatDateLong(date) : null, free: !subscribed },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  if (!subscribed) {
    res.cookies.set(FREE_COOKIE, "1", { maxAge: FREE_MAX_AGE, sameSite: "lax", path: "/" });
  }
  return res;
}
