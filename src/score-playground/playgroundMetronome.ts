import type { MeasureTimemapEntry } from '@/study/studyTimemap';

export type MetronomeBeat = {
  id: number;
  songMs: number;
  accent: boolean;
};

const LOOKAHEAD_MS = 140;
const LATE_MS = 25;

/** Tempos de cada compasso da primeira parte. A fórmula vale até a próxima troca. */
export function readBeatsPerMeasure(xml: string): number[] {
  const part = xml.match(/<part\b[^>]*>[\s\S]*?<\/part>/i)?.[0] ?? xml;
  const measures = part.match(/<measure\b[\s\S]*?<\/measure>/gi) ?? [];
  let current = 4;
  return measures.map((measure) => {
    const beats = measure.match(/<beats>\s*(\d+(?:\.\d+)?)\s*<\/beats>/i);
    const parsed = beats ? Number(beats[1]) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) current = parsed;
    return current;
  });
}

export function buildMetronomeBeats(
  timemap: MeasureTimemapEntry[],
  beatsByMeasure: number[],
): MetronomeBeat[] {
  const fallback = beatsByMeasure.find((value) => value > 0) ?? 4;
  const beats: MetronomeBeat[] = [];
  timemap.forEach((entry, index) => {
    const start = entry.timestamp ?? 0;
    let duration = entry.duration ?? 0;
    if (duration <= 0 && timemap[index + 1]) {
      duration = (timemap[index + 1]?.timestamp ?? start) - start;
    }
    const count = Math.max(1, Math.round(beatsByMeasure[index] ?? fallback));
    if (duration <= 0) {
      beats.push({ id: beats.length, songMs: start, accent: true });
      return;
    }
    const beatMs = duration / count;
    for (let step = 0; step < count; step += 1) {
      beats.push({
        id: beats.length,
        songMs: start + step * beatMs,
        accent: step === 0,
      });
    }
  });
  return beats;
}

/** Próximos cliques ainda não agendados, na janela do relógio da música. */
export function metronomeBeatsDue(
  beats: MetronomeBeat[],
  positionMs: number,
  playbackRate: number,
  scheduled: ReadonlySet<number>,
): MetronomeBeat[] {
  const rate = Math.max(0.25, playbackRate);
  const earliest = positionMs - LATE_MS * rate;
  const horizon = positionMs + LOOKAHEAD_MS * rate;
  return beats.filter(
    (beat) =>
      beat.songMs >= earliest && beat.songMs <= horizon && !scheduled.has(beat.id),
  );
}

export function metronomePositionJumped(previousMs: number | null, nextMs: number): boolean {
  if (previousMs == null) return false;
  return nextMs < previousMs - 40;
}

/** Atraso em segundos no AudioContext a partir da posição atual da música. */
export function metronomeClickDelaySeconds(
  songMs: number,
  positionMs: number,
  playbackRate: number,
): number {
  const rate = Math.max(0.25, playbackRate);
  return Math.max(0, (songMs - positionMs) / rate / 1000);
}

/** Clique curto na saída do mesmo AudioContext do player, fora do volume da música. */
export function playMetronomeClick(
  context: AudioContext,
  when: number,
  accent: boolean,
): () => void {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = accent ? 1400 : 1000;
  const peak = accent ? 0.34 : 0.22;
  gain.gain.setValueAtTime(peak, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(when);
  osc.stop(when + 0.08);
  return () => {
    try {
      osc.stop();
    } catch {
      /* o clique já terminou */
    }
  };
}
