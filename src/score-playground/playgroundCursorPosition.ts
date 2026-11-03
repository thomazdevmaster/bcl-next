export type CursorNoteColumn = {
  /** Posição dentro do compasso, em semibreves. */
  rel: number;
  x: number;
};

/**
 * O cursor fica na última nota já atacada.
 * Enquanto ela soa, ele não corre pelo restante do compasso até a barra.
 */
export function soundingNoteCursorX(
  notes: readonly CursorNoteColumn[],
  fraction: number,
  measureWhole: number,
): number | null {
  if (measureWhole <= 0 || notes.length === 0) return null;
  const target = Math.min(1, Math.max(0, fraction)) * measureWhole;
  let bestRel = Number.NEGATIVE_INFINITY;
  let bestX: number | null = null;
  for (const note of notes) {
    if (!Number.isFinite(note.rel) || !Number.isFinite(note.x)) continue;
    if (note.rel > target + 0.001) continue;
    if (bestX == null || note.rel > bestRel + 0.0001) {
      bestRel = note.rel;
      bestX = note.x;
    } else if (Math.abs(note.rel - bestRel) <= 0.0001) {
      bestX = Math.min(bestX, note.x);
    }
  }
  return bestX;
}
