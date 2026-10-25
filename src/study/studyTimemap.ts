export type MeasureTimemapEntry = {
  measure: number;
  timestamp: number;
  duration: number;
};

function medianPositive(values: number[]): number {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Verovio costuma emitir uma entrada por semínima (~60000/bpm ms), não por compasso.
 * Tratar isso como compasso faz o contador de tempos correr ~beatsPerMeasure vezes rápido demais.
 */
export function timemapLooksBeatLevel(
  entries: MeasureTimemapEntry[],
  beatsPerMeasure: number,
  tempoBpm: number,
): boolean {
  const beats = Math.max(1, beatsPerMeasure);
  if (entries.length < beats + 1) return false;
  const beatMs = 60000 / Math.max(30, tempoBpm);
  const measureMs = beatMs * beats;
  const median = medianPositive(entries.map((e) => e.duration ?? 0));
  if (median <= 0) return false;
  const likeBeat = Math.abs(median - beatMs) / beatMs <= 0.12;
  const likeMeasure = Math.abs(median - measureMs) / measureMs <= 0.12;
  if (likeMeasure || !likeBeat) return false;
  return median / beats < beatMs * 0.85;
}

/** Agrupa entradas batida-a-batida em compassos (soma durações; timestamps recalculados). */
export function aggregateTimemapBeatsToMeasures(
  entries: MeasureTimemapEntry[],
  beatsPerMeasure: number,
): MeasureTimemapEntry[] {
  const beats = Math.max(1, beatsPerMeasure);
  const out: MeasureTimemapEntry[] = [];
  for (let i = 0; i < entries.length; i += beats) {
    const chunk = entries.slice(i, i + beats);
    if (chunk.length === 0) continue;
    const duration = chunk.reduce((sum, e) => sum + Math.max(0, e.duration ?? 0), 0);
    const firstMeasure = chunk[0]?.measure;
    out.push({
      measure: typeof firstMeasure === 'number' ? Math.floor(firstMeasure / beats) : out.length,
      timestamp: 0,
      duration,
    });
  }
  return normalizeTimemapTimestamps(out);
}

/** Um compasso por entrada, mas `duration` veio em semínimas (~60000/bpm ms). */
export function scaleTimemapMeasureDurationsFromBeatUnit(
  entries: MeasureTimemapEntry[],
  beatsPerMeasure: number,
): MeasureTimemapEntry[] {
  const beats = Math.max(1, beatsPerMeasure);
  const scaled = entries.map((entry) => ({
    ...entry,
    duration: Math.max(0, (entry.duration ?? 0) * beats),
  }));
  return normalizeTimemapTimestamps(scaled);
}

function timemapIsBeatStream(
  entries: MeasureTimemapEntry[],
  beatsPerMeasure: number,
): boolean {
  const beats = Math.max(1, beatsPerMeasure);
  return entries.length >= beats * 8 && entries.length % beats === 0;
}

/** Ajusta timemap bruto do Verovio para o eixo compasso usado no estudo. */
export function normalizeStudyTimemapEntries(
  entries: MeasureTimemapEntry[],
  beatsPerMeasure: number,
  tempoBpm: number,
): MeasureTimemapEntry[] {
  let normalized = normalizeTimemapTimestamps(entries);
  if (!timemapLooksBeatLevel(normalized, beatsPerMeasure, tempoBpm)) {
    return normalized;
  }
  if (timemapIsBeatStream(normalized, beatsPerMeasure)) {
    return aggregateTimemapBeatsToMeasures(normalized, beatsPerMeasure);
  }
  return scaleTimemapMeasureDurationsFromBeatUnit(normalized, beatsPerMeasure);
}

/**
 * Relógio de compasso fixo (♩=bpm, compasso homogêneo) — alinha cursor/metrônomo ao áudio
 * quando o timemap Verovio vem em fatias irregulares (~semínima por entrada).
 */
export function measureDurationMsFromTempo(
  beatsPerMeasure: number,
  tempoBpm: number,
): number {
  const beats = Math.max(1, beatsPerMeasure);
  const bpm = Math.max(30, tempoBpm);
  return (beats * 60_000) / bpm;
}

/** Compasso/tempo a partir do BPM da partitura (eixo do áudio mapeado por duração total). */
export function getPlaybackPositionFromUniformTempo(
  posMs: number,
  beatsPerMeasure: number,
  tempoBpm: number,
): {
  measureIndex: number;
  measure: number;
  beatInMeasure: number;
  beat: number;
  fractionInMeasure: number;
} {
  const measureMs = measureDurationMsFromTempo(beatsPerMeasure, tempoBpm);
  const beats = Math.max(1, beatsPerMeasure);
  const beatMs = measureMs / beats;
  const safePos = Math.max(0, posMs);
  const measureIndex = Math.max(0, Math.floor(safePos / measureMs));
  const offsetInMeasure = safePos - measureIndex * measureMs;
  const beatInMeasure = Math.min(
    beats - 1,
    Math.max(0, Math.floor(offsetInMeasure / beatMs)),
  );
  const fractionInMeasure =
    measureMs > 0 ? Math.max(0, Math.min(1, offsetInMeasure / measureMs)) : 0;
  return {
    measureIndex,
    measure: measureIndex + 1,
    beatInMeasure,
    beat: beatInMeasure + 1,
    fractionInMeasure,
  };
}

/** Recalcula `timestamp` cumulativo a partir de `duration` (Verovio às vezes envia timestamp incoerente). */
export function normalizeTimemapTimestamps(
  entries: MeasureTimemapEntry[],
): MeasureTimemapEntry[] {
  let cursor = 0;
  return entries.map((entry, index) => {
    const duration = Math.max(0, entry.duration ?? 0);
    const normalized: MeasureTimemapEntry = {
      ...entry,
      timestamp: cursor,
      measure: typeof entry.measure === 'number' ? entry.measure : index,
    };
    cursor += duration;
    return normalized;
  });
}

export function readPlayerTimemap(player: unknown): MeasureTimemapEntry[] | null {
  const timemap = (player as { _options?: { converter?: { timemap?: unknown } } })?._options
    ?.converter?.timemap;
  if (!Array.isArray(timemap) || timemap.length === 0) return null;
  const filtered = timemap.filter(
    (entry): entry is MeasureTimemapEntry =>
      entry != null &&
      typeof entry === 'object' &&
      typeof (entry as MeasureTimemapEntry).duration === 'number',
  );
  if (filtered.length === 0) return null;
  const study = (player as { __bclStudyTimemap?: MeasureTimemapEntry[] }).__bclStudyTimemap;
  if (study?.length) return study;
  return normalizeTimemapTimestamps(filtered);
}

/** Posição atual do player — sempre em milissegundos (contrato do musicxml-player). */
export function getPlayerPositionMs(player: unknown): number | null {
  const pos = (player as { position?: number })?.position;
  if (pos == null || Number.isNaN(Number(pos))) return null;
  return Number(pos);
}

export function sumTimemapDurationMs(timemap: MeasureTimemapEntry[]): number {
  return timemap.reduce((total, entry) => total + Math.max(0, entry.duration ?? 0), 0);
}

function readSequencerTiming(player: unknown): { currentSec: number; durationSec: number } | null {
  const seq = (player as { _sequencer?: { currentTime?: number; duration?: number } })?._sequencer;
  if (!seq) return null;
  const durationSec = seq.duration ?? 0;
  if (durationSec <= 0) return null;
  const currentSec = Math.max(0, seq.currentTime ?? 0);
  return { currentSec, durationSec };
}

function isTimemapSequencerDurationAligned(
  player: unknown,
  timemapMs: number,
): boolean {
  const flagged = (player as { __bclTimemapAligned?: boolean }).__bclTimemapAligned;
  if (flagged === true) return true;
  if (flagged === false) return false;
  const timing = readSequencerTiming(player);
  if (!timing || timemapMs <= 0) return false;
  const seqMs = timing.durationSec * 1000;
  return seqMs > 0 && Math.abs(seqMs - timemapMs) / timemapMs <= 0.06;
}

/** Compensa atraso visual do cursor em relação ao áudio (OSMD + rAF). */
export const STUDY_CURSOR_AUDIO_LEAD_MS = 55;

/** Converte posição do sequenciador (MIDI real) para eixo do timemap (partitura). */
export function mapSequencerPositionToTimemapMs(
  player: unknown,
  timemap: MeasureTimemapEntry[] | null,
): number | null {
  if (!timemap?.length) return getPlayerPositionMs(player);
  const timing = readSequencerTiming(player);
  const timemapMs = sumTimemapDurationMs(timemap);
  if (!timing || timemapMs <= 0) return getPlayerPositionMs(player);
  const ratio = Math.max(0, Math.min(1, timing.currentSec / timing.durationSec));
  const mapped = ratio * timemapMs;
  const lead = isTimemapSequencerDurationAligned(player, timemapMs)
    ? STUDY_CURSOR_AUDIO_LEAD_MS
    : 0;
  return Math.min(timemapMs, mapped + lead);
}

/** No tempo 1, cursor no início do compasso (evita “arrastar” atrás do áudio). */
export function visualCursorOffsetInMeasure(
  posMs: number,
  measureStartMs: number,
  beatOneBased: number,
): number {
  if (beatOneBased <= 1) return 0;
  return Math.max(0, posMs - measureStartMs);
}

/** Posição unificada para cursor, loop e metrônomo no modo estudo. */
export function getStudyPlaybackPositionMs(player: unknown): number | null {
  const timemap = readPlayerTimemap(player);
  if (timemap?.length) {
    return mapSequencerPositionToTimemapMs(player, timemap);
  }
  return getPlayerPositionMs(player);
}

/** Define o sequenciador a partir de um instante no eixo do timemap. */
export function setSequencerFromTimemapMs(
  player: unknown,
  timemap: MeasureTimemapEntry[],
  timemapMs: number,
): void {
  const timing = readSequencerTiming(player);
  const totalMs = sumTimemapDurationMs(timemap);
  if (!timing || totalMs <= 0) return;
  const clamped = Math.max(0, Math.min(timemapMs, totalMs));
  const ratio = totalMs > 0 ? clamped / totalMs : 0;
  const seq = (player as { _sequencer?: { currentTime?: number } })._sequencer;
  if (seq) {
    seq.currentTime = ratio * timing.durationSec;
  }
  try {
    const posDesc = Object.getOwnPropertyDescriptor(player as object, 'position');
    if (posDesc?.set) {
      posDesc.set.call(player, clamped);
    } else {
      const internal = player as { _position?: number };
      if ('_position' in internal) {
        internal._position = clamped;
      }
    }
  } catch {
    /* Player.position é só leitura; sequenciador + cursor OSMD já foram posicionados. */
  }
}

export function findTimemapIndexAtPosition(
  timemap: MeasureTimemapEntry[],
  posMs: number,
): number {
  if (timemap.length === 0) return 0;
  let index = 0;
  for (let i = 0; i < timemap.length - 1; i++) {
    const start = timemap[i]?.timestamp ?? 0;
    const nextStart = timemap[i + 1]?.timestamp ?? Infinity;
    if (posMs >= start && posMs < nextStart) {
      index = i;
      break;
    }
    if (posMs < start) {
      index = Math.max(0, i - 1);
      break;
    }
    index = i;
  }
  if (index >= timemap.length) index = timemap.length - 1;
  return index;
}

export function getPlaybackPositionFromTimemap(
  timemap: MeasureTimemapEntry[],
  posMs: number,
  beatsPerMeasure: number,
): {
  measureIndex: number;
  measure: number;
  beatInMeasure: number;
  beat: number;
  fractionInMeasure: number;
} | null {
  const index = findTimemapIndexAtPosition(timemap, posMs);
  const entry = timemap[index];
  if (!entry) return null;

  const measureStart = entry.timestamp ?? 0;
  let duration = entry.duration ?? 0;
  if (duration <= 0 && timemap[index + 1]) {
    duration = (timemap[index + 1].timestamp ?? 0) - measureStart;
  }

  // Índice no timemap é o eixo do áudio; `entry.measure` do Verovio pode pular (ex.: 0,3,7…).
  const measureIndex = index;

  const beats = Math.max(1, beatsPerMeasure);
  if (duration <= 0) {
    return {
      measureIndex,
      measure: index + 1,
      beatInMeasure: 0,
      beat: 1,
      fractionInMeasure: 0,
    };
  }

  const beatDuration = duration / beats;
  const beatInMeasure = Math.min(
    beats - 1,
    Math.max(0, Math.floor((posMs - measureStart) / beatDuration)),
  );
  const fractionInMeasure = Math.max(0, Math.min(1, (posMs - measureStart) / duration));

  return {
    measureIndex,
    measure: index + 1,
    beatInMeasure,
    beat: beatInMeasure + 1,
    fractionInMeasure,
  };
}
