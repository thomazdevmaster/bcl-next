export type RhythmLevel = 'facil' | 'medio' | 'dificil';

export type RhythmFigureId =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'dotted-half'
  | 'dotted-quarter'
  | 'rest-whole'
  | 'rest-half'
  | 'rest-quarter'
  | 'rest-eighth';

export interface RhythmFigure {
  id: RhythmFigureId;
  label: string;
  /** Duração em tempos de semínima (compasso 4/4). */
  beats: number;
  rest: boolean;
  dotted: boolean;
}

export const RHYTHM_FIGURES: RhythmFigure[] = [
  { id: 'whole', label: 'Semibreve', beats: 4, rest: false, dotted: false },
  { id: 'dotted-half', label: 'Mínima pontuada', beats: 3, rest: false, dotted: true },
  { id: 'half', label: 'Mínima', beats: 2, rest: false, dotted: false },
  { id: 'dotted-quarter', label: 'Semínima pontuada', beats: 1.5, rest: false, dotted: true },
  { id: 'quarter', label: 'Semínima', beats: 1, rest: false, dotted: false },
  { id: 'eighth', label: 'Colcheia', beats: 0.5, rest: false, dotted: false },
  { id: 'sixteenth', label: 'Semicolcheia', beats: 0.25, rest: false, dotted: false },
  { id: 'rest-whole', label: 'Pausa de semibreve', beats: 4, rest: true, dotted: false },
  { id: 'rest-half', label: 'Pausa de mínima', beats: 2, rest: true, dotted: false },
  { id: 'rest-quarter', label: 'Pausa de semínima', beats: 1, rest: true, dotted: false },
  { id: 'rest-eighth', label: 'Pausa de colcheia', beats: 0.5, rest: true, dotted: false },
];

const BY_ID = new Map(RHYTHM_FIGURES.map((figure) => [figure.id, figure]));

export function rhythmFigure(id: RhythmFigureId): RhythmFigure {
  return BY_ID.get(id)!;
}

const LEVEL_IDS: Record<RhythmLevel, RhythmFigureId[]> = {
  facil: ['whole', 'half', 'quarter'],
  medio: ['whole', 'half', 'quarter', 'eighth', 'rest-half', 'rest-quarter'],
  dificil: [
    'whole',
    'dotted-half',
    'half',
    'dotted-quarter',
    'quarter',
    'eighth',
    'sixteenth',
    'rest-whole',
    'rest-half',
    'rest-quarter',
    'rest-eighth',
  ],
};

export const RHYTHM_LEVELS: Array<{
  id: RhythmLevel;
  label: string;
  rangeHint: string;
}> = [
  {
    id: 'facil',
    label: 'Fácil',
    rangeHint: 'Semibreve, mínima e semínima',
  },
  {
    id: 'medio',
    label: 'Médio',
    rangeHint: 'Colcheia e pausas de mínima e semínima',
  },
  {
    id: 'dificil',
    label: 'Difícil',
    rangeHint: 'Pontos de aumento, semicolcheia e mais pausas',
  },
];

export const RHYTHM_BAR_BEATS = 4;

export function figuresForLevel(level: RhythmLevel): RhythmFigure[] {
  return LEVEL_IDS[level].map((id) => rhythmFigure(id));
}

