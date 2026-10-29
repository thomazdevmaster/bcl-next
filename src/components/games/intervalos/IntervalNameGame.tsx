'use client';

import { useCallback, useEffect, useState } from 'react';
import { IntervalGameFrame } from '@/components/games/intervalos/IntervalGameFrame';
import { IntervalPairStaff } from '@/components/games/intervalos/IntervalPairStaff';
import { useIntervalProgress } from '@/components/games/intervalos/useIntervalProgress';
import { INTERVAL_NAME_HELP } from '@/domains/games/intervalos/intervalHelp';
import {
  INTERVAL_NAME_STORAGE_KEY,
  intervalChoices,
  pickIntervalExample,
  type IntervalDefinition,
  type IntervalExample,
  type IntervalLevel,
} from '@/domains/games/intervalos/intervals';
import { useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

interface Question {
  example: IntervalExample;
  options: IntervalDefinition[];
}

export function IntervalNameGame() {
  const progress = useIntervalProgress(INTERVAL_NAME_STORAGE_KEY);
  const { playMidi, playWrongFeedback } = useNotePlayer();
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: IntervalLevel) => {
    const example = pickIntervalExample(level);
    setQuestion({ example, options: intervalChoices(example.interval, level) });
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || question) return;
    nextQuestion(progress.level);
  }, [nextQuestion, progress.level, progress.ready, question]);

  const answer = useCallback(
    (choice: IntervalDefinition) => {
      if (!question || feedback !== 'idle') return;
      const correct = choice.id === question.example.interval.id;
      setFeedback(correct ? 'correct' : 'wrong');
      if (correct) {
        playMidi(question.example.lower.midi, 420);
        window.setTimeout(() => playMidi(question.example.upper.midi, 640), 460);
      } else {
        playWrongFeedback();
      }
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 1100 : 1000);
    },
    [feedback, nextQuestion, playMidi, playWrongFeedback, progress, question],
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

  return (
    <IntervalGameFrame
      title="Nomeie"
      helpTitle="Como jogar — Nomeie"
      helpDescription="Leia o intervalo na pauta"
      help={INTERVAL_NAME_HELP}
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
          Qual é o intervalo ascendente?
        </p>
        {question ? (
          <IntervalPairStaff
            className="mt-2"
            lower={question.example.lower}
            upperStep={question.example.upper.staffStep}
          />
        ) : null}
        {feedback !== 'idle' && question ? (
          <p className="text-center text-sm font-semibold">{question.example.interval.label}</p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {question?.options.map((option, index) => {
            const revealed = feedback !== 'idle' && option.id === question.example.interval.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={feedback !== 'idle'}
                onClick={() => answer(option)}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-2 text-sm font-semibold disabled:opacity-80 ${
                  revealed
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                {option.label}
                <span className="ml-1 text-xs font-normal text-[var(--muted)]">{index + 1}</span>
              </button>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. O intervalo era ${question?.example.interval.label ?? ''}.`
              : 'Escolha o intervalo.'}
        </p>
      </div>
    </IntervalGameFrame>
  );
}
