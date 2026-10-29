import { TREBLE_NATURALS_1, type TrebleNaturalNote } from '@/domains/games/notas/trebleNaturals1Notes';

export type IntervalLevel = 'facil' | 'medio' | 'dificil';

export type IntervalId =
  | 'm2'
  | 'M2'
  | 'm3'
  | 'M3'
  | 'P4'
  | 'A4'
  | 'd5'
  | 'P5'
  | 'm6'
  | 'M6'
  | 'm7'
  | 'M7'
  | 'P8';

export interface IntervalDefinition {
  id: IntervalId;
  label: string;
  semitones: number;
  /** Graus diatônicos entre as notas (2ª = 1). */
  staffSteps: number;
}

export const INTERVALS: IntervalDefinition[] = [
  { id: 'm2', label: '2ª menor', semitones: 1, staffSteps: 1 },
  { id: 'M2', label: '2ª maior', semitones: 2, staffSteps: 1 },
  { id: 'm3', label: '3ª menor', semitones: 3, staffSteps: 2 },
  { id: 'M3', label: '3ª maior', semitones: 4, staffSteps: 2 },
  { id: 'P4', label: '4ª justa', semitones: 5, staffSteps: 3 },
  { id: 'A4', label: '4ª aumentada', semitones: 6, staffSteps: 3 },
  { id: 'd5', label: '5ª diminuta', semitones: 6, staffSteps: 4 },
  { id: 'P5', label: '5ª justa', semitones: 7, staffSteps: 4 },
  { id: 'm6', label: '6ª menor', semitones: 8, staffSteps: 5 },
  { id: 'M6', label: '6ª maior', semitones: 9, staffSteps: 5 },
  { id: 'm7', label: '7ª menor', semitones: 10, staffSteps: 6 },
  { id: 'M7', label: '7ª maior', semitones: 11, staffSteps: 6 },
  { id: 'P8', label: '8ª justa', semitones: 12, staffSteps: 7 },
];

const LEVEL_IDS: Record<IntervalLevel, IntervalId[]> = {
  facil: ['M2', 'M3', 'P4', 'P5', 'P8'],
  medio: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'],
  dificil: INTERVALS.map((interval) => interval.id),
};

export const INTERVAL_LEVELS: Array<{
  id: IntervalLevel;
  label: string;
  rangeHint: string;
}> = [
  {
    id: 'facil',
    label: 'Fácil',
    rangeHint: '2ª maior, 3ª maior, 4ª e 5ª justas, 8ª',
  },
  {
    id: 'medio',
    label: 'Médio',
    rangeHint: 'Inclui 2ª e 3ª menores e as 6ªs',
  },
  {
    id: 'dificil',
    label: 'Difícil',
    rangeHint: '7ªs, trítono e demais intervalos naturais',
  },
];

export interface IntervalExample {
  lower: TrebleNaturalNote;
  upper: TrebleNaturalNote;
  interval: IntervalDefinition;
}

function classify(lower: TrebleNaturalNote, upper: TrebleNaturalNote): IntervalDefinition | null {
  const staffSteps = upper.staffStep - lower.staffStep;
  const semitones = upper.midi - lower.midi;
  return (
    INTERVALS.find(
      (interval) => interval.staffSteps === staffSteps && interval.semitones === semitones,
    ) ?? null
  );
}

const ALL_EXAMPLES: IntervalExample[] = TREBLE_NATURALS_1.flatMap((lower) =>
  TREBLE_NATURALS_1.flatMap((upper) => {
    const interval = classify(lower, upper);
    return interval ? [{ lower, upper, interval }] : [];
  }),
);

export function examplesForLevel(level: IntervalLevel): IntervalExample[] {
  const allowed = new Set(LEVEL_IDS[level]);
  return ALL_EXAMPLES.filter((example) => allowed.has(example.interval.id));
}

export function intervalsForLevel(level: IntervalLevel): IntervalDefinition[] {
  const allowed = new Set(LEVEL_IDS[level]);
  return INTERVALS.filter((interval) => allowed.has(interval.id));
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function pickIntervalExample(level: IntervalLevel): IntervalExample {
  return pick(examplesForLevel(level));
}

export function intervalChoices(
  correct: IntervalDefinition,
  level: IntervalLevel,
  count = 4,
): IntervalDefinition[] {
  const others = intervalsForLevel(level).filter((interval) => interval.id !== correct.id);
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, count - 1))]);
}

export interface IntervalComparison {
  left: IntervalExample;
  right: IntervalExample;
}

export type IntervalCompareWinner = 'left' | 'right' | 'tie';

export function pickIntervalComparison(level: IntervalLevel): IntervalComparison {
  const pool = examplesForLevel(level);
  const left = pick(pool);
  const sameWidth = pool.filter(
    (example) =>
      example.interval.semitones === left.interval.semitones &&
      example !== left,
  );
  if (sameWidth.length > 0 && Math.random() < 0.28) {
    return { left, right: pick(sameWidth) };
  }
  const widerOrNarrower = pool.filter(
    (example) => example.interval.semitones !== left.interval.semitones,
  );
  return { left, right: pick(widerOrNarrower.length > 0 ? widerOrNarrower : pool) };
}

export function compareWinner(pair: IntervalComparison): IntervalCompareWinner {
  if (pair.left.interval.semitones === pair.right.interval.semitones) return 'tie';
  return pair.left.interval.semitones > pair.right.interval.semitones ? 'left' : 'right';
}

export interface IntervalLevelStats {
  selectedLevel: IntervalLevel;
  bestStreakByLevel: Record<IntervalLevel, number>;
}

function emptyBest(): Record<IntervalLevel, number> {
  return { facil: 0, medio: 0, dificil: 0 };
}

export function readIntervalLevelStats(storageKey: string): IntervalLevelStats {
  if (typeof window === 'undefined') {
    return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
    const parsed = JSON.parse(raw) as Partial<IntervalLevelStats>;
    const bestStreakByLevel = emptyBest();
    for (const level of INTERVAL_LEVELS) {
      bestStreakByLevel[level.id] = Math.max(
        0,
        Number(parsed.bestStreakByLevel?.[level.id]) || 0,
      );
    }
    const selectedLevel =
      parsed.selectedLevel === 'facil' ||
      parsed.selectedLevel === 'medio' ||
      parsed.selectedLevel === 'dificil'
        ? parsed.selectedLevel
        : 'facil';
    return { selectedLevel, bestStreakByLevel };
  } catch {
    return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
  }
}

export function writeIntervalLevelStats(
  storageKey: string,
  stats: IntervalLevelStats,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(stats));
}

export const INTERVAL_NAME_STORAGE_KEY = 'bcl.game.intervalos-nomeie';
export const INTERVAL_COMPARE_STORAGE_KEY = 'bcl.game.intervalos-qual-e-maior';
export const INTERVAL_LISTEN_STORAGE_KEY = 'bcl.game.intervalos-ouca';
export const INTERVAL_WRITE_STORAGE_KEY = 'bcl.game.intervalos-escreva';
