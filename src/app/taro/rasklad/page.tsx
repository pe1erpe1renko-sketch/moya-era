import { permanentRedirect } from "next/navigation";
import { askPath } from "@/lib/tarot/ask";

/**
 * /taro/rasklad — прежний адрес мастера раскладов.
 *
 * С приёмки (часть 4) расклад — первый экран /taro, отдельной страницы
 * нет. Адрес остаётся как прямой вход с уже выбранным видом:
 * /taro/rasklad?vid=love ведёт на /taro?vid=love. Переезд постоянный,
 * чтобы поисковик склеил адреса, а старые ссылки не ломались.
 *
 * Вопрос из старого адреса дальше не едет: он личный текст, и класть
 * его в заголовок Location, который оседает в журналах, нельзя.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  permanentRedirect(askPath({ vid: one(sp.vid) }));
}
