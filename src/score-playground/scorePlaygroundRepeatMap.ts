import type { MeasureTimemapEntry } from '@/study/studyTimemap';

/**
 * Correspondência compasso desdobrado (índice do Player, 0…n-1) -> compasso escrito
 * (índice na partitura com voltas, 0…m-1). `null` quando o backend não enviou a marca
 * (timemap antigo/cacheado antes do bcl-api gerar `writtenMeasure`).
 */
export type UnrolledToWrittenMap = (number | null)[];

/** Lê `writtenMeasure` de cada entrada do timemap, na mesma ordem usada pelo Player. */
export function buildUnrolledToWrittenMap(
  timemap: MeasureTimemapEntry[],
): UnrolledToWrittenMap {
  return timemap.map((entry) =>
    typeof entry.writtenMeasure === 'number' ? entry.writtenMeasure : null,
  );
}

/**
 * Só vale a pena mostrar o alternador quando a correspondência é conhecida para todo
 * compasso desdobrado e a partitura realmente tem repetição (compasso escrito repete,
 * ou seja, menos compassos escritos do que desdobrados).
 */
export function hasRealRepeats(map: UnrolledToWrittenMap): boolean {
  if (map.length === 0) return false;
  const known = new Set<number>();
  for (const value of map) {
    if (value == null) return false;
    known.add(value);
  }
  return known.size < map.length;
}
