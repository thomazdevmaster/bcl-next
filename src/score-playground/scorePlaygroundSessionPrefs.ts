import { clampPlaygroundVolume } from './playgroundVolume';
import {
  DESKTOP_MEASURES_MAX,
  MOBILE_MEASURES_MIN,
} from './playgroundZoomTypes';

/** Preferências da sessão do playground, gravadas por música (e por conta, quando há login). */
export type ScorePlaygroundSessionPrefs = {
  /** Compassos por linha escolhidos no zoom. Ausente = zoom automático da largura. */
  measuresPerLine?: number;
  /** `written` = com voltas. Ausente = desdobrada. */
  displayMode?: 'unrolled' | 'written';
  metronome?: boolean;
  /** 0 silencia. Ausente = volume cheio. */
  volume?: number;
  /** Multiplicador do andamento (0,5–1,5). Ausente = 100%. */
  velocity?: number;
};

const VELOCITY_MIN = 0.5;
const VELOCITY_MAX = 1.5;

export function playgroundSessionPrefsKey(ownerId: string | null, songId: string): string {
  return ownerId
    ? `score_playground_session_${ownerId}_${songId}`
    : `score_playground_session_${songId}`;
}

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function readPlaygroundSessionPrefs(
  storage: KeyValueStore,
  ownerId: string | null,
  songId: string,
): ScorePlaygroundSessionPrefs {
  try {
    const raw = storage.getItem(playgroundSessionPrefsKey(ownerId, songId));
    if (!raw) return {};
    return normalizePlaygroundSessionPrefs(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Grava só os campos informados e preserva o restante já salvo da mesma música. */
export function writePlaygroundSessionPrefs(
  storage: KeyValueStore,
  ownerId: string | null,
  songId: string,
  patch: ScorePlaygroundSessionPrefs,
): void {
  try {
    const current = readPlaygroundSessionPrefs(storage, ownerId, songId);
    const next = normalizePlaygroundSessionPrefs({ ...current, ...patch });
    storage.setItem(
      playgroundSessionPrefsKey(ownerId, songId),
      JSON.stringify(next),
    );
  } catch {
    /* quota ou storage indisponível: a sessão segue sem memória */
  }
}

export function normalizePlaygroundSessionPrefs(raw: unknown): ScorePlaygroundSessionPrefs {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const prefs: ScorePlaygroundSessionPrefs = {};

  if (typeof source.measuresPerLine === 'number' && Number.isFinite(source.measuresPerLine)) {
    const rounded = Math.round(source.measuresPerLine);
    if (rounded >= MOBILE_MEASURES_MIN && rounded <= DESKTOP_MEASURES_MAX) {
      prefs.measuresPerLine = rounded;
    }
  }

  if (source.displayMode === 'unrolled' || source.displayMode === 'written') {
    prefs.displayMode = source.displayMode;
  }

  if (typeof source.metronome === 'boolean') {
    prefs.metronome = source.metronome;
  }

  if (typeof source.volume === 'number' && Number.isFinite(source.volume)) {
    prefs.volume = clampPlaygroundVolume(source.volume);
  }

  if (typeof source.velocity === 'number' && Number.isFinite(source.velocity)) {
    prefs.velocity = Math.min(VELOCITY_MAX, Math.max(VELOCITY_MIN, source.velocity));
  }

  return prefs;
}
