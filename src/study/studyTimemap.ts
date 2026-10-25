export type MeasureTimemapEntry = {
  measure: number;
  timestamp: number;
  duration: number;
};

export function readPlayerTimemap(player: unknown): MeasureTimemapEntry[] | null {
  const timemap = (player as { _options?: { converter?: { timemap?: unknown } } })?._options
    ?.converter?.timemap;
  if (!Array.isArray(timemap) || timemap.length === 0) return null;
  return timemap.filter(
    (entry): entry is MeasureTimemapEntry =>
      entry != null &&
      typeof entry === 'object' &&
      typeof (entry as MeasureTimemapEntry).timestamp === 'number',
  );
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
  return ratio * timemapMs;
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
  const ratio = clamped / totalMs;
  const seq = (player as { _sequencer?: { currentTime?: number } })._sequencer;
  if (seq) {
    seq.currentTime = ratio * timing.durationSec;
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

  const measureIndex =
    typeof entry.measure === 'number' && entry.measure >= 0 && entry.measure < timemap.length
      ? entry.measure
      : index;

  const beats = Math.max(1, beatsPerMeasure);
  if (duration <= 0) {
    return {
      measureIndex,
      measure: measureIndex + 1,
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
    measure: measureIndex + 1,
    beatInMeasure,
    beat: beatInMeasure + 1,
    fractionInMeasure,
  };
}
