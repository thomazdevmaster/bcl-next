import {
  type RhythmFigure,
  type RhythmLevel,
  randomBar,
} from "@/domains/games/ritmos/rhythmFigures";

export const RHYTHM_HOLD_STORAGE_KEY = "bcl.game.ritmos-segure-o-tempo";
export const HOLD_NOTE_POINTS = 10;
export const HOLD_ROUND_POINTS: Record<RhythmLevel, number> = {
  facil: 100,
  medio: 200,
  dificil: 500,
};
/** Respiro entre notas seguidas: tempo de soltar e apertar de novo. */
export const HOLD_NOTE_GAP_BEATS = 0.5;

export interface HoldEvent {
  figure: RhythmFigure;
  start: number;
  end: number;
  /** Depois do fim da nota, soltar neste intervalo ainda não conta atraso. */
  releaseGrace: number;
}

export interface HoldInterval {
  start: number;
  end: number | null;
}

/** Vários compassos, até a rodada fechar nos pontos do nível. O fácil entra só com notas. */
export function buildHoldRound(level: RhythmLevel): HoldEvent[] {
  const target = HOLD_ROUND_POINTS[level] / HOLD_NOTE_POINTS;
  const notesOnly = level === "facil";
  const maxEvents = level === "facil" ? 3 : level === "medio" ? 5 : 6;
  const figures: RhythmFigure[] = [];
  while (figures.length < target) {
    const bar = randomBar(level, { notesOnly, maxEvents });
    if (bar.length === 0) break;
    const room = target - figures.length;
    figures.push(...bar.slice(0, room));
  }
  const events: HoldEvent[] = [];
  let cursor = 0;
  for (let index = 0; index < figures.length; index += 1) {
    const figure = figures[index]!;
    const next = figures[index + 1];
    const start = cursor;
    cursor += figure.beats;
    const releaseGrace =
      !figure.rest && next && !next.rest ? HOLD_NOTE_GAP_BEATS : 0;
    events.push({ figure, start, end: cursor, releaseGrace });
    cursor += releaseGrace;
  }
  return events;
}

/**
 * Nota vale 10. Soltar antes desconta na proporção do tempo que faltou.
 * Segurar além da nota desconta o dobro dessa proporção.
 */
export function scoreHoldNote(
  durationBeats: number,
  coveredBeats: number,
  extraBeats: number,
): number {
  if (durationBeats <= 0) return 0;
  const covered = Math.min(Math.max(0, coveredBeats), durationBeats);
  const missing = durationBeats - covered;
  const extra = Math.max(0, extraBeats);
  const penalty =
    (HOLD_NOTE_POINTS * missing) / durationBeats +
    (2 * HOLD_NOTE_POINTS * extra) / durationBeats;
  return Math.max(0, Math.round(HOLD_NOTE_POINTS - penalty));
}

/** Pausa vale 10 se o botão ficar solto. O tempo preso desconta na mesma proporção. */
export function scoreHoldRest(
  durationBeats: number,
  pressedBeats: number,
): number {
  if (durationBeats <= 0) return 0;
  const fraction = Math.min(1, Math.max(0, pressedBeats) / durationBeats);
  return Math.max(0, Math.round(HOLD_NOTE_POINTS * (1 - fraction)));
}

export function coveredBeats(
  start: number,
  end: number,
  holds: readonly HoldInterval[],
  now: number,
): number {
  let sum = 0;
  for (const hold of holds) {
    const holdEnd = hold.end ?? now;
    const from = Math.max(start, hold.start);
    const to = Math.min(end, holdEnd);
    if (to > from) sum += to - from;
  }
  return sum;
}

/** Tempo preso depois do fim. Se ainda estiver preso, conta a duração inteira (teto da penalidade). */
export function lateBeats(
  end: number,
  durationBeats: number,
  holds: readonly HoldInterval[],
  graceBeats = 0,
): number {
  const forgiveUntil = end + Math.max(0, graceBeats);
  let extra = 0;
  let stillHolding = false;
  for (const hold of holds) {
    if (hold.start >= end) continue;
    if (hold.end == null) {
      stillHolding = true;
      continue;
    }
    if (hold.end > forgiveUntil) extra += hold.end - forgiveUntil;
  }
  if (stillHolding) extra = durationBeats;
  return Math.min(Math.max(0, extra), durationBeats);
}

export function noteSettled(
  start: number,
  end: number,
  holds: readonly HoldInterval[],
  now: number,
  graceBeats = 0,
): boolean {
  if (now < end) return false;
  const stillHolding = holds.some(
    (hold) => hold.end == null && hold.start < end,
  );
  if (!stillHolding) return true;
  return now - end >= end - start + Math.max(0, graceBeats);
}
