'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  readRhythmLevelStats,
  writeRhythmLevelStats,
  type RhythmLevel,
} from '@/domains/games/ritmos/rhythmFigures';

export function useRhythmProgress(storageKey: string) {
  const [level, setLevel] = useState<RhythmLevel>('facil');
  const [bestByLevel, setBestByLevel] = useState<Record<RhythmLevel, number>>({
    facil: 0,
    medio: 0,
    dificil: 0,
  });
  const [streak, setStreak] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stats = readRhythmLevelStats(storageKey);
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    setReady(true);
  }, [storageKey]);

  const changeLevel = useCallback(
    (next: RhythmLevel) => {
      if (next === level) return;
      setLevel(next);
      setStreak(0);
      writeRhythmLevelStats(storageKey, {
        selectedLevel: next,
        bestStreakByLevel: bestByLevel,
      });
    },
    [bestByLevel, level, storageKey],
  );

  const applyResult = useCallback(
    (correct: boolean) => {
      if (!correct) {
        setStreak(0);
        return;
      }
      const nextStreak = streak + 1;
      const nextBest = {
        ...bestByLevel,
        [level]: Math.max(bestByLevel[level], nextStreak),
      };
      setStreak(nextStreak);
      setBestByLevel(nextBest);
      writeRhythmLevelStats(storageKey, {
        selectedLevel: level,
        bestStreakByLevel: nextBest,
      });
    },
    [bestByLevel, level, storageKey, streak],
  );

  return {
    level,
    streak,
    best: bestByLevel[level],
    ready,
    changeLevel,
    applyResult,
  };
}
