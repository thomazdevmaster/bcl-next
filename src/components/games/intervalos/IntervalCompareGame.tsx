'use client';

import { useCallback, useEffect, useState } from 'react';
import { IntervalGameFrame } from '@/components/games/intervalos/IntervalGameFrame';
import { IntervalPairStaff } from '@/components/games/intervalos/IntervalPairStaff';
import { useIntervalProgress } from '@/components/games/intervalos/useIntervalProgress';
import { INTERVAL_COMPARE_HELP } from '@/domains/games/intervalos/intervalHelp';
import {
  INTERVAL_COMPARE_STORAGE_KEY,
  compareWinner,
  pickIntervalComparison,
  type IntervalCompareWinner,
  type IntervalComparison,
  type IntervalLevel,
} from '@/domains/games/intervalos/intervals';
import { useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

const CHOICES: Array<{ id: IntervalCompareWinner; label: string; key: string }> = [
  { id: 'left', label: 'Primeiro', key: '1' },
  { id: 'right', label: 'Segundo', key: '2' },
  { id: 'tie', label: 'Iguais', key: '3' },
];

export function IntervalCompareGame() {
  const progress = useIntervalProgress(INTERVAL_COMPARE_STORAGE_KEY);
  const { playWrongFeedback } = useNotePlayer();
  const [pair, setPair] = useState<IntervalComparison | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: IntervalLevel) => {
    setPair(pickIntervalComparison(level));
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || pair) return;
    nextQuestion(progress.level);
  }, [nextQuestion, pair, progress.level, progress.ready]);

  const answer = useCallback(
    (choice: IntervalCompareWinner) => {
      if (!pair || feedback !== 'idle') return;
      const correct = choice === compareWinner(pair);
      setFeedback(correct ? 'correct' : 'wrong');
      if (!correct) playWrongFeedback();
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 800 : 1100);
    },
    [feedback, nextQuestion, pair, playWrongFeedback, progress],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (feedback !== 'idle') return;
      const choice = CHOICES.find((item) => item.key === event.key);
      if (choice) answer(choice.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, feedback]);

  const winner = pair ? compareWinner(pair) : null;

  return (
    <IntervalGameFrame
      title="Qual é maior"
      helpTitle="Como jogar — Qual é maior"
      helpDescription="Compare a largura de dois intervalos"
      help={INTERVAL_COMPARE_HELP}
      level={progress.level}
      levelLocked={feedback !== 'idle'}
      onChangeLevel={(level) => {
        if (level === progress.level) return;
        progress.changeLevel(level);
        nextQuestion(level);
      }}
      streak={progress.streak}
      best={progress.best}
    >
      <div
        className={`space-y-3 rounded-2xl border bg-[var(--card)] px-3 py-4 shadow-[var(--shadow-soft)] ${
          feedback === 'correct'
            ? 'border-[var(--color-brand)]/50'
            : feedback === 'wrong'
              ? 'border-[var(--destructive)]/40'
              : 'border-[var(--border)]'
        }`}
      >
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Qual intervalo é mais largo?
        </p>
        {pair ? (
          <div className="space-y-2">
            {([
              ['left', 'Primeiro', pair.left],
              ['right', 'Segundo', pair.right],
            ] as const).map(([side, label, example]) => {
              const marked = feedback !== 'idle' && (winner === side || winner === 'tie');
              return (
                <div
                  key={side}
                  className={`rounded-xl border px-1 py-1 ${
                    marked ? 'border-[var(--color-brand)]' : 'border-[var(--border)]'
                  }`}
                >
                  <p className="px-2 text-xs font-medium text-[var(--muted)]">
                    {label}
                    {feedback !== 'idle' ? ` · ${example.interval.label}` : ''}
                  </p>
                  <IntervalPairStaff
                    compact
                    lower={example.lower}
                    upperStep={example.upper.staffStep}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          {CHOICES.map((choice) => {
            const revealed = feedback !== 'idle' && winner === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={feedback !== 'idle'}
                onClick={() => answer(choice.id)}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-1 text-sm font-semibold disabled:opacity-80 ${
                  revealed
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'idle'
            ? 'Escolha o intervalo mais largo.'
            : feedback === 'correct'
              ? 'Resposta correta.'
              : 'Resposta incorreta.'}
        </p>
      </div>
    </IntervalGameFrame>
  );
}
