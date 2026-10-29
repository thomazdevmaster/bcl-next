export type InstrumentLevel = 'facil' | 'medio' | 'dificil';

export type BandFamilyId = 'madeira' | 'metais' | 'percussao' | 'cordas';

export type PlayMethodId =
  | 'aresta'
  | 'palheta-simples'
  | 'palheta-dupla'
  | 'bocal'
  | 'percussao'
  | 'arco'
  | 'dedilhado';

export interface BandInstrument {
  id: string;
  name: string;
  family: BandFamilyId;
  method: PlayMethodId;
  /** Região típica: número maior soa mais agudo. Ausente se não tem altura definida. */
  register: number | null;
  tier: InstrumentLevel;
  clue: string;
}

export const BAND_FAMILIES: Array<{ id: BandFamilyId; label: string }> = [
  { id: 'madeira', label: 'Sopro madeira' },
  { id: 'metais', label: 'Sopro metais' },
  { id: 'percussao', label: 'Percussão' },
  { id: 'cordas', label: 'Cordas' },
];

export const PLAY_METHODS: Array<{ id: PlayMethodId; label: string }> = [
  { id: 'aresta', label: 'Sopro sem palheta' },
  { id: 'palheta-simples', label: 'Palheta simples' },
  { id: 'palheta-dupla', label: 'Palheta dupla' },
  { id: 'bocal', label: 'Bocal' },
  { id: 'percussao', label: 'Percussão' },
  { id: 'arco', label: 'Arco' },
  { id: 'dedilhado', label: 'Cordas dedilhadas' },
];

