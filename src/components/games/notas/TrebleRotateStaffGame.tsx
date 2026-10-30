'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHelpBody } from '@/components/games/GameHelpDialog';
import { GamePlayHeader } from '@/components/games/GamePlayHeader';
import { TrebleRotatingStaff } from '@/components/games/notas/TrebleRotatingStaff';
import type { EighthNoteTone } from '@/components/games/notas/TrebleEighthNote';
import { TrebleStaffNote } from '@/components/games/notas/TrebleStaffNote';
import { TREBLE_ROTATE_STAFF_HELP } from '@/domains/games/notas/trebleNaturalsGameHelp';
import {
  TREBLE_NATURAL_LEVELS,
  TREBLE_ROTATE_STAFF_STORAGE_KEY,
  TREBLE_WHEEL_SLOT_COUNT,
  pickTrebleRotatePrompt,
  pickTrebleWheelStart,
  readTrebleGameLevelStats,
  trebleWheelSlotForNote,
  writeTrebleGameLevelStats,
  type TrebleNaturalNote,
  type TrebleNaturals1Level,
} from '@/domains/games/notas/trebleNaturals1Notes';
import { GAME_NOTE_DURATION_MS, useNotePlayer } from '@/lib/music/useNotePlayer';

type Feedback = 'idle' | 'correct' | 'wrong';

