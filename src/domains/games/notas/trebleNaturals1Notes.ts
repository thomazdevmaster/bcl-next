import type { PitchDefinition, SolfegeName } from '@/lib/music/pitch';

/** Nota na partitura (meio-passo da linha inferior Mi4 = 0). */
export interface TrebleNaturalNote extends PitchDefinition {
  staffStep: number;
}

const LETTER_TO_SOLFEGE: Record<string, SolfegeName> = {
  C: 'Dó',
  D: 'Ré',
  E: 'Mi',
  F: 'Fá',
  G: 'Sol',
  A: 'Lá',
  B: 'Si',
};

/** Naturais de Dó4 (grave) a Dó6 (agudo) na clave de sol. */
const TREBLE_NATURAL_SPECS: Array<{ id: string; midi: number; staffStep: number }> =
  [
    { id: 'C4', midi: 60, staffStep: -2 },
    { id: 'D4', midi: 62, staffStep: -1 },
    { id: 'E4', midi: 64, staffStep: 0 },
    { id: 'F4', midi: 65, staffStep: 1 },
    { id: 'G4', midi: 67, staffStep: 2 },
    { id: 'A4', midi: 69, staffStep: 3 },
    { id: 'B4', midi: 71, staffStep: 4 },
    { id: 'C5', midi: 72, staffStep: 5 },
    { id: 'D5', midi: 74, staffStep: 6 },
    { id: 'E5', midi: 76, staffStep: 7 },
    { id: 'F5', midi: 77, staffStep: 8 },
    { id: 'G5', midi: 79, staffStep: 9 },
    { id: 'A5', midi: 81, staffStep: 10 },
    { id: 'B5', midi: 83, staffStep: 11 },
    { id: 'C6', midi: 84, staffStep: 12 },
  ];

function noteFromSpec(spec: (typeof TREBLE_NATURAL_SPECS)[number]): TrebleNaturalNote {
  const letter = spec.id.replace(/\d+/, '');
  const solfege = LETTER_TO_SOLFEGE[letter] ?? 'Dó';
  return {
    id: spec.id,
    midi: spec.midi,
    staffStep: spec.staffStep,
    solfege,
    letter,
  };
}

export const TREBLE_NATURALS_1: TrebleNaturalNote[] =
  TREBLE_NATURAL_SPECS.map(noteFromSpec);

export const TREBLE_NATURALS_1_ANSWER_ORDER: SolfegeName[] = [
  'Dó',
  'Ré',
  'Mi',
  'Fá',
  'Sol',
  'Lá',
  'Si',
];

/** Rótulos dos botões (solfège + letra); independente da oitava sorteada. */
export const TREBLE_ANSWER_BUTTONS: Array<{ solfege: SolfegeName; letter: string }> =
  TREBLE_NATURALS_1_ANSWER_ORDER.map((solfege) => ({
    solfege,
    letter:
      Object.entries(LETTER_TO_SOLFEGE).find(([, name]) => name === solfege)?.[0] ??
      'C',
  }));

export type TrebleNaturals1Level = 'facil' | 'medio' | 'dificil';

export const TREBLE_NATURAL_LEVELS: Array<{
  id: TrebleNaturals1Level;
  label: string;
  rangeHint: string;
}> = [
  {
    id: 'facil',
    label: 'Fácil',
    rangeHint: 'Mi₄ a Dó₅ — só na pauta',
  },
  {
    id: 'medio',
    label: 'Médio',
    rangeHint: 'Ré₄ a Sol₅ — pauta estendida',
  },
  {
    id: 'dificil',
    label: 'Difícil',
    rangeHint: 'Dó₄ a Dó₆ — linhas suplementares',
  },
];

const LEVEL_STAFF_BOUNDS: Record<
  TrebleNaturals1Level,
  { min: number; max: number }
> = {
  facil: { min: 0, max: 5 },
  medio: { min: -1, max: 9 },
  dificil: { min: -2, max: 12 },
};

export function notesForLevel(
  level: TrebleNaturals1Level,
): TrebleNaturalNote[] {
  const { min, max } = LEVEL_STAFF_BOUNDS[level];
  return TREBLE_NATURALS_1.filter(
    (note) => note.staffStep >= min && note.staffStep <= max,
  );
}

export function pickRandomTrebleNatural(
  level: TrebleNaturals1Level,
  excludeId?: string,
): TrebleNaturalNote {
  const levelPool = notesForLevel(level);
  const pool =
    excludeId && levelPool.length > 1
      ? levelPool.filter((note) => note.id !== excludeId)
      : levelPool;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function isCorrectSolfegeAnswer(
  target: TrebleNaturalNote,
  chosenSolfege: SolfegeName,
): boolean {
  return target.solfege === chosenSolfege;
}

export const TREBLE_NATURALS_1_STORAGE_KEY =
  'bcl.game.notas-clave-sol-naturais-1';

export interface TrebleNaturals1PersistedStats {
  selectedLevel: TrebleNaturals1Level;
  bestStreakByLevel: Record<TrebleNaturals1Level, number>;
}

function emptyBestStreakByLevel(): Record<TrebleNaturals1Level, number> {
  return { facil: 0, medio: 0, dificil: 0 };
}

export function readTrebleNaturals1Stats(): TrebleNaturals1PersistedStats {
  if (typeof window === 'undefined') {
    return { selectedLevel: 'medio', bestStreakByLevel: emptyBestStreakByLevel() };
  }
  try {
    const raw = window.localStorage.getItem(TREBLE_NATURALS_1_STORAGE_KEY);
    if (!raw) {
      return { selectedLevel: 'medio', bestStreakByLevel: emptyBestStreakByLevel() };
    }
    const parsed = JSON.parse(raw) as Partial<
      TrebleNaturals1PersistedStats & { bestStreak?: number }
    >;
    const bestStreakByLevel = emptyBestStreakByLevel();
    if (parsed.bestStreakByLevel) {
      for (const level of TREBLE_NATURAL_LEVELS) {
        bestStreakByLevel[level.id] = Math.max(
          0,
          Number(parsed.bestStreakByLevel[level.id]) || 0,
        );
      }
    } else if (typeof parsed.bestStreak === 'number') {
      bestStreakByLevel.dificil = Math.max(0, parsed.bestStreak);
    }
    const selectedLevel =
      parsed.selectedLevel === 'facil' ||
      parsed.selectedLevel === 'medio' ||
      parsed.selectedLevel === 'dificil'
        ? parsed.selectedLevel
        : 'medio';
    return { selectedLevel, bestStreakByLevel };
  } catch {
    return { selectedLevel: 'medio', bestStreakByLevel: emptyBestStreakByLevel() };
  }
}

export function writeTrebleNaturals1Stats(
  stats: TrebleNaturals1PersistedStats,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    TREBLE_NATURALS_1_STORAGE_KEY,
    JSON.stringify(stats),
  );
}