export const BAND_INSTRUMENTS: BandInstrument[] = [
  {
    id: 'flauta',
    name: 'Flauta transversal',
    family: 'madeira',
    method: 'aresta',
    register: 8,
    tier: 'facil',
    clue: 'Sopro de madeira, sem palheta, tubo de metal e região aguda.',
  },
  {
    id: 'clarinete',
    name: 'Clarinete',
    family: 'madeira',
    method: 'palheta-simples',
    register: 6,
    tier: 'facil',
    clue: 'Palheta simples. Na banda, em geral em Si bemol.',
  },
  {
    id: 'sax-alto',
    name: 'Saxofone alto',
    family: 'madeira',
    method: 'palheta-simples',
    register: 5,
    tier: 'facil',
    clue: 'Palheta simples e corpo de metal, afinado em Mi bemol.',
  },
  {
    id: 'trompete',
    name: 'Trompete',
    family: 'metais',
    method: 'bocal',
    register: 7,
    tier: 'facil',
    clue: 'Metal com pistos, na região aguda dos metais. Em geral em Si bemol.',
  },
  {
    id: 'trombone',
    name: 'Trombone',
    family: 'metais',
    method: 'bocal',
    register: 4,
    tier: 'facil',
    clue: 'Metal de vara, sem pistos, na região média-grave.',
  },
  {
    id: 'tuba',
    name: 'Tuba',
    family: 'metais',
    method: 'bocal',
    register: 1,
    tier: 'facil',
    clue: 'O mais grave dos metais de bocal. Sustenta o baixo da banda.',
  },
  {
    id: 'caixa',
    name: 'Caixa',
    family: 'percussao',
    method: 'percussao',
    register: null,
    tier: 'facil',
    clue: 'Tambor com esteira, tocado com baquetas. Não tem altura definida.',
  },
  {
    id: 'pratos',
    name: 'Pratos',
    family: 'percussao',
    method: 'percussao',
    register: null,
    tier: 'facil',
    clue: 'Discos de metal que se chocam. Sem altura definida.',
  },
  {
    id: 'flautim',
    name: 'Flautim',
    family: 'madeira',
    method: 'aresta',
    register: 10,
    tier: 'medio',
    clue: 'O mais agudo da família da flauta. Também chamado de piccolo.',
  },
  {
    id: 'oboe',
    name: 'Oboé',
    family: 'madeira',
    method: 'palheta-dupla',
    register: 7,
    tier: 'medio',
    clue: 'Palheta dupla e som nasal. Costuma dar o lá para afinar.',
  },
  {
    id: 'fagote',
    name: 'Fagote',
    family: 'madeira',
    method: 'palheta-dupla',
    register: 3,
    tier: 'medio',
    clue: 'Palheta dupla e tubo longo. Grave das madeiras.',
  },
  {
    id: 'trompa',
    name: 'Trompa',
    family: 'metais',
    method: 'bocal',
    register: 5,
    tier: 'medio',
    clue: 'Metal enrolado e bocal estreito, na região média.',
  },
  {
    id: 'bombardino',
    name: 'Bombardino',
    family: 'metais',
    method: 'bocal',
    register: 3,
    tier: 'medio',
    clue: 'Metal de pistos, entre o trombone e a tuba.',
  },
  {
    id: 'sax-tenor',
    name: 'Saxofone tenor',
    family: 'madeira',
    method: 'palheta-simples',
    register: 4,
    tier: 'medio',
    clue: 'Sax em Si bemol, mais grave que o alto.',
  },
  {
    id: 'surdo',
    name: 'Surdo',
    family: 'percussao',
    method: 'percussao',
    register: null,
    tier: 'medio',
    clue: 'Tambor grave da percussão. Marca o tempo.',
  },
  {
    id: 'timpano',
    name: 'Tímpano',
    family: 'percussao',
    method: 'percussao',
    register: 2,
    tier: 'medio',
    clue: 'Tambor de caldeira que se afina. Tem altura definida.',
  },
  {
    id: 'violino',
    name: 'Violino',
    family: 'cordas',
    method: 'arco',
    register: 9,
    tier: 'medio',
    clue: 'A corda mais aguda, tocada com arco.',
  },
  {
    id: 'sax-soprano',
    name: 'Saxofone soprano',
    family: 'madeira',
    method: 'palheta-simples',
    register: 7,
    tier: 'dificil',
    clue: 'O sax mais agudo, em geral em Si bemol.',
  },
  {
    id: 'sax-baritono',
    name: 'Saxofone barítono',
    family: 'madeira',
    method: 'palheta-simples',
    register: 2,
    tier: 'dificil',
    clue: 'O sax grave, em Mi bemol, com chaveão.',
  },
  {
    id: 'glock',
    name: 'Glockenspiel',
    family: 'percussao',
    method: 'percussao',
    register: 9,
    tier: 'dificil',
    clue: 'Barras de metal pequenas, muito agudas, tocadas com baqueta.',
  },
  {
    id: 'xilofone',
    name: 'Xilofone',
    family: 'percussao',
    method: 'percussao',
    register: 6,
    tier: 'dificil',
    clue: 'Barras de madeira. Som seco e brilhante.',
  },
  {
    id: 'vibrafone',
    name: 'Vibrafone',
    family: 'percussao',
    method: 'percussao',
    register: 5,
    tier: 'dificil',
    clue: 'Barras de metal com pedal e vibrato.',
  },
  {
    id: 'marimba',
    name: 'Marimba',
    family: 'percussao',
    method: 'percussao',
    register: 4,
    tier: 'dificil',
    clue: 'Barras de madeira grandes, com tubos ressonadores.',
  },
  {
    id: 'pandeiro',
    name: 'Pandeiro',
    family: 'percussao',
    method: 'percussao',
    register: null,
    tier: 'dificil',
    clue: 'Aro com soalhas, tocado com a mão.',
  },
  {
    id: 'triangulo',
    name: 'Triângulo',
    family: 'percussao',
    method: 'percussao',
    register: null,
    tier: 'dificil',
    clue: 'Barra de metal dobrada, tocada com uma baqueta fina.',
  },
  {
    id: 'viola',
    name: 'Viola',
    family: 'cordas',
    method: 'arco',
    register: 6,
    tier: 'dificil',
    clue: 'Corda um pouco maior e mais grave que o violino.',
  },
  {
    id: 'violoncelo',
    name: 'Violoncelo',
    family: 'cordas',
    method: 'arco',
    register: 4,
    tier: 'dificil',
    clue: 'Corda grave, apoiada no chão, tocada com arco.',
  },
  {
    id: 'contrabaixo',
    name: 'Contrabaixo',
    family: 'cordas',
    method: 'arco',
    register: 1,
    tier: 'dificil',
    clue: 'A corda mais grave da orquestra.',
  },
  {
    id: 'harpa',
    name: 'Harpa',
    family: 'cordas',
    method: 'dedilhado',
    register: 5,
    tier: 'dificil',
    clue: 'Muitas cordas, tocadas com os dedos, sem arco.',
  },
];

