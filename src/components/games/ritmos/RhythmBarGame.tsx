'use client';

import { useCallback, useEffect, useState } from 'react';
import { RhythmGameFrame } from '@/components/games/ritmos/RhythmGameFrame';
import { RhythmGlyph } from '@/components/games/ritmos/RhythmGlyph';
import { RhythmStaff } from '@/components/games/ritmos/RhythmStaff';
import { useRhythmProgress } from '@/components/games/ritmos/useRhythmProgress';
import { RHYTHM_BAR_HELP } from '@/domains/games/ritmos/rhythmHelp';
import {
  RHYTHM_BAR_BEATS,
  RHYTHM_BAR_STORAGE_KEY,
  buildBarCompletion,
  formatBeats,
  type BarCompletion,
  type RhythmFigure,
  type RhythmLevel,
} from '@/domains/games/ritmos/rhythmFigures';
import { useNotePlayer } from '@/lib/music/useNotePlayer';
import { useRhythmPlayer } from '@/lib/music/useRhythmPlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

export function RhythmBarGame() {
  const progress = useRhythmProgress(RHYTHM_BAR_STORAGE_KEY);
  const { playWrongFeedback } = useNotePlayer();
  const { playFigures, playSuccess, stop } = useRhythmPlayer();
  const [question, setQuestion] = useState<BarCompletion | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback(
    (level: RhythmLevel) => {
      const next = buildBarCompletion(level);
      setQuestion(next);
      setFeedback('idle');
      playFigures(next.prefix);
    },
    [playFigures],
  );

  useEffect(() => {
    if (!progress.ready || question) return;
    nextQuestion(progress.level);
  }, [nextQuestion, progress.level, progress.ready, question]);

  useEffect(() => () => stop(), [stop]);

  const answer = useCallback(
    (choice: RhythmFigure) => {
      if (!question || feedback !== 'idle') return;
      const correct = choice.id === question.answer.id;
      setFeedback(correct ? 'correct' : 'wrong');
      if (correct) playSuccess();
      else playWrongFeedback();
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 800 : 1100);
    },
    [feedback, nextQuestion, playSuccess, playWrongFeedback, progress, question],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!question || feedback !== 'idle') return;
      const option = question.options[Number(event.key) - 1];
      if (option) answer(option);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, feedback, question]);

  const missing = question
    ? Math.max(0, RHYTHM_BAR_BEATS - question.prefix.reduce((sum, figure) => sum + figure.beats, 0))
    : 0;

  return (
    <RhythmGameFrame
      title="Complete o compasso"
      helpTitle="Como jogar — Complete o compasso"
      helpDescription="Feche o compasso 4/4"
      help={RHYTHM_BAR_HELP}
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
        className={`rounded-2xl border bg-[var(--card)] px-3 py-4 text-[var(--foreground)] shadow-[var(--shadow-soft)] ${
          feedback === 'correct'
            ? 'border-[var(--color-brand)]/50'
            : feedback === 'wrong'
              ? 'border-[var(--destructive)]/40'
              : 'border-[var(--border)]'
        }`}
      >
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Qual figura completa os 4 tempos?
        </p>
        <button
          type="button"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-semibold"
          onClick={() => {
            if (question) playFigures(question.prefix);
          }}
        >
          <span className="material-icons text-xl" aria-hidden>
            volume_up
          </span>
          Ouvir de novo
        </button>
        {question ? (
          <RhythmStaff
            className="mt-2"
            figures={question.prefix}
            missingBeats={feedback === 'idle' ? missing : 0}
          />
        ) : null}
        {feedback !== 'idle' && question ? (
          <p className="text-center text-sm font-medium">
            {question.answer.label} · {formatBeats(question.answer.beats)}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {question?.options.map((option, index) => {
            const revealed = feedback !== 'idle' && option.id === question.answer.id;
            return (
              <button
                key={`${option.id}-${index}`}
                type="button"
                disabled={feedback !== 'idle'}
                onClick={() => answer(option)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold disabled:opacity-80 ${
                  revealed
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <RhythmGlyph figure={option} />
                <span className="text-left leading-tight">
                  {option.label}
                  <span className="mt-0.5 block text-[10px] font-normal text-[var(--muted)]">
                    {formatBeats(option.beats)} · {index + 1}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. Faltava ${question?.answer.label ?? ''}.`
              : 'Escolha a figura que completa o compasso.'}
        </p>
      </div>
    </RhythmGameFrame>
  );
}
