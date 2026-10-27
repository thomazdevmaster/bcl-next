'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { TrebleStaffNote } from '@/components/games/notas/TrebleStaffNote';
import {
  TREBLE_ANSWER_BUTTONS,
  TREBLE_NATURALS_1_ANSWER_ORDER,
  TREBLE_NATURAL_LEVELS,
  isCorrectSolfegeAnswer,
  pickRandomTrebleNatural,
  readTrebleNaturals1Stats,
  writeTrebleNaturals1Stats,
  type TrebleNaturalNote,
  type TrebleNaturals1Level,
} from '@/domains/games/notas/trebleNaturals1Notes';
import type { SolfegeName } from '@/lib/music/pitch';
import { GAME_NOTE_DURATION_MS, useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

function AnswerButton({
  label,
  index,
  feedback,
  current,
  onPick,
}: {
  label: { solfege: SolfegeName; letter: string };
  index: number;
  feedback: Feedback;
  current: TrebleNaturalNote | null;
  onPick: (solfege: SolfegeName) => void;
}) {
  const isCorrectChoice =
    feedback !== 'idle' && current && label.solfege === current.solfege;
  return (
    <button
      type="button"
      disabled={feedback !== 'idle'}
      onClick={() => onPick(label.solfege)}
      className={`inline-flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-sm font-semibold transition disabled:opacity-80 ${
        isCorrectChoice
          ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--foreground)]'
          : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--color-brand)]/40'
      }`}
      aria-label={`${label.solfege}, ${label.letter}`}
    >
      <span>{label.solfege}</span>
      <span className="text-[10px] font-normal text-[var(--muted)] sm:text-xs">
        {label.letter} · {index + 1}
      </span>
    </button>
  );
}

export function TrebleNaturals1Game() {
  const { playMidi, playWrongFeedback } = useNotePlayer();
  const [level, setLevel] = useState<TrebleNaturals1Level>('medio');
  const [bestByLevel, setBestByLevel] = useState<
    Record<TrebleNaturals1Level, number>
  >({ facil: 0, medio: 0, dificil: 0 });
  const [current, setCurrent] = useState<TrebleNaturalNote | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [streak, setStreak] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const levelMeta = TREBLE_NATURAL_LEVELS.find((item) => item.id === level)!;
  const bestStreak = bestByLevel[level];

  const persist = useCallback(
    (
      nextLevel: TrebleNaturals1Level,
      nextBest: Record<TrebleNaturals1Level, number>,
    ) => {
      writeTrebleNaturals1Stats({
        selectedLevel: nextLevel,
        bestStreakByLevel: nextBest,
      });
    },
    [],
  );

  const nextQuestion = useCallback(
    (activeLevel: TrebleNaturals1Level, excludeId?: string) => {
      setFeedback('idle');
      setCurrent(pickRandomTrebleNatural(activeLevel, excludeId));
    },
    [],
  );

  useEffect(() => {
    const stats = readTrebleNaturals1Stats();
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    setCurrent(pickRandomTrebleNatural(stats.selectedLevel));
    setReduceMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  const changeLevel = (next: TrebleNaturals1Level) => {
    if (next === level || feedback !== 'idle') return;
    setLevel(next);
    setStreak(0);
    setCurrent(pickRandomTrebleNatural(next));
    persist(next, bestByLevel);
  };

  const handleAnswer = useCallback(
    (solfege: SolfegeName) => {
      if (!current || feedback !== 'idle') return;
      const correct = isCorrectSolfegeAnswer(current, solfege);

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
      if (!current || feedback !== 'idle') return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < TREBLE_NATURALS_1_ANSWER_ORDER.length) {
        handleAnswer(TREBLE_NATURALS_1_ANSWER_ORDER[index]!);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, feedback, handleAnswer]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <header className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            Notas · Clave de sol
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Naturais 1
          </h1>
        </div>
        <Link
          href="/jogos/notas"
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium no-underline hover:no-underline"
        >
          Voltar
        </Link>
      </header>

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
        className={`rounded-2xl border bg-[var(--card)] px-2 py-3 shadow-[var(--shadow-soft)] ${
          feedback === 'correct'
            ? 'border-[var(--color-brand)]/50'
            : feedback === 'wrong'
              ? 'border-[var(--destructive)]/40'
              : 'border-[var(--border)]'
        }`}
      >
        {current ? <TrebleStaffNote note={current} /> : null}
        <p className="sr-only" aria-live="polite" aria-atomic>
          {feedback === 'correct'
            ? 'Resposta correta.'
            : feedback === 'wrong'
              ? `Resposta incorreta. A nota era ${current?.solfege ?? ''}.`
              : 'Escolha a nota.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          {TREBLE_ANSWER_BUTTONS.slice(0, 4).map((label, index) => (
            <AnswerButton
              key={label.solfege}
              label={label}
              index={index}
              feedback={feedback}
              current={current}
              onPick={handleAnswer}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {TREBLE_ANSWER_BUTTONS.slice(4).map((label, index) => (
            <AnswerButton
              key={label.solfege}
              label={label}
              index={index + 4}
              feedback={feedback}
              current={current}
              onPick={handleAnswer}
            />
          ))}
        </div>
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
