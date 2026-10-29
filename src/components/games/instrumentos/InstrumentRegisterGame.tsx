'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  InstrumentGameFrame,
  choiceClass,
  instrumentCardClass,
} from '@/components/games/instrumentos/InstrumentGameFrame';
import { useInstrumentProgress } from '@/components/games/instrumentos/useInstrumentProgress';
import { INSTRUMENT_REGISTER_HELP } from '@/domains/games/instrumentos/instrumentHelp';
import {
  INSTRUMENT_REGISTER_STORAGE_KEY,
  pickRegisterPair,
  registerWinner,
  type InstrumentLevel,
  type RegisterPair,
  type RegisterWinner,
} from '@/domains/games/instrumentos/bandInstruments';

type Feedback = 'idle' | 'correct' | 'wrong';

const CHOICES: Array<{ id: RegisterWinner; label: string; key: string }> = [
  { id: 'left', label: 'Primeiro', key: '1' },
  { id: 'right', label: 'Segundo', key: '2' },
  { id: 'tie', label: 'Iguais', key: '3' },
];

export function InstrumentRegisterGame() {
  const progress = useInstrumentProgress(INSTRUMENT_REGISTER_STORAGE_KEY);
  const [pair, setPair] = useState<RegisterPair | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: InstrumentLevel) => {
    setPair(pickRegisterPair(level));
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || pair) return;
    nextQuestion(progress.level);
  }, [nextQuestion, pair, progress.level, progress.ready]);

  const answer = useCallback(
    (choice: RegisterWinner) => {
      if (!pair || feedback !== 'idle') return;
      const correct = choice === registerWinner(pair);
      setFeedback(correct ? 'correct' : 'wrong');
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 700 : 1000);
    },
    [feedback, nextQuestion, pair, progress],
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

  const winner = pair ? registerWinner(pair) : null;

  return (
    <InstrumentGameFrame
      title="Mais agudo"
      helpTitle="Como jogar — Mais agudo"
      helpDescription="Qual instrumento soa mais agudo"
      help={INSTRUMENT_REGISTER_HELP}
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
          Qual costuma soar mais agudo?
        </p>
        {pair ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              ['left', 'Primeiro', pair.left.name],
              ['right', 'Segundo', pair.right.name],
            ] as const).map(([side, label, name]) => {
              const marked = feedback !== 'idle' && (winner === side || winner === 'tie');
              return (
                <div
                  key={side}
                  className={`flex min-h-20 items-center justify-center rounded-xl border px-2 py-3 text-center text-base font-semibold ${
                    marked ? 'border-[var(--color-brand)]' : 'border-[var(--border)]'
                  }`}
                >
                  <span>
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                      {label}
                    </span>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={feedback !== 'idle'}
              onClick={() => answer(choice.id)}
              className={choiceClass(feedback !== 'idle' && winner === choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'idle'
            ? 'Escolha o instrumento mais agudo.'
            : feedback === 'correct'
              ? 'Resposta correta.'
              : 'Resposta incorreta.'}
        </p>
      </div>
    </InstrumentGameFrame>
  );
}
