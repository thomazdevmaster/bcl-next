'use client';

import { type ReactNode } from 'react';
import { GameHelpBody } from '@/components/games/GameHelpDialog';
import { GamePlayHeader } from '@/components/games/GamePlayHeader';
import type { GameHelpSection } from '@/domains/games/gameHelp.types';
import {
  INSTRUMENT_LEVELS,
  type InstrumentLevel,
} from '@/domains/games/instrumentos/bandInstruments';

interface InstrumentGameFrameProps {
  title: string;
  helpTitle: string;
  helpDescription: string;
  help: GameHelpSection[];
  level: InstrumentLevel;
  onChangeLevel: (level: InstrumentLevel) => void;
  levelLocked: boolean;
  streak: number;
  best: number;
  children: ReactNode;
}

export function InstrumentGameFrame({
  title,
  helpTitle,
  helpDescription,
  help,
  level,
  onChangeLevel,
  levelLocked,
  streak,
  best,
  children,
}: InstrumentGameFrameProps) {
  const levelMeta = INSTRUMENT_LEVELS.find((item) => item.id === level)!;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <GamePlayHeader
        categoryLine="Instrumentos"
        title={title}
        backHref="/jogos/instrumentos"
        helpTitle={helpTitle}
        helpDescription={helpDescription}
        helpContent={<GameHelpBody sections={help} />}
      />
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--muted)]" id="instrument-level-label">
          Nível
        </p>
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-labelledby="instrument-level-label"
        >
          {INSTRUMENT_LEVELS.map((item) => {
            const selected = level === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={levelLocked}
                onClick={() => onChangeLevel(item.id)}
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
      {children}
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-2.5 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Sequência</dt>
          <dd className="font-semibold">{streak}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Recorde</dt>
          <dd className="font-semibold">{best}</dd>
        </div>
      </dl>
    </div>
  );
}

export function instrumentCardClass(feedback: 'idle' | 'correct' | 'wrong'): string {
  return `rounded-2xl border bg-[var(--card)] px-3 py-4 shadow-[var(--shadow-soft)] ${
    feedback === 'correct'
      ? 'border-[var(--color-brand)]/50'
      : feedback === 'wrong'
        ? 'border-[var(--destructive)]/40'
        : 'border-[var(--border)]'
  }`;
}

export function choiceClass(revealed: boolean): string {
  return `inline-flex min-h-11 items-center justify-center rounded-xl border px-2 text-sm font-semibold disabled:opacity-80 ${
    revealed
      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15'
      : 'border-[var(--border)] bg-[var(--card)]'
  }`;
}
