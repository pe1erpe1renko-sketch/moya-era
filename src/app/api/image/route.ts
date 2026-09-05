import { NextResponse } from "next/server";
import { buildImageData, findImageTheme } from "@/lib/image";
import { imagePath } from "@/lib/image/code";
import { formatDateLong } from "@/lib/matrix";
import { saveImage } from "@/server/imageStore";
import { currentUser } from "@/server/supabase";

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
 */
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

  const user = await currentUser();

  const code = await saveImage({
    theme: data.theme,
    label: data.label,
    arcana: data.arcanum,
    title: show.title ? data.title : null,
    line: show.line ? data.line : null,
    name: show.name && name ? name : null,
    birthDate: show.date ? date : null,
    userId: user?.id ?? null,
  });

  return NextResponse.json(
    { code, path: imagePath(code), date: show.date ? formatDateLong(date) : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
