import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { CHART_SYSTEMS, REFINABLE_SYSTEMS } from "@/lib/chartUrl";

/**
 * Обновляет сессию Supabase в cookies на каждом запросе, чтобы серверные
 * маршруты видели актуальный токен. Без Supabase — просто пропускает.
 * (В Next 16 этот файл называется proxy.ts, раньше — middleware.ts.)
 *
 * Здесь же закрывается от индексации уточнённый адрес карты
 * (/natalnaya-karta/26-07-1990?t=0940&g=524901). Дат в диапазоне — тридцать
 * тысяч, и это разумное число страниц. Комбинаций «дата + минута + город» —
 * триллионы: отдать их поисковику значит утопить сайт. Поэтому у страницы
 * с параметрами noindex, а canonical ведёт на чистый адрес по дате.
 * Follow оставляем: по ссылкам с такой страницы ходить можно.
 */

const CHART_PREFIXES = [...REFINABLE_SYSTEMS.map((s) => `/${CHART_SYSTEMS[s].slug}/`), "/sovmestimost/"];

/**
 * Параметры уточнения: у карты одного человека t и g, у пары t1/g1 и
 * t2/g2, у нумерологии n — имя для числа судьбы.
 */
const REFINE_PARAMS = ["t", "g", "t1", "g1", "t2", "g2", "n"];

/** Уточнённый адрес карты — тот, у которого есть время или место. */
function isRefinedChartUrl(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;
  if (!CHART_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return REFINE_PARAMS.some((p) => searchParams.has(p));
}

function withRobots(response: NextResponse, request: NextRequest): NextResponse {
  if (isRefinedChartUrl(request)) response.headers.set("X-Robots-Tag", "noindex, follow");
  return response;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return withRobots(NextResponse.next(), request);

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return withRobots(response, request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|fonts|images|arcana|.*\\.(?:png|jpg|svg|woff2)$).*)"],
};
