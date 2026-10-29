'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameHelpBody } from '@/components/games/GameHelpDialog';
import { GamePlayHeader } from '@/components/games/GamePlayHeader';
import { TrebleStaffPair } from '@/components/games/notas/TrebleStaffPair';
import { TREBLE_HIGHER_NOTE_HELP } from '@/domains/games/notas/trebleNaturalsGameHelp';
import {
  TREBLE_HIGHER_NOTE_STORAGE_KEY,
  TREBLE_NATURAL_LEVELS,
  higherTrebleSide,
  pickTrebleNaturalPair,
  readTrebleGameLevelStats,
  writeTrebleGameLevelStats,
  type TrebleNaturalNote,
  type TrebleNaturals1Level,
  type TreblePairSide,
} from '@/domains/games/notas/trebleNaturals1Notes';
import { GAME_NOTE_DURATION_MS, useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

export function TrebleHigherNoteGame() {
  const { playMidi, playWrongFeedback } = useNotePlayer();
  const [level, setLevel] = useState<TrebleNaturals1Level>('medio');
  const [bestByLevel, setBestByLevel] = useState<
    Record<TrebleNaturals1Level, number>
  >({ facil: 0, medio: 0, dificil: 0 });
  const [pair, setPair] = useState<
    [TrebleNaturalNote, TrebleNaturalNote] | null
  >(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [chosen, setChosen] = useState<TreblePairSide | null>(null);
  const [streak, setStreak] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const levelMeta = TREBLE_NATURAL_LEVELS.find((item) => item.id === level)!;
  const bestStreak = bestByLevel[level];
  const higher = pair ? higherTrebleSide(pair[0], pair[1]) : 'left';

  const persist = useCallback(
    (
      nextLevel: TrebleNaturals1Level,
      nextBest: Record<TrebleNaturals1Level, number>,
    ) => {
      writeTrebleGameLevelStats(TREBLE_HIGHER_NOTE_STORAGE_KEY, {
        selectedLevel: nextLevel,
        bestStreakByLevel: nextBest,
      });
    },
    [],
  );

  const nextQuestion = useCallback((activeLevel: TrebleNaturals1Level) => {
    setFeedback('idle');
    setChosen(null);
    setPair(pickTrebleNaturalPair(activeLevel));
  }, []);

  useEffect(() => {
    const stats = readTrebleGameLevelStats(TREBLE_HIGHER_NOTE_STORAGE_KEY);
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    setPair(pickTrebleNaturalPair(stats.selectedLevel));
    setReduceMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  const changeLevel = (next: TrebleNaturals1Level) => {
    if (next === level || feedback !== 'idle') return;
    setLevel(next);
    setStreak(0);
    nextQuestion(next);
    persist(next, bestByLevel);
  };

  const handlePick = useCallback(
    (side: TreblePairSide) => {
      if (!pair || feedback !== 'idle') return;
      const correctSide = higherTrebleSide(pair[0], pair[1]);
      const correct = side === correctSide;
      setChosen(side);

      if (correct) {
        const winner = correctSide === 'left' ? pair[0] : pair[1];
        playMidi(winner.midi, GAME_NOTE_DURATION_MS);
        const nextStreak = streak + 1;
        const nextBestByLevel = {
          ...bestByLevel,
          [level]: Math.max(bestByLevel[level], nextStreak),
        };
        setFeedback('correct');
        setStreak(nextStreak);
        setBestByLevel(nextBestByLevel);
        persist(level, nextBestByLevel);
      } else {
        playWrongFeedback();
        setFeedback('wrong');
        setStreak(0);
      }

      const delay = reduceMotion
        ? 0
        : correct
          ? GAME_NOTE_DURATION_MS + 180
          : 900;
      window.setTimeout(() => nextQuestion(level), delay);
    },
    [
      bestByLevel,
      feedback,
      level,
      nextQuestion,
      pair,
      persist,
      playMidi,
      playWrongFeedback,
      reduceMotion,
      streak,
    ],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (feedback !== 'idle') return;
      if (event.key === 'ArrowLeft' || event.key === '1') {
        event.preventDefault();
        handlePick('left');
      }
      if (event.key === 'ArrowRight' || event.key === '2') {
        event.preventDefault();
        handlePick('right');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [feedback, handlePick]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <GamePlayHeader
        categoryLine="Notas · Clave de sol"
        title="Mais aguda"
        backHref="/jogos/notas"
        helpTitle="Como jogar — Mais aguda"
        helpDescription="Compare duas colcheias na pauta"
        helpContent={<GameHelpBody sections={TREBLE_HIGHER_NOTE_HELP} />}
      />

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]" id="higher-level-label">
          Nível
        </p>
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-labelledby="higher-level-label"
        >
          {TREBLE_NATURAL_LEVELS.map((item) => {
            const selected = level === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={feedback !== 'idle'}
                onClick={() => changeLevel(item.id)}
                className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-2 text-sm font-medium transition disabled:opacity-60 ${
                  selected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--foreground)]'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--muted)]">{levelMeta.rangeHint}</p>
      </div>

      <div
        className={`rounded-2xl border bg-[var(--card)] px-2 py-3 shadow-[var(--shadow-soft)] ${
          feedback === 'correct'
            ? 'border-[var(--color-brand)]/50'
            : feedback === 'wrong'
              ? 'border-[var(--destructive)]/40'
              : 'border-[var(--border)]'
        }`}
      >
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Qual colcheia está mais aguda?
        </p>
        {pair ? (
          <TrebleStaffPair
            left={pair[0]}
            right={pair[1]}
            feedback={feedback}
            chosen={chosen}
            higher={higher}
            disabled={feedback !== 'idle'}
            onPick={handlePick}
          />
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={feedback !== 'idle'}
            onClick={() => handlePick('left')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold disabled:opacity-70"
          >
            Esquerda
          </button>
          <button
            type="button"
            disabled={feedback !== 'idle'}
            onClick={() => handlePick('right')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold disabled:opacity-70"
          >
            Direita
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? 'Resposta incorreta. A nota mais aguda foi destacada.'
              : 'Escolha a nota mais aguda.'}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-2.5 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Sequência</dt>
          <dd className="font-semibold">{streak}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Recorde</dt>
          <dd className="font-semibold">{bestStreak}</dd>
        </div>
      </dl>
    </div>
  );
}
