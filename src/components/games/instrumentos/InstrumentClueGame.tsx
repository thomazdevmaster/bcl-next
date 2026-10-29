'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  InstrumentGameFrame,
  choiceClass,
  instrumentCardClass,
} from '@/components/games/instrumentos/InstrumentGameFrame';
import { useInstrumentProgress } from '@/components/games/instrumentos/useInstrumentProgress';
import { INSTRUMENT_CLUE_HELP } from '@/domains/games/instrumentos/instrumentHelp';
import {
  INSTRUMENT_CLUE_STORAGE_KEY,
  nameChoices,
  pickInstrument,
  type BandInstrument,
  type InstrumentLevel,
} from '@/domains/games/instrumentos/bandInstruments';

type Feedback = 'idle' | 'correct' | 'wrong';

interface Question {
  answer: BandInstrument;
  options: BandInstrument[];
}

export function InstrumentClueGame() {
  const progress = useInstrumentProgress(INSTRUMENT_CLUE_STORAGE_KEY);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: InstrumentLevel) => {
    const answer = pickInstrument(level);
    setQuestion({ answer, options: nameChoices(answer, level) });
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || question) return;
    nextQuestion(progress.level);
  }, [nextQuestion, progress.level, progress.ready, question]);

  const answer = useCallback(
    (choice: BandInstrument) => {
      if (!question || feedback !== 'idle') return;
      const correct = choice.id === question.answer.id;
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
      title="Quem é"
      helpTitle="Como jogar — Quem é"
      helpDescription="Descubra o instrumento pela pista"
      help={INSTRUMENT_CLUE_HELP}
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
          Qual instrumento a pista descreve?
        </p>
        <p className="mt-3 text-center text-base font-medium leading-relaxed">
          {question?.answer.clue}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {question?.options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              disabled={feedback !== 'idle'}
              onClick={() => answer(option)}
              className={choiceClass(feedback !== 'idle' && option.id === question.answer.id)}
            >
              {option.name}
              <span className="ml-1 text-xs font-normal text-[var(--muted)]">{index + 1}</span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. Era ${question?.answer.name ?? ''}.`
              : 'Escolha o instrumento.'}
        </p>
      </div>
    </InstrumentGameFrame>
  );
}