export function formatBeats(beats: number): string {
  if (beats === 0.25) return '¼ tempo';
  if (beats === 0.5) return '½ tempo';
  if (beats === 1.5) return '1½ tempo';
  if (beats === 1) return '1 tempo';
  const rounded = Number.isInteger(beats) ? String(beats) : String(beats);
  return `${rounded} tempos`;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

export function pickRhythmFigure(level: RhythmLevel): RhythmFigure {
  const pool = figuresForLevel(level);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function figureChoices(
  correct: RhythmFigure,
  level: RhythmLevel,
  count = 4,
): RhythmFigure[] {
  const pool = figuresForLevel(level).filter((figure) => figure.id !== correct.id);
  const extras = shuffle(pool).slice(0, Math.max(0, count - 1));
  return shuffle([correct, ...extras]);
}

export interface DurationPair {
  left: RhythmFigure;
  right: RhythmFigure;
}

export function pickDurationPair(level: RhythmLevel): DurationPair {
  const pool = figuresForLevel(level);
  const left = pool[Math.floor(Math.random() * pool.length)]!;
  const different = pool.filter((figure) => figure.beats !== left.beats);
  const sameValue = pool.filter(
    (figure) => figure.id !== left.id && figure.beats === left.beats,
  );
  const allowTie = level !== 'facil' && sameValue.length > 0 && Math.random() < 0.28;
  if (allowTie) {
    return {
      left,
      right: sameValue[Math.floor(Math.random() * sameValue.length)]!,
    };
  }
  const rightPool = different.length > 0 ? different : pool.filter((figure) => figure.id !== left.id);
  return {
    left,
    right: rightPool[Math.floor(Math.random() * rightPool.length)] ?? left,
  };
}

export type DurationWinner = 'left' | 'right' | 'tie';

export function durationWinner(pair: DurationPair): DurationWinner {
  if (pair.left.beats === pair.right.beats) return 'tie';
  return pair.left.beats > pair.right.beats ? 'left' : 'right';
}

function fits(figure: RhythmFigure, beats: number): boolean {
  return figure.beats <= beats + 0.001;
}

function fillBeats(
  pool: RhythmFigure[],
  beats: number,
  maxEvents: number,
): RhythmFigure[] | null {
  if (beats < 0.001) return [];
  if (maxEvents <= 0) return null;
  for (const figure of shuffle(pool.filter((item) => fits(item, beats)))) {
    const rest = fillBeats(pool, roundBeats(beats - figure.beats), maxEvents - 1);
    if (rest) return [figure, ...rest];
  }
  return null;
}

function roundBeats(value: number): number {
  return Math.round(value * 4) / 4;
}

export function barSignature(figures: RhythmFigure[]): string {
  return figures.map((figure) => figure.id).join('|');
}

export function randomBar(
  level: RhythmLevel,
  options?: { notesOnly?: boolean; maxEvents?: number },
): RhythmFigure[] {
  const pool = figuresForLevel(level).filter((figure) =>
    options?.notesOnly ? !figure.rest : true,
  );
  const source = pool.length > 0 ? pool : figuresForLevel(level);
  return (
    fillBeats(source, RHYTHM_BAR_BEATS, options?.maxEvents ?? 8) ?? [
      rhythmFigure('whole'),
    ]
  );
}

export interface BarCompletion {
  prefix: RhythmFigure[];
  answer: RhythmFigure;
  options: RhythmFigure[];
}

export function buildBarCompletion(level: RhythmLevel): BarCompletion {
  const pool = figuresForLevel(level);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const answer = pool[Math.floor(Math.random() * pool.length)]!;
    const remain = roundBeats(RHYTHM_BAR_BEATS - answer.beats);
    const prefix =
      remain <= 0
        ? []
        : (fillBeats(
            pool.filter((figure) => !figure.rest),
            remain,
            6,
          ) ?? fillBeats(pool, remain, 6));
    if (!prefix) continue;
    const written = prefix.reduce((sum, figure) => sum + figure.beats, 0);
    if (Math.abs(roundBeats(written + answer.beats) - RHYTHM_BAR_BEATS) > 0.001) {
      continue;
    }
    const wrong = pool.filter((figure) => Math.abs(figure.beats - answer.beats) > 0.001);
    return {
      prefix,
      answer,
      options: shuffle([answer, ...shuffle(wrong).slice(0, 3)]),
    };
  }
  const answer = rhythmFigure('whole');
  return { prefix: [], answer, options: figureChoices(answer, level) };
}

export interface RhythmDictation {
  pattern: RhythmFigure[];
  options: RhythmFigure[][];
}

export function buildRhythmDictation(level: RhythmLevel): RhythmDictation {
  const notesOnly = level === 'facil';
  const pattern = randomBar(level, { notesOnly, maxEvents: level === 'dificil' ? 8 : 6 });
  const signature = barSignature(pattern);
  const options = [pattern];
  let guard = 0;
  while (options.length < 3 && guard < 24) {
    const candidate = randomBar(level, {
      notesOnly,
      maxEvents: level === 'dificil' ? 8 : 6,
    });
    const key = barSignature(candidate);
    if (key !== signature && options.every((bar) => barSignature(bar) !== key)) {
      options.push(candidate);
    }
    guard += 1;
  }
  return { pattern, options: shuffle(options) };
}

export interface RhythmLevelStats {
  selectedLevel: RhythmLevel;
  bestStreakByLevel: Record<RhythmLevel, number>;
}

function emptyBest(): Record<RhythmLevel, number> {
  return { facil: 0, medio: 0, dificil: 0 };
}

export function readRhythmLevelStats(storageKey: string): RhythmLevelStats {
  if (typeof window === 'undefined') {
    return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
    const parsed = JSON.parse(raw) as Partial<RhythmLevelStats>;
    const bestStreakByLevel = emptyBest();
    for (const level of RHYTHM_LEVELS) {
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

export function writeRhythmLevelStats(
  storageKey: string,
  stats: RhythmLevelStats,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(stats));
}

export const RHYTHM_FIGURES_STORAGE_KEY = 'bcl.game.ritmos-figuras';
export const RHYTHM_DURATION_STORAGE_KEY = 'bcl.game.ritmos-qual-dura-mais';
export const RHYTHM_BAR_STORAGE_KEY = 'bcl.game.ritmos-complete-o-compasso';
export const RHYTHM_DICTATION_STORAGE_KEY = 'bcl.game.ritmos-ouca-o-ritmo';
