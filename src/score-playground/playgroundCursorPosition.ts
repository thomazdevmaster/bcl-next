export type CursorNoteColumn = {
  /** Posição dentro do compasso, em semibreves. */
  rel: number;
  x: number;
};

/**
 * Desliza no tempo do compasso: no ataque está na nota e, enquanto ela soa,
 * caminha até a próxima (ou até a barra). Sem notas, anda linear entre as bordas.
 */
export function continuousCursorX(
  notes: readonly CursorNoteColumn[],
  fraction: number,
  measureWhole: number,
  startX: number,
  endX: number,
): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  const spanX = endX - startX;
  if (measureWhole <= 0 || !Number.isFinite(spanX) || spanX <= 0) {
    return startX;
  }
  const target = clamped * measureWhole;
  const columns = columnsByTime(notes);
  if (columns.length === 0) return startX + spanX * clamped;

  let previous: CursorNoteColumn | null = null;
  let next: CursorNoteColumn | null = null;
  for (const column of columns) {
    if (column.rel <= target + 0.0001) previous = column;
    else {
      next = column;
      break;
    }
  }

  const fromRel = previous ? previous.rel : 0;
  const fromX = previous ? previous.x : startX;
  const toRel = next ? next.rel : measureWhole;
  const toX = next ? next.x : endX;
  const spanRel = toRel - fromRel;
  if (spanRel <= 0.0001) return fromX;
  const progress = Math.min(1, Math.max(0, (target - fromRel) / spanRel));
  return fromX + (toX - fromX) * progress;
}

/** Uma coluna por instante: a nota mais à esquerda do ataque (acorde ou naipe). */
function columnsByTime(notes: readonly CursorNoteColumn[]): CursorNoteColumn[] {
  const byRel = new Map<number, number>();
  for (const note of notes) {
    if (!Number.isFinite(note.rel) || !Number.isFinite(note.x)) continue;
    const key = Math.round(note.rel * 10000) / 10000;
    const current = byRel.get(key);
    if (current == null || note.x < current) byRel.set(key, note.x);
  }
  return [...byRel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rel, x]) => ({ rel, x }));
}