const TIER_RANK: Record<InstrumentLevel, number> = {
  facil: 0,
  medio: 1,
  dificil: 2,
};

export const INSTRUMENT_LEVELS: Array<{
  id: InstrumentLevel;
  label: string;
  rangeHint: string;
}> = [
  {
    id: 'facil',
    label: 'Fácil',
    rangeHint: 'Naipes mais comuns da banda',
  },
  {
    id: 'medio',
    label: 'Médio',
    rangeHint: 'Entram palheta dupla, trompa e violino',
  },
  {
    id: 'dificil',
    label: 'Difícil',
    rangeHint: 'Sax graves e agudos, teclados de percussão e cordas',
  },
];

export function instrumentsForLevel(level: InstrumentLevel): BandInstrument[] {
  const max = TIER_RANK[level];
  return BAND_INSTRUMENTS.filter((instrument) => TIER_RANK[instrument.tier] <= max);
}

export function familyLabel(id: BandFamilyId): string {
  return BAND_FAMILIES.find((family) => family.id === id)?.label ?? id;
}

export function methodLabel(id: PlayMethodId): string {
  return PLAY_METHODS.find((method) => method.id === id)?.label ?? id;
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

export function pickInstrument(level: InstrumentLevel): BandInstrument {
  return pick(instrumentsForLevel(level));
}

export function nameChoices(correct: BandInstrument, level: InstrumentLevel, count = 4): BandInstrument[] {
  const others = instrumentsForLevel(level).filter((instrument) => instrument.id !== correct.id);
  return shuffle([correct, ...shuffle(others).slice(0, Math.max(0, count - 1))]);
}

export function methodChoices(correct: BandInstrument, level: InstrumentLevel): PlayMethodId[] {
  const present = [
    ...new Set(instrumentsForLevel(level).map((instrument) => instrument.method)),
  ];
  const others = present.filter((method) => method !== correct.method);
  return shuffle([correct.method, ...shuffle(others).slice(0, 3)]);
}

export interface RegisterPair {
  left: BandInstrument;
  right: BandInstrument;
}

export type RegisterWinner = 'left' | 'right' | 'tie';

export function pickRegisterPair(level: InstrumentLevel): RegisterPair {
  const pool = instrumentsForLevel(level).filter((instrument) => instrument.register !== null);
  const left = pick(pool);
  const same = pool.filter(
    (instrument) => instrument.id !== left.id && instrument.register === left.register,
  );
  if (same.length > 0 && Math.random() < 0.22) {
    return { left, right: pick(same) };
  }
  const different = pool.filter(
    (instrument) => instrument.id !== left.id && instrument.register !== left.register,
  );
  return { left, right: pick(different.length > 0 ? different : pool.filter((item) => item.id !== left.id)) };
}

export function registerWinner(pair: RegisterPair): RegisterWinner {
  if (pair.left.register === pair.right.register) return 'tie';
  return (pair.left.register ?? 0) > (pair.right.register ?? 0) ? 'left' : 'right';
}

export interface InstrumentLevelStats {
  selectedLevel: InstrumentLevel;
  bestStreakByLevel: Record<InstrumentLevel, number>;
}

function emptyBest(): Record<InstrumentLevel, number> {
  return { facil: 0, medio: 0, dificil: 0 };
}

export function readInstrumentLevelStats(storageKey: string): InstrumentLevelStats {
  if (typeof window === 'undefined') {
    return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { selectedLevel: 'facil', bestStreakByLevel: emptyBest() };
    const parsed = JSON.parse(raw) as Partial<InstrumentLevelStats>;
    const bestStreakByLevel = emptyBest();
    for (const level of INSTRUMENT_LEVELS) {
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

export function writeInstrumentLevelStats(
  storageKey: string,
  stats: InstrumentLevelStats,
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(stats));
}

export const INSTRUMENT_FAMILY_STORAGE_KEY = 'bcl.game.instrumentos-familia';
export const INSTRUMENT_METHOD_STORAGE_KEY = 'bcl.game.instrumentos-como-se-toca';
export const INSTRUMENT_REGISTER_STORAGE_KEY = 'bcl.game.instrumentos-mais-agudo';
export const INSTRUMENT_CLUE_STORAGE_KEY = 'bcl.game.instrumentos-quem-e';
