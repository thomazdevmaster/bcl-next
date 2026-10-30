'use client';

import { useCallback, useRef } from 'react';
import { frequencyFromMidi } from '@/lib/music/pitch';

const DEFAULT_DURATION_MS = 520;
/** Duração confortável ao confirmar acerto em jogos de nota. */
export const GAME_NOTE_DURATION_MS = 1200;
const DEFAULT_GAIN = 0.12;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

/** Toca uma nota (seno) via Web Audio — reutilizável em jogos e exercícios. */
export function useNotePlayer() {
  const contextRef = useRef<AudioContext | null>(null);

  const playMidi = useCallback(
    (midi: number, durationMs = DEFAULT_DURATION_MS) => {
      const ctx = contextRef.current ?? getAudioContext();
      if (!ctx) return;
      contextRef.current = ctx;
      void ctx.resume();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequencyFromMidi(midi);
      gain.gain.value = DEFAULT_GAIN;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const stopAt = ctx.currentTime + durationMs / 1000;
      const attack = 0.035;
      const releaseStart = Math.max(attack, durationMs / 1000 - 0.22);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(DEFAULT_GAIN, ctx.currentTime + attack);
      gain.gain.setValueAtTime(DEFAULT_GAIN, ctx.currentTime + releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.001, stopAt);
      oscillator.start();
      oscillator.stop(stopAt + 0.08);
    },
    [],
  );

  const playFrequency = useCallback(
    (frequencyHz: number, durationMs = DEFAULT_DURATION_MS) => {
      const midi = 69 + 12 * Math.log2(frequencyHz / 440);
      playMidi(midi, durationMs);
    },
    [playMidi],
  );

  const playTone = useCallback(
    (
      frequencyHz: number,
      durationMs: number,
      type: OscillatorType = 'sine',
      gainLevel = DEFAULT_GAIN,
    ) => {
      const ctx = contextRef.current ?? getAudioContext();
      if (!ctx) return;
      contextRef.current = ctx;
      void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequencyHz;
      gain.gain.value = gainLevel;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const stopAt = ctx.currentTime + durationMs / 1000;
      gain.gain.exponentialRampToValueAtTime(0.001, stopAt);
      oscillator.start();
      oscillator.stop(stopAt + 0.05);
    },
    [],
  );

  /** Som de erro (grave, marcante) — não confundir com a nota da partitura. */
  const playWrongFeedback = useCallback(() => {
    playTone(196, 90, 'square', 0.1);
    window.setTimeout(() => playTone(146.8, 140, 'sawtooth', 0.09), 95);
  }, [playTone]);

  return { playMidi, playFrequency, playWrongFeedback };
}
