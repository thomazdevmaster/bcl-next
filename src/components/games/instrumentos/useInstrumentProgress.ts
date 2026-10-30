'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  readInstrumentLevelStats,
  writeInstrumentLevelStats,
  type InstrumentLevel,
} from '@/domains/games/instrumentos/bandInstruments';

export function useInstrumentProgress(storageKey: string) {
  const [level, setLevel] = useState<InstrumentLevel>('facil');
  const [bestByLevel, setBestByLevel] = useState<Record<InstrumentLevel, number>>({
    facil: 0,
    medio: 0,
    dificil: 0,
  });
  const [streak, setStreak] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stats = readInstrumentLevelStats(storageKey);
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    setReady(true);
  }, [storageKey]);

  const changeLevel = useCallback(
    (next: InstrumentLevel) => {
      if (next === level) return;
      setLevel(next);
      setStreak(0);
      writeInstrumentLevelStats(storageKey, {
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
      writeInstrumentLevelStats(storageKey, {
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
