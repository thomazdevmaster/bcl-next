'use client';

import { useCallback, useRef } from 'react';
import type { RhythmFigure } from '@/domains/games/ritmos/rhythmFigures';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  oscillator.type = 'square';
  oscillator.frequency.value = frequencyHz;
  gain.gain.setValueAtTime(gainLevel, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(time);
  oscillator.stop(time + durationSec + 0.02);
  return oscillator;
}

/** Cliques de compasso: contagem em 4 e ataques das figuras. */
export function useRhythmPlayer() {
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<OscillatorNode[]>([]);

  const stop = useCallback(() => {
    for (const node of nodesRef.current) {
      try {
        node.stop();
      } catch {
        /* já encerrado */
      }
    }
    nodesRef.current = [];
  }, []);

  const playBar = useCallback(
    (figures: RhythmFigure[], beatMs = 480) => {
      const ctx = contextRef.current ?? getAudioContext();
      if (!ctx) return;
      contextRef.current = ctx;
      void ctx.resume();
      stop();

      const beatSec = beatMs / 1000;
      const start = ctx.currentTime + 0.06;
      const nodes: OscillatorNode[] = [];
      for (let index = 0; index < 4; index += 1) {
        nodes.push(scheduleClick(ctx, start + index * beatSec, 520, 0.05, 0.05));
      }
      let cursor = start + 4 * beatSec + 0.08;
      for (const figure of figures) {
        if (!figure.rest) {
          nodes.push(scheduleClick(ctx, cursor, 880, 0.07, 0.08));
        }
        cursor += figure.beats * beatSec;
      }
      nodesRef.current = nodes;
    },
    [stop],
  );

  const playSuccess = useCallback(() => {
    const ctx = contextRef.current ?? getAudioContext();
    if (!ctx) return;
    contextRef.current = ctx;
    void ctx.resume();
    scheduleClick(ctx, ctx.currentTime + 0.02, 660, 0.08, 0.07);
  }, []);

  return { playBar, playSuccess, stop };
}
