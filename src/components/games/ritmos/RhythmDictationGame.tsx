'use client';

import { useCallback, useEffect, useState } from 'react';
import { RhythmGameFrame } from '@/components/games/ritmos/RhythmGameFrame';
import { RhythmStaff } from '@/components/games/ritmos/RhythmStaff';
import { useRhythmProgress } from '@/components/games/ritmos/useRhythmProgress';
import { RHYTHM_DICTATION_HELP } from '@/domains/games/ritmos/rhythmHelp';
import {
  RHYTHM_DICTATION_STORAGE_KEY,
  barSignature,
  buildRhythmDictation,
  type RhythmDictation,
  type RhythmLevel,
} from '@/domains/games/ritmos/rhythmFigures';
import { useNotePlayer } from '@/lib/music/useNotePlayer';
import { useRhythmPlayer } from '@/lib/music/useRhythmPlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

export function RhythmDictationGame() {
  const progress = useRhythmProgress(RHYTHM_DICTATION_STORAGE_KEY);
  const { playWrongFeedback } = useNotePlayer();
  const { playBar, stop } = useRhythmPlayer();
  const [question, setQuestion] = useState<RhythmDictation | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback(
    (level: RhythmLevel) => {
      const next = buildRhythmDictation(level);
      setQuestion(next);
      setFeedback('idle');
      playBar(next.pattern);
    },
    [playBar],
  );

  useEffect(() => {
    if (!progress.ready || question) return;
    nextQuestion(progress.level);
  }, [nextQuestion, progress.level, progress.ready, question]);

  useEffect(() => () => stop(), [stop]);

  const answer = useCallback(
    (index: number) => {
      if (!question || feedback !== 'idle') return;
      const chosen = question.options[index];
      if (!chosen) return;
      const correct = barSignature(chosen) === barSignature(question.pattern);
      setFeedback(correct ? 'correct' : 'wrong');
      if (!correct) playWrongFeedback();
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 900 : 1200);
    },
    [feedback, nextQuestion, playWrongFeedback, progress, question],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (feedback !== 'idle') return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 3) answer(index);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, feedback]);

  const correctKey = question ? barSignature(question.pattern) : '';

  return (
    <RhythmGameFrame
      title="Ouça o ritmo"
      helpTitle="Como jogar — Ouça o ritmo"
      helpDescription="Ditado de um compasso"
      help={RHYTHM_DICTATION_HELP}
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
        className={`space-y-3 rounded-2xl border bg-[var(--card)] px-3 py-4 text-[var(--foreground)] shadow-[var(--shadow-soft)] ${
          feedback === 'correct'
            ? 'border-[var(--color-brand)]/50'
            : feedback === 'wrong'
              ? 'border-[var(--destructive)]/40'
              : 'border-[var(--border)]'
        }`}
      >
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Quatro cliques de contagem, depois o ritmo
        </p>
        <button
          type="button"
          className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-semibold"
          onClick={() => {
            if (question) playBar(question.pattern);
          }}
        >
          <span className="material-icons text-xl" aria-hidden>
            volume_up
          </span>
          Ouvir de novo
        </button>
        <div className="space-y-1.5">
          {question?.options.map((option, index) => {
            const revealed = feedback !== 'idle' && barSignature(option) === correctKey;
            return (
              <button
                key={barSignature(option)}
                type="button"
                disabled={feedback !== 'idle'}
                onClick={() => answer(index)}
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-2 py-1 text-left disabled:opacity-90 ${
                  revealed
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-[var(--muted)]">
                  {index + 1}
                </span>
                <RhythmStaff figures={option} compact className="min-w-0 flex-1" />
              </button>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? 'Resposta incorreta. A pauta certa foi destacada.'
              : 'Escolha a pauta do ritmo ouvido.'}
        </p>
      </div>
    </RhythmGameFrame>
  );
}
