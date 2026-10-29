'use client';

import { useCallback, useEffect, useState } from 'react';
import { RhythmGameFrame } from '@/components/games/ritmos/RhythmGameFrame';
import { RhythmGlyph } from '@/components/games/ritmos/RhythmGlyph';
import { useRhythmProgress } from '@/components/games/ritmos/useRhythmProgress';
import { RHYTHM_FIGURES_HELP } from '@/domains/games/ritmos/rhythmHelp';
import {
  RHYTHM_FIGURES_STORAGE_KEY,
  figureChoices,
  pickRhythmFigure,
  type RhythmFigure,
  type RhythmLevel,
} from '@/domains/games/ritmos/rhythmFigures';
import { useNotePlayer } from '@/lib/music/useNotePlayer';
import { useRhythmPlayer } from '@/lib/music/useRhythmPlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

interface Question {
  answer: RhythmFigure;
  options: RhythmFigure[];
}

export function RhythmFiguresGame() {
  const progress = useRhythmProgress(RHYTHM_FIGURES_STORAGE_KEY);
  const { playWrongFeedback } = useNotePlayer();
  const { playFigures, playSuccess, stop } = useRhythmPlayer();
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback(
    (level: RhythmLevel) => {
      const answer = pickRhythmFigure(level);
      setQuestion({ answer, options: figureChoices(answer, level) });
      setFeedback('idle');
      playFigures([answer]);
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
      window.setTimeout(() => nextQuestion(progress.level), correct ? 700 : 900);
    },
    [feedback, nextQuestion, playSuccess, playWrongFeedback, progress, question],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!question || feedback !== 'idle') return;
      const index = Number(event.key) - 1;
      const option = question.options[index];
      if (option) answer(option);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, feedback, question]);

  return (
    <RhythmGameFrame
      title="Figuras"
      helpTitle="Como jogar — Figuras"
      helpDescription="Nome da figura rítmica"
      help={RHYTHM_FIGURES_HELP}
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
          Qual é o nome desta figura?
        </p>
        <button
          type="button"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-semibold"
          onClick={() => {
            if (question) playFigures([question.answer]);
          }}
        >
          <span className="material-icons text-xl" aria-hidden>
            volume_up
          </span>
          Ouvir de novo
        </button>
        <div className="mt-2 flex justify-center text-[var(--foreground)]">
          {question ? (
            <RhythmGlyph figure={question.answer} />
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {question?.options.map((option, index) => {
            const revealed = feedback !== 'idle' && option.id === question.answer.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={feedback !== 'idle'}
                onClick={() => answer(option)}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold disabled:opacity-80 ${
                  revealed
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                  {index + 1}
                </span>
              </button>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. A figura era ${question?.answer.label ?? ''}.`
              : 'Escolha o nome da figura.'}
        </p>
      </div>
    </RhythmGameFrame>
  );
}
