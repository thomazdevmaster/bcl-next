'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameHelpBody } from '@/components/games/GameHelpDialog';
import { GamePlayHeader } from '@/components/games/GamePlayHeader';
import { TrebleInteractiveStaff } from '@/components/games/notas/TrebleInteractiveStaff';
import { TREBLE_NATURALS_2_HELP } from '@/domains/games/notas/trebleNaturalsGameHelp';
import {
  TREBLE_NATURAL_LEVELS,
  formatTrebleNaturalLabel,
  isCorrectStaffStepAnswer,
  notesForLevel,
  pickRandomTrebleNatural,
  readTrebleNaturals2Stats,
  writeTrebleNaturals2Stats,
  type TrebleNaturalNote,
  type TrebleNaturals1Level,
} from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_STAFF_STEP_MAX,
  TREBLE_STAFF_STEP_MIN,
} from '@/domains/games/notas/trebleStaffLayout';
import { GAME_NOTE_DURATION_MS, useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

function useMobileGameLayout(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

export function TrebleNaturals2Game() {
  const mobileLayout = useMobileGameLayout();
  const { playMidi, playWrongFeedback } = useNotePlayer();
  const [level, setLevel] = useState<TrebleNaturals1Level>('medio');
  const [bestByLevel, setBestByLevel] = useState<
    Record<TrebleNaturals1Level, number>
  >({ facil: 0, medio: 0, dificil: 0 });
  const [current, setCurrent] = useState<TrebleNaturalNote | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [streak, setStreak] = useState(0);
  const [chosenStaffStep, setChosenStaffStep] = useState<number | null>(null);
  const [previewStaffStep, setPreviewStaffStep] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const levelMeta = TREBLE_NATURAL_LEVELS.find((item) => item.id === level)!;
  const bestStreak = bestByLevel[level];

  const levelSteps = useMemo(
    () =>
      notesForLevel(level)
        .map((note) => note.staffStep)
        .sort((a, b) => a - b),
    [level],
  );

  const persist = useCallback(
    (
      nextLevel: TrebleNaturals1Level,
      nextBest: Record<TrebleNaturals1Level, number>,
    ) => {
      writeTrebleNaturals2Stats({
        selectedLevel: nextLevel,
        bestStreakByLevel: nextBest,
      });
    },
    [],
  );

  const defaultPreviewStep = useCallback((activeLevel: TrebleNaturals1Level) => {
    const steps = notesForLevel(activeLevel)
      .map((note) => note.staffStep)
      .sort((a, b) => a - b);
    return steps[Math.floor(steps.length / 2)] ?? 0;
  }, []);

  const nextQuestion = useCallback(
    (activeLevel: TrebleNaturals1Level, excludeId?: string) => {
      setFeedback('idle');
      setChosenStaffStep(null);
      const note = pickRandomTrebleNatural(activeLevel, excludeId);
      setCurrent(note);
      setPreviewStaffStep(defaultPreviewStep(activeLevel));
    },
    [defaultPreviewStep],
  );

  useEffect(() => {
    const stats = readTrebleNaturals2Stats();
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    const note = pickRandomTrebleNatural(stats.selectedLevel);
    setCurrent(note);
    setPreviewStaffStep(defaultPreviewStep(stats.selectedLevel));
    setReduceMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, [defaultPreviewStep]);

  const changeLevel = (next: TrebleNaturals1Level) => {
    if (next === level || feedback !== 'idle') return;
    setLevel(next);
    setStreak(0);
    const note = pickRandomTrebleNatural(next);
    setCurrent(note);
    setPreviewStaffStep(defaultPreviewStep(next));
    persist(next, bestByLevel);
  };

  const submitStaffStep = useCallback(
    (staffStep: number) => {
      if (!current || feedback !== 'idle') return;
      setChosenStaffStep(staffStep);
      const correct = isCorrectStaffStepAnswer(current, staffStep);

      if (correct) {
        playMidi(current.midi, GAME_NOTE_DURATION_MS);
        const nextStreak = streak + 1;
        const nextBest = Math.max(bestByLevel[level], nextStreak);
        const nextBestByLevel = { ...bestByLevel, [level]: nextBest };
        setFeedback('correct');
        setStreak(nextStreak);
        setBestByLevel(nextBestByLevel);
        persist(level, nextBestByLevel);
      } else {
        playWrongFeedback();
        setFeedback('wrong');
        setStreak(0);
      }

      const delay = reduceMotion
        ? 0
        : correct
          ? GAME_NOTE_DURATION_MS + 180
          : 900;
      window.setTimeout(() => {
        nextQuestion(level, correct ? undefined : current.id);
      }, delay);
    },
    [
      bestByLevel,
      current,
      feedback,
      level,
      nextQuestion,
      persist,
      playMidi,
      playWrongFeedback,
      reduceMotion,
      streak,
    ],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!current || feedback !== 'idle' || levelSteps.length === 0) return;
      const active =
        previewStaffStep ?? levelSteps[Math.floor(levelSteps.length / 2)]!;
      const index = levelSteps.indexOf(active);
      const safeIndex = index >= 0 ? index : 0;

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const delta = event.key === 'ArrowUp' ? 1 : -1;
        const nextIndex = Math.min(
          levelSteps.length - 1,
          Math.max(0, safeIndex + delta),
        );
        setPreviewStaffStep(levelSteps[nextIndex]!);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        submitStaffStep(previewStaffStep ?? levelSteps[safeIndex]!);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, feedback, levelSteps, previewStaffStep, submitStaffStep]);

  const promptLabel = current ? formatTrebleNaturalLabel(current) : '—';

  const nudgePreview = (delta: number) => {
    if (feedback !== 'idle') return;
    const currentStep =
      previewStaffStep ??
      levelSteps[Math.floor(levelSteps.length / 2)] ??
      0;
    const next = Math.min(
      TREBLE_STAFF_STEP_MAX,
      Math.max(TREBLE_STAFF_STEP_MIN, currentStep + delta),
    );
    setPreviewStaffStep(next);
  };

  const handleStaffPick = (staffStep: number) => {
    if (mobileLayout) {
      setPreviewStaffStep(staffStep);
      return;
    }
    submitStaffStep(staffStep);
  };

  const confirmPreview = () => {
    if (previewStaffStep === null) return;
    submitStaffStep(previewStaffStep);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <GamePlayHeader
        categoryLine="Notas · Clave de sol"
        title="Naturais 2"
        backHref="/jogos/notas"
        helpTitle="Como jogar — Naturais 2"
        helpDescription="Colocar a nota na partitura"
        helpContent={<GameHelpBody sections={TREBLE_NATURALS_2_HELP} />}
      />

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]" id="level-label">
          Nível
        </p>
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-labelledby="level-label"
        >
          {TREBLE_NATURAL_LEVELS.map((item) => {
            const selected = level === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={feedback !== 'idle'}
                onClick={() => changeLevel(item.id)}
                className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-2 text-sm font-medium transition disabled:opacity-60 ${
                  selected
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--foreground)]'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--muted)]">{levelMeta.rangeHint}</p>
      </div>

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
          {mobileLayout
            ? 'Toque na pauta ou use os botões, depois confirme'
            : 'Toque na partitura na altura da nota'}
        </p>
        <p
          className="mt-1 text-center text-3xl font-semibold tracking-tight text-[var(--foreground)]"
          aria-live="polite"
        >
          {promptLabel}
        </p>
        {current ? (
          <TrebleInteractiveStaff
            className="mt-4 px-0.5"
            feedback={feedback}
            target={current}
            chosenStaffStep={chosenStaffStep}
            previewStaffStep={feedback === 'idle' ? previewStaffStep : null}
            disabled={feedback !== 'idle'}
            useTouchBands={mobileLayout}
            onPickStaffStep={handleStaffPick}
          />
        ) : null}
        {mobileLayout && feedback === 'idle' ? (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-medium"
                onClick={() => nudgePreview(1)}
                aria-label="Subir uma posição na pauta"
              >
                <span className="material-icons text-xl" aria-hidden>
                  keyboard_arrow_up
                </span>
                Subir
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-medium"
                onClick={() => nudgePreview(-1)}
                aria-label="Descer uma posição na pauta"
              >
                <span className="material-icons text-xl" aria-hidden>
                  keyboard_arrow_down
                </span>
                Descer
              </button>
            </div>
            <button
              type="button"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--color-brand)] bg-[var(--color-brand)]/15 px-4 text-base font-semibold text-[var(--foreground)]"
              onClick={confirmPreview}
            >
              Confirmar posição
            </button>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite" aria-atomic>
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. A nota era ${promptLabel}.`
              : `Coloque ${promptLabel} na partitura.`}
        </p>
        <p className="mt-2 hidden text-center text-[10px] text-[var(--muted)] md:block md:text-xs">
          Teclado: setas ↑↓ movem a prévia · Enter confirma
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-2.5 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Sequência</dt>
          <dd className="font-semibold">{streak}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Recorde</dt>
          <dd className="font-semibold">{bestStreak}</dd>
        </div>
      </dl>
    </div>
  );
}