export function TrebleRotateStaffGame() {
  const { playMidi, playWrongFeedback } = useNotePlayer();
  const [level, setLevel] = useState<TrebleNaturals1Level>('medio');
  const [bestByLevel, setBestByLevel] = useState<
    Record<TrebleNaturals1Level, number>
  >({ facil: 0, medio: 0, dificil: 0 });
  const [current, setCurrent] = useState<TrebleNaturalNote | null>(null);
  const [slot, setSlot] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [tone, setTone] = useState<EighthNoteTone>('preview');
  const [streak, setStreak] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const timers = useRef<number[]>([]);
  const locked = useRef(false);

  const levelMeta = TREBLE_NATURAL_LEVELS.find((item) => item.id === level)!;
  const bestStreak = bestByLevel[level];
  const correctSlot = current ? trebleWheelSlotForNote(current) : null;

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const persist = useCallback(
    (
      nextLevel: TrebleNaturals1Level,
      nextBest: Record<TrebleNaturals1Level, number>,
    ) => {
      writeTrebleGameLevelStats(TREBLE_ROTATE_STAFF_STORAGE_KEY, {
        selectedLevel: nextLevel,
        bestStreakByLevel: nextBest,
      });
    },
    [],
  );

  const nextQuestion = useCallback(
    (activeLevel: TrebleNaturals1Level, excludeSlot?: number) => {
      const note = pickTrebleRotatePrompt(activeLevel, excludeSlot);
      locked.current = false;
      setFeedback('idle');
      setTone('preview');
      setCurrent(note);
      setSlot(pickTrebleWheelStart(trebleWheelSlotForNote(note)));
    },
    [],
  );

  useEffect(() => {
    const stats = readTrebleGameLevelStats(TREBLE_ROTATE_STAFF_STORAGE_KEY);
    setLevel(stats.selectedLevel);
    setBestByLevel(stats.bestStreakByLevel);
    const note = pickTrebleRotatePrompt(stats.selectedLevel);
    setCurrent(note);
    setSlot(pickTrebleWheelStart(trebleWheelSlotForNote(note)));
    setReduceMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  const changeLevel = (next: TrebleNaturals1Level) => {
    if (next === level || locked.current) return;
    setLevel(next);
    setStreak(0);
    const note = pickTrebleRotatePrompt(next);
    setCurrent(note);
    setSlot(pickTrebleWheelStart(trebleWheelSlotForNote(note)));
    persist(next, bestByLevel);
  };

  const turn = useCallback((direction: 1 | -1) => {
    if (locked.current) return;
    setSlot(
      (currentSlot) =>
        (currentSlot + direction + TREBLE_WHEEL_SLOT_COUNT) %
        TREBLE_WHEEL_SLOT_COUNT,
    );
  }, []);

  const confirm = useCallback(() => {
    if (!current || correctSlot === null || locked.current) return;
    locked.current = true;
    clearTimers();
    const correct = slot === correctSlot;

    if (correct) {
      playMidi(current.midi, GAME_NOTE_DURATION_MS);
      const nextStreak = streak + 1;
      const nextBest = Math.max(bestByLevel[level], nextStreak);
      const nextBestByLevel = { ...bestByLevel, [level]: nextBest };
      setFeedback('correct');
      setTone('correct');
      setStreak(nextStreak);
      setBestByLevel(nextBestByLevel);
      persist(level, nextBestByLevel);
      later(
        () => nextQuestion(level, correctSlot),
        reduceMotion ? 450 : GAME_NOTE_DURATION_MS + 180,
      );
      return;
    }

    playWrongFeedback();
    setFeedback('wrong');
    setTone('wrong');
    setStreak(0);
    later(
      () => {
        setSlot(correctSlot);
        setTone('correct');
      },
      reduceMotion ? 250 : 480,
    );
    later(
      () => nextQuestion(level, correctSlot),
      reduceMotion ? 900 : 1400,
    );
  }, [
    bestByLevel,
    clearTimers,
    correctSlot,
    current,
    later,
    level,
    nextQuestion,
    persist,
    playMidi,
    playWrongFeedback,
    reduceMotion,
    slot,
    streak,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        turn(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        turn(1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        confirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirm, turn]);

  const revealedName =
    feedback === 'idle' || !current ? '' : current.solfege;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <GamePlayHeader
        categoryLine="Notas · Clave de sol"
        title="Gire a pauta"
        backHref="/jogos/notas"
        helpTitle="Como jogar — Gire a pauta"
        helpDescription="Leitura de notas girando a pauta"
        helpContent={<GameHelpBody sections={TREBLE_ROTATE_STAFF_HELP} />}
      />

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]" id="gire-pauta-level">
          Nível
        </p>
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-labelledby="gire-pauta-level"
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
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Leia a nota
        </p>
        {current ? <TrebleStaffNote note={current} /> : null}
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
        <p className="text-center text-xs font-medium text-[var(--muted)]">
          Gire até o nome da nota
        </p>
        <TrebleRotatingStaff
          slot={slot}
          tone={tone}
          reduceMotion={reduceMotion}
        />
        <p
          className={`mt-1 text-center text-lg font-semibold ${
            feedback === 'idle' ? 'sr-only' : 'text-[var(--foreground)]'
          }`}
          aria-live="polite"
          aria-atomic
        >
          {feedback === 'correct'
            ? `Resposta correta. ${revealedName}.`
            : feedback === 'wrong'
              ? `Resposta incorreta. A nota era ${revealedName}.`
              : `Posição ${slot + 1} de ${TREBLE_WHEEL_SLOT_COUNT}. Gire e confirme.`}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={feedback !== 'idle'}
            onClick={() => turn(-1)}
            aria-label="Girar a pauta para a esquerda"
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-medium disabled:opacity-60"
          >
            <span className="material-icons text-xl" aria-hidden>
              keyboard_arrow_left
            </span>
            Esquerda
          </button>
          <button
            type="button"
            disabled={feedback !== 'idle'}
            onClick={() => turn(1)}
            aria-label="Girar a pauta para a direita"
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 text-sm font-medium disabled:opacity-60"
          >
            Direita
            <span className="material-icons text-xl" aria-hidden>
              keyboard_arrow_right
            </span>
          </button>
        </div>
        <button
          type="button"
          disabled={feedback !== 'idle' || !current}
          onClick={confirm}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--color-brand)] bg-[var(--color-brand)]/15 px-4 text-base font-semibold text-[var(--foreground)] disabled:opacity-60"
        >
          Confirmar
        </button>
        <p className="mt-2 hidden text-center text-[10px] text-[var(--muted)] md:block md:text-xs">
          Teclado: setas ← → giram · Enter confirma
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
