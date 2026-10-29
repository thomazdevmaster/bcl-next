'use client';

import { useCallback, useEffect, useState } from 'react';
import { RhythmGameFrame } from '@/components/games/ritmos/RhythmGameFrame';
import { RhythmGlyph } from '@/components/games/ritmos/RhythmGlyph';
import { useRhythmProgress } from '@/components/games/ritmos/useRhythmProgress';
import { RHYTHM_DURATION_HELP } from '@/domains/games/ritmos/rhythmHelp';
import {
  RHYTHM_DURATION_STORAGE_KEY,
  durationWinner,
  formatBeats,
  pickDurationPair,
  type DurationPair,
  type DurationWinner,
  type RhythmLevel,
} from '@/domains/games/ritmos/rhythmFigures';
import { useNotePlayer } from '@/lib/music/useNotePlayer';
import { useRhythmPlayer } from '@/lib/music/useRhythmPlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

const CHOICES: Array<{ id: DurationWinner; label: string; key: string }> = [
  { id: 'left', label: 'Esquerda', key: '1' },
  { id: 'right', label: 'Direita', key: '2' },
  { id: 'tie', label: 'Iguais', key: '3' },
];

export function RhythmDurationGame() {
  const progress = useRhythmProgress(RHYTHM_DURATION_STORAGE_KEY);
  const { playWrongFeedback } = useNotePlayer();
  const { playFigures, playSuccess, stop } = useRhythmPlayer();
  const [pair, setPair] = useState<DurationPair | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback(
    (level: RhythmLevel) => {
      const next = pickDurationPair(level);
      setPair(next);
      setFeedback('idle');
      playFigures([next.left, next.right], { gapBeats: 0.5 });
    },
    [playFigures],
  );

  useEffect(() => {
    if (!progress.ready || pair) return;
    nextQuestion(progress.level);
  }, [nextQuestion, pair, progress.level, progress.ready]);

  useEffect(() => () => stop(), [stop]);

  const answer = useCallback(
    (choice: DurationWinner) => {
      if (!pair || feedback !== 'idle') return;
      const correct = choice === durationWinner(pair);
      setFeedback(correct ? 'correct' : 'wrong');
      if (correct) playSuccess();
      else playWrongFeedback();
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 800 : 1100);
    },
    [feedback, nextQuestion, pair, playSuccess, playWrongFeedback, progress],
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

  const winner = pair ? durationWinner(pair) : null;

  return (
    <RhythmGameFrame
      title="Qual dura mais"
      helpTitle="Como jogar — Qual dura mais"
      helpDescription="Compare a duração de duas figuras"
      help={RHYTHM_DURATION_HELP}
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
        className={`rounded-2xl border bg-[var(--card)] px-3 py-4 shadow-[var(--shadow-soft)] ${
          feedback === 'correct'
            ? 'border-[var(--color-brand)]/50'
            : feedback === 'wrong'
              ? 'border-[var(--destructive)]/40'
              : 'border-[var(--border)]'
        }`}
      >
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Qual figura dura mais?
        </p>
        <button
          type="button"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-semibold"
          onClick={() => {
            if (pair) playFigures([pair.left, pair.right], { gapBeats: 0.5 });
          }}
        >
          <span className="material-icons text-xl" aria-hidden>
            volume_up
          </span>
          Ouvir de novo
        </button>
        {pair ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[var(--foreground)]">
            {(['left', 'right'] as const).map((side) => {
              const figure = pair[side];
              const marked = feedback !== 'idle' && winner === side;
              const tieMark = feedback !== 'idle' && winner === 'tie';
              return (
                <div
                  key={side}
                  className={`flex flex-col items-center rounded-xl border px-2 py-2 ${
                    marked || tieMark
                      ? 'border-[var(--color-brand)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <RhythmGlyph figure={figure} />
                  {feedback !== 'idle' ? (
                    <p className="text-xs text-[var(--muted)]">{formatBeats(figure.beats)}</p>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      {side === 'left' ? 'Esquerda' : 'Direita'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
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
            ? 'Escolha a figura mais longa.'
            : feedback === 'correct'
              ? 'Resposta correta.'
              : 'Resposta incorreta.'}
        </p>
      </div>
    </RhythmGameFrame>
  );
}
