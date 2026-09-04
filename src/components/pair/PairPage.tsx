"use client";

import { useUrlPair } from "./useUrlPair";
import { PairView, type MatrixReadingProps, type PairInitialTexts } from "./PairView";

/**
 * Обвязка страницы пары: даты берутся из адреса, время и место — из
 * параметров запроса. Сама страница кэшируется и ничего про уточнения не
 * знает, поэтому они применяются здесь, уже в браузере.
 */
export function PairPage({
  isoDates,
  initialTexts,
  matrixReading,
}: {
  isoDates: [string, string];
  initialTexts: PairInitialTexts;
  matrixReading: MatrixReadingProps;
}) {
  const { people, loading, refine } = useUrlPair(isoDates);
  return (
    <PairView
      isoDates={isoDates}
      initialTexts={initialTexts}
      matrixReading={matrixReading}
      people={people}
      loading={loading}
      onRefine={refine}
    />
  );
}
