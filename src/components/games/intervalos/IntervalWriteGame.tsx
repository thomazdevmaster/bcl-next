'use client';

import { useCallback, useEffect, useState } from 'react';
import { IntervalGameFrame } from '@/components/games/intervalos/IntervalGameFrame';
import { IntervalWriteStaff } from '@/components/games/intervalos/IntervalPairStaff';
import { useIntervalProgress } from '@/components/games/intervalos/useIntervalProgress';
import { INTERVAL_WRITE_HELP } from '@/domains/games/intervalos/intervalHelp';
import {
  INTERVAL_WRITE_STORAGE_KEY,
  pickIntervalExample,
  type IntervalExample,
  type IntervalLevel,
} from '@/domains/games/intervalos/intervals';
import { formatTrebleNaturalLabel } from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_STAFF_STEP_MAX,
  TREBLE_STAFF_STEP_MIN,
} from '@/domains/games/notas/trebleStaffLayout';
import type { EighthNoteTone } from '@/components/games/notas/TrebleEighthNote';
import { useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

function useMobileLayout(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}

function openingStep(answerStep: number): number {
  return answerStep === 2 ? 5 : 2;
}

export function IntervalWriteGame() {
  const mobile = useMobileLayout();
  const progress = useIntervalProgress(INTERVAL_WRITE_STORAGE_KEY);
  const { playMidi, playWrongFeedback } = useNotePlayer();
  const [example, setExample] = useState<IntervalExample | null>(null);
  const [previewStep, setPreviewStep] = useState(2);
  const [chosenStep, setChosenStep] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');

  const nextQuestion = useCallback((level: IntervalLevel) => {
    const next = pickIntervalExample(level);
    setExample(next);
    setPreviewStep(openingStep(next.upper.staffStep));
    setChosenStep(null);
    setFeedback('idle');
  }, []);

  useEffect(() => {
    if (!progress.ready || example) return;
    nextQuestion(progress.level);
  }, [example, nextQuestion, progress.level, progress.ready]);

  const submit = useCallback(
    (staffStep: number) => {
      if (!example || feedback !== 'idle') return;
      const correct = staffStep === example.upper.staffStep;
      setChosenStep(staffStep);
      setFeedback(correct ? 'correct' : 'wrong');
      if (correct) {
        playMidi(example.lower.midi, 420);
        window.setTimeout(() => playMidi(example.upper.midi, 640), 460);
      } else {
        playWrongFeedback();
      }
      progress.applyResult(correct);
      window.setTimeout(() => nextQuestion(progress.level), correct ? 1200 : 1100);
    },
    [example, feedback, nextQuestion, playMidi, playWrongFeedback, progress],
  );

  const nudge = (delta: number) => {
    if (feedback !== 'idle') return;
    setPreviewStep((current) =>
      Math.min(TREBLE_STAFF_STEP_MAX, Math.max(TREBLE_STAFF_STEP_MIN, current + delta)),
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!example || feedback !== 'idle') return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        nudge(event.key === 'ArrowUp' ? 1 : -1);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        submit(previewStep);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [example, feedback, previewStep, submit]);

  const marks: Array<{ step: number; tone: EighthNoteTone }> = [];
  if (example && feedback === 'idle') {
    marks.push({ step: previewStep, tone: 'preview' });
  } else if (example && feedback === 'correct') {
    marks.push({ step: example.upper.staffStep, tone: 'correct' });
  } else if (example && feedback === 'wrong') {
    if (chosenStep !== null && chosenStep !== example.upper.staffStep) {
      marks.push({ step: chosenStep, tone: 'wrong' });
    }
    marks.push({ step: example.upper.staffStep, tone: 'correct' });
  }

  return (
    <IntervalGameFrame
      wide
      title="Escreva"
      helpTitle="Como jogar — Escreva"
      helpDescription="Coloque a nota aguda do intervalo"
      help={INTERVAL_WRITE_HELP}
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
          {mobile
            ? 'Posicione a nota de cima e confirme'
            : 'Clique na altura da nota de cima'}
        </p>
        {example ? (
          <p className="mt-1 text-center text-2xl font-semibold tracking-tight">
            {example.interval.label}
            <span className="mt-1 block text-sm font-medium text-[var(--muted)]">
              acima de {formatTrebleNaturalLabel(example.lower)}
            </span>
          </p>
        ) : null}
        {example ? (
          <IntervalWriteStaff
            lower={example.lower}
            marks={marks}
            disabled={feedback !== 'idle'}
            onPick={(step) => {
              if (mobile) setPreviewStep(step);
              else submit(step);
            }}
          />
        ) : null}
        {mobile && feedback === 'idle' ? (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] text-sm font-medium"
                onClick={() => nudge(1)}
              >
                <span className="material-icons text-xl" aria-hidden>
                  keyboard_arrow_up
                </span>
                Subir
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] text-sm font-medium"
                onClick={() => nudge(-1)}
              >
                <span className="material-icons text-xl" aria-hidden>
                  keyboard_arrow_down
                </span>
                Descer
              </button>
            </div>
            <button
              type="button"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-base font-semibold"
              onClick={() => submit(previewStep)}
            >
              Confirmar posição
            </button>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? 'Resposta incorreta. A nota certa foi destacada.'
              : example
                ? `Escreva ${example.interval.label} acima de ${formatTrebleNaturalLabel(example.lower)}.`
                : 'Carregando.'}
        </p>
      </div>
    </IntervalGameFrame>
  );
}
