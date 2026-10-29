"use client";

import { useCallback, useRef } from "react";

import type { RhythmFigure } from "@/domains/games/ritmos/rhythmFigures";

/** Semínima ≈ 125 bpm — tempo em que a duração da figura ainda cabe na tela. */
export const RHYTHM_BEAT_MS = 480;

/** Sol₄: região confortável de um saxofone, uma altura só para ouvir o ritmo. */
const SAX_HZ = 392;
const SAX_GAIN = 0.09;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function scheduleClick(
  ctx: AudioContext,
  time: number,
  frequencyHz: number,
  durationSec: number,
  gainLevel: number,
): OscillatorNode {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequencyHz;
  gain.gain.setValueAtTime(gainLevel, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(time);
  oscillator.stop(time + durationSec + 0.02);
  return oscillator;
}

/** Quanto a nota soa, em segundos, já com um respiro curto antes da próxima. */
export function rhythmToneSeconds(
  beats: number,
  beatMs = RHYTHM_BEAT_MS,
): number {
  const raw = beats * (beatMs / 1000);
  const gap = Math.min(0.045, raw * 0.18);
  return Math.max(0.05, raw - gap);
}

/**
 * Nota sustentada (serra + filtro grave), no tempo da figura.
 * O ataque é curto; o corpo segura até o fim do valor.
 */
function scheduleSax(
  ctx: AudioContext,
  time: number,
  durationSec: number,
): OscillatorNode {
  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(SAX_HZ, time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(720, time);
  filter.frequency.exponentialRampToValueAtTime(
    1600,
    time + Math.min(0.08, durationSec * 0.35),
  );
  filter.Q.value = 0.7;
  const attack = Math.min(0.04, durationSec * 0.3);
  const release = Math.min(0.09, durationSec * 0.28);
  const holdUntil = Math.max(time + attack, time + durationSec - release);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(SAX_GAIN, time + attack);
  gain.gain.setValueAtTime(SAX_GAIN, holdUntil);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + durationSec);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(time);
  oscillator.stop(time + durationSec + 0.03);
  return oscillator;
}

const BAR_BEATS = 4;

function scheduleMetronome(
  ctx: AudioContext,
  start: number,
  beatSec: number,
  beats = BAR_BEATS,
): OscillatorNode[] {
  const nodes: OscillatorNode[] = [];
  for (let beat = 0; beat < beats; beat += 1) {
    const downbeat = beat % BAR_BEATS === 0;
    nodes.push(
      scheduleClick(
        ctx,
        start + beat * beatSec,
        downbeat ? 680 : 520,
        0.05,
        downbeat ? 0.07 : 0.045,
      ),
    );
  }
  return nodes;
}

export interface PlayRhythmOptions {
  /**
   * Ditado: um compasso só com o metrônomo e o seguinte com o metrônomo
   * junto das figuras.
   */
  countIn?: boolean;
  beatMs?: number;
  /** Silêncio extra, em tempos, entre uma figura e a seguinte. */
  gapBeats?: number;
}

/** Figuras no tempo delas: nota sustentada; pausa fica em silêncio. */
export function useRhythmPlayer() {
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<OscillatorNode[]>([]);

  const sustainRef = useRef<{
    oscillator: OscillatorNode;
    gain: GainNode;
  } | null>(null);

  const stopSustain = useCallback(() => {
    const live = sustainRef.current;
    const ctx = contextRef.current;
    sustainRef.current = null;
    if (!live || !ctx) return;
    const now = ctx.currentTime;
    try {
      live.gain.gain.cancelScheduledValues(now);
      live.gain.gain.setValueAtTime(
        Math.max(live.gain.gain.value, 0.0001),
        now,
      );
      live.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      live.oscillator.stop(now + 0.07);
    } catch {
      /* já encerrado */
    }
  }, []);

  const startSustain = useCallback(() => {
    if (sustainRef.current) return;
    const ctx = contextRef.current ?? getAudioContext();
    if (!ctx) return;
    contextRef.current = ctx;
    void ctx.resume();
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(SAX_HZ, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(720, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(SAX_GAIN, now + 0.03);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    sustainRef.current = { oscillator, gain };
  }, []);

  const stop = useCallback(() => {
    stopSustain();
    for (const node of nodesRef.current) {
      try {
        node.stop();
      } catch {
        /* já encerrado */
      }
    }
    nodesRef.current = [];
  }, [stopSustain]);

  const playFigures = useCallback(
    (figures: RhythmFigure[], options: PlayRhythmOptions = {}) => {
      const ctx = contextRef.current ?? getAudioContext();
      if (!ctx) return null;
      contextRef.current = ctx;
      void ctx.resume();
      stop();

      const beatMs = options.beatMs ?? RHYTHM_BEAT_MS;
      const beatSec = beatMs / 1000;
      const gapBeats = options.gapBeats ?? 0;
      const start = ctx.currentTime + 0.05;
      const nodes: OscillatorNode[] = [];
      let cursor = start;

      if (options.countIn) {
        nodes.push(...scheduleMetronome(ctx, start, beatSec));
        cursor = start + BAR_BEATS * beatSec;
        const patternBeats = figures.reduce(
          (sum, figure) => sum + figure.beats,
          0,
        );
        const clicks = Math.max(1, Math.round(patternBeats));
        nodes.push(...scheduleMetronome(ctx, cursor, beatSec, clicks));
      }

      const patternStart = cursor;
      for (const figure of figures) {
        if (!figure.rest) {
          nodes.push(
            scheduleSax(ctx, cursor, rhythmToneSeconds(figure.beats, beatMs)),
          );
        }
        cursor += figure.beats * beatSec + gapBeats * beatSec;
      }
      nodesRef.current = nodes;
      return patternStart;
    },
    [stop],
  );

  /** Metrônomo do compasso, sem o sopro. O som da nota fica no aperto do botão. */
  const playMetronome = useCallback(
    (
      patternBeats: number,
      options: { countIn?: boolean; beatMs?: number } = {},
    ) => {
      const ctx = contextRef.current ?? getAudioContext();
      if (!ctx) return null;
      contextRef.current = ctx;
      void ctx.resume();
      stop();

      const beatMs = options.beatMs ?? RHYTHM_BEAT_MS;
      const beatSec = beatMs / 1000;
      const start = ctx.currentTime + 0.05;
      const nodes: OscillatorNode[] = [];
      let cursor = start;

      if (options.countIn) {
        nodes.push(...scheduleMetronome(ctx, start, beatSec));
        cursor = start + BAR_BEATS * beatSec;
      }

      const clicks = Math.max(1, Math.ceil(patternBeats - 0.001));
      nodes.push(...scheduleMetronome(ctx, cursor, beatSec, clicks));
      nodesRef.current = nodes;
      return cursor;
    },
    [stop],
  );

  const playBar = useCallback(
    (figures: RhythmFigure[], beatMs = RHYTHM_BEAT_MS) => {
      playFigures(figures, { countIn: true, beatMs });
    },
    [playFigures],
  );

  const playSuccess = useCallback(() => {
    const ctx = contextRef.current ?? getAudioContext();
    if (!ctx) return;
    contextRef.current = ctx;
    void ctx.resume();
    scheduleClick(ctx, ctx.currentTime + 0.02, 660, 0.08, 0.07);
  }, []);

  const getTime = useCallback(
    () => contextRef.current?.currentTime ?? null,
    [],
  );

  return {
    playFigures,
    playBar,
    playMetronome,
    startSustain,
    stopSustain,
    playSuccess,
    stop,
    getTime,
  };
}
