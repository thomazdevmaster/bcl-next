'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  InstrumentGameFrame,
  choiceClass,
  instrumentCardClass,
} from '@/components/games/instrumentos/InstrumentGameFrame';
import { useInstrumentProgress } from '@/components/games/instrumentos/useInstrumentProgress';
import { INSTRUMENT_METHOD_HELP } from '@/domains/games/instrumentos/instrumentHelp';
import {
  INSTRUMENT_METHOD_STORAGE_KEY,
  methodChoices,
  methodLabel,
  pickInstrument,
  type BandInstrument,
  type InstrumentLevel,
  type PlayMethodId,
} from '@/domains/games/instrumentos/bandInstruments';

type Feedback = 'idle' | 'correct' | 'wrong';

interface Question {
  instrument: BandInstrument;
  options: PlayMethodId[];
}

export function InstrumentMethodGame() {
  const progress = useInstrumentProgress(INSTRUMENT_METHOD_STORAGE_KEY);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: InstrumentLevel) => {
    const instrument = pickInstrument(level);
    setQuestion({ instrument, options: methodChoices(instrument, level) });
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || question) return;
    nextQuestion(progress.level);
  }, [nextQuestion, progress.level, progress.ready, question]);

  const answer = useCallback(
    (method: PlayMethodId) => {
      if (!question || feedback !== 'idle') return;
      const correct = method === question.instrument.method;
      setFeedback(correct ? 'correct' : 'wrong');
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 700 : 1000);
    },
    [feedback, nextQuestion, progress, question],
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
    <InstrumentGameFrame
      title="Como se toca"
      helpTitle="Como jogar — Como se toca"
      helpDescription="Como o instrumento produz o som"
      help={INSTRUMENT_METHOD_HELP}
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
      <div className={instrumentCardClass(feedback)}>
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Como este instrumento produz o som?
        </p>
        <p className="mt-2 text-center text-2xl font-semibold tracking-tight">
          {question?.instrument.name}
        </p>
        {feedback !== 'idle' && question ? (
          <p className="mt-1 text-center text-sm font-medium text-[var(--muted)]">
            {methodLabel(question.instrument.method)}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {question?.options.map((method, index) => (
            <button
              key={method}
              type="button"
              disabled={feedback !== 'idle'}
              onClick={() => answer(method)}
              className={choiceClass(
                feedback !== 'idle' && method === question.instrument.method,
              )}
            >
              {methodLabel(method)}
              <span className="ml-1 text-xs font-normal text-[var(--muted)]">{index + 1}</span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. A forma era ${question ? methodLabel(question.instrument.method) : ''}.`
              : 'Escolha como o instrumento se toca.'}
        </p>
      </div>
    </InstrumentGameFrame>
  );
}
