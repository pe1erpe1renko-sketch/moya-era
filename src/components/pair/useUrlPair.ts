"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildPairQuery, parsePairQuery } from "@/lib/chartUrl";
import type { BirthValue } from "@/components/natal/BirthForm";
import type { Place } from "@/lib/geo/placesIndex";

/**
 * ВРЕМЯ И МЕСТО ДВОИХ В АДРЕСЕ СТРАНИЦЫ ПАРЫ
 *
 * Страница /sovmestimost/13-07-1998/09-04-1992 кэшируется одна на всех:
 * сервер считает её по двум датам и ничего не знает про уточнения. Они
 * живут в параметрах запроса — ?t1=0940&g1=524901&t2=1430 — и применяются
 * уже в браузере, как на страницах карт по дате.
 *
 * Даты заново не спрашиваются никогда: они в адресе.
 */

async function fetchPlace(id: number, signal: AbortSignal): Promise<Place | null> {
  try {
    const res = await fetch(`/api/places?id=${id}`, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { places: Place[] };
    return data.places[0] ?? null;
  } catch {
    return null;
  }
}

export type PairBirth = [BirthValue, BirthValue];

const empty = (date: string): BirthValue => ({ date, time: null, place: null, placeText: "" });

export function useUrlPair(dates: [string, string]) {
  const [people, setPeople] = useState<PairBirth>([empty(dates[0]), empty(dates[1])]);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const readUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const [a, b] = parsePairQuery({
      t1: params.get("t1"),
      g1: params.get("g1"),
      t2: params.get("t2"),
      g2: params.get("g2"),
    });
    abort.current?.abort();

    const next: PairBirth = [
      { ...empty(dates[0]), time: a.time },
      { ...empty(dates[1]), time: b.time },
    ];
    if (!a.placeId && !b.placeId) {
      setLoading(false);
      setPeople(next);
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    void Promise.all([
      a.placeId ? fetchPlace(a.placeId, controller.signal) : Promise.resolve(null),
      b.placeId ? fetchPlace(b.placeId, controller.signal) : Promise.resolve(null),
    ]).then(([first, second]) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      setPeople([
        { ...next[0], place: first, placeText: first?.label ?? "" },
        { ...next[1], place: second, placeText: second?.label ?? "" },
      ]);
    });
  }, [dates]);

  useEffect(() => {
    readUrl();
    window.addEventListener("popstate", readUrl);
    return () => {
      window.removeEventListener("popstate", readUrl);
      abort.current?.abort();
    };
  }, [readUrl]);

  /** Уточнили одного из двоих: пересчитываем на месте и правим адрес. */
  const refine = useCallback(
    (who: 0 | 1, next: BirthValue) => {
      abort.current?.abort();
      setLoading(false);
      const updated: PairBirth = who === 0 ? [next, people[1]] : [people[0], next];
      setPeople(updated);
      const query = buildPairQuery(
        { time: updated[0].time, placeId: updated[0].place?.id ?? null },
        { time: updated[1].time, placeId: updated[1].place?.id ?? null },
      );
      // Якорь взгляда сохраняем: человек остался на той же вкладке.
      window.history.replaceState(null, "", `${window.location.pathname}${query}${window.location.hash}`);
    },
    [people],
  );

  return { people, loading, refine };
}
