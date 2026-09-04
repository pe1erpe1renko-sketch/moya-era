"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildChartQuery, parseChartQuery } from "@/lib/chartUrl";
import type { BirthValue } from "@/components/natal/BirthForm";
import type { Place } from "@/lib/geo/placesIndex";

/**
 * ВРЕМЯ И МЕСТО В АДРЕСЕ СТРАНИЦЫ ПО ДАТЕ
 *
 * Страница /natalnaya-karta/26-07-1990 кэшируется одна на всех: сервер
 * считает её по одной дате и ничего не знает про уточнения. Уточнение
 * живёт в параметрах запроса — ?t=0940&g=524901 — и применяется уже в
 * браузере. Так адрес остаётся общим для поисковика и при этом ссылку с
 * уточнением можно переслать или положить в закладки.
 *
 * Почему не useSearchParams. Этот хук Next помечает страницу как зависящую
 * от запроса, и всё дерево до ближайшего Suspense перестаёт попадать в
 * готовый HTML. Для страницы, которая существует ради поисковика, это
 * недопустимо: краулер увидит пустое место вместо карты. Поэтому читаем
 * адрес сами после гидратации — первый экран остаётся тем же, что и в
 * HTML, а уточнение применяется следом.
 */

const EMPTY: Omit<BirthValue, "date"> = { time: null, place: null, placeText: "" };

async function fetchPlace(id: number, signal: AbortSignal): Promise<Place | null> {
  try {
    const res = await fetch(`/api/places?id=${id}`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { places: Place[] };
    return data.places[0] ?? null;
  } catch {
    return null; // неизвестный id — просто остаёмся на расчёте по дате
  }
}

export function useUrlBirth(date: string) {
  const [birth, setBirth] = useState<BirthValue>({ date, ...EMPTY });
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  /** Считать уточнение из адреса: при первом показе и при «назад». */
  const readUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const query = parseChartQuery({ t: params.get("t"), g: params.get("g") });
    abort.current?.abort();

    if (!query.placeId) {
      setLoading(false);
      setBirth({ date, ...EMPTY, time: query.time });
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    void fetchPlace(query.placeId, controller.signal).then((place) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      setBirth({ date, time: query.time, place, placeText: place?.label ?? "" });
    });
  }, [date]);

  useEffect(() => {
    readUrl();
    window.addEventListener("popstate", readUrl);
    return () => {
      window.removeEventListener("popstate", readUrl);
      abort.current?.abort();
    };
  }, [readUrl]);

  /** Уточнили время и место: пересчитываем на месте и правим адрес. */
  const refine = useCallback((next: BirthValue) => {
    abort.current?.abort();
    setLoading(false);
    setBirth(next);
    const query = buildChartQuery({ time: next.time, placeId: next.place?.id ?? null });
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  }, []);

  return { birth, loading, refine };
}
