'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  readIntervalLevelStats,
  writeIntervalLevelStats,
  type IntervalLevel,
} from '@/domains/games/intervalos/intervals';

export function useIntervalProgress(storageKey: string) {
  const [level, setLevel] = useState<IntervalLevel>('facil');
  const [bestByLevel, setBestByLevel] = useState<Record<IntervalLevel, number>>({
    facil: 0,
    medio: 0,
    dificil: 0,
  });
  const [streak, setStreak] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stats = readIntervalLevelStats(storageKey);
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    setReady(true);
  }, [storageKey]);

  const changeLevel = useCallback(
    (next: IntervalLevel) => {
      if (next === level) return;
      setLevel(next);
      setStreak(0);
      writeIntervalLevelStats(storageKey, {
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
      writeIntervalLevelStats(storageKey, {
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
