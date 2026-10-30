'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  InstrumentGameFrame,
  choiceClass,
  instrumentCardClass,
} from '@/components/games/instrumentos/InstrumentGameFrame';
import { useInstrumentProgress } from '@/components/games/instrumentos/useInstrumentProgress';
import { INSTRUMENT_FAMILY_HELP } from '@/domains/games/instrumentos/instrumentHelp';
import {
  BAND_FAMILIES,
  INSTRUMENT_FAMILY_STORAGE_KEY,
  familyLabel,
  pickInstrument,
  type BandFamilyId,
  type BandInstrument,
  type InstrumentLevel,
} from '@/domains/games/instrumentos/bandInstruments';

type Feedback = 'idle' | 'correct' | 'wrong';

export function InstrumentFamilyGame() {
  const progress = useInstrumentProgress(INSTRUMENT_FAMILY_STORAGE_KEY);
  const [instrument, setInstrument] = useState<BandInstrument | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: InstrumentLevel) => {
    setInstrument(pickInstrument(level));
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || instrument) return;
    nextQuestion(progress.level);
  }, [instrument, nextQuestion, progress.level, progress.ready]);

  const answer = useCallback(
    (family: BandFamilyId) => {
      if (!instrument || feedback !== 'idle') return;
      const correct = family === instrument.family;
      setFeedback(correct ? 'correct' : 'wrong');
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 700 : 1000);
    },
    [feedback, instrument, nextQuestion, progress],
  );

  return (
    <InstrumentGameFrame
      title="Família"
      helpTitle="Como jogar — Família"
      helpDescription="Em que família está o instrumento"
      help={INSTRUMENT_FAMILY_HELP}
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
          De que família é este instrumento?
        </p>
        <p className="mt-2 text-center text-2xl font-semibold tracking-tight">
          {instrument?.name}
        </p>
        {feedback !== 'idle' && instrument ? (
          <p className="mt-1 text-center text-sm font-medium text-[var(--muted)]">
            {familyLabel(instrument.family)}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {BAND_FAMILIES.map((family) => (
            <button
              key={family.id}
              type="button"
              disabled={feedback !== 'idle'}
              onClick={() => answer(family.id)}
              className={choiceClass(feedback !== 'idle' && instrument?.family === family.id)}
            >
              {family.label}
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. A família era ${instrument ? familyLabel(instrument.family) : ''}.`
              : 'Escolha a família.'}
        </p>
      </div>
    </InstrumentGameFrame>
  );
}
