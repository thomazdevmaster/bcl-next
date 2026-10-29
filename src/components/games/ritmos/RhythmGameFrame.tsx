"use client";

import { type ReactNode } from "react";

import { GameHelpBody } from "@/components/games/GameHelpDialog";
import { GamePlayHeader } from "@/components/games/GamePlayHeader";
import type { GameHelpSection } from "@/domains/games/gameHelp.types";
import {
  RHYTHM_LEVELS,
  type RhythmLevel,
} from "@/domains/games/ritmos/rhythmFigures";

interface RhythmGameFrameProps {
  title: string;
  helpTitle: string;
  helpDescription: string;
  help: GameHelpSection[];
  level: RhythmLevel;
  onChangeLevel: (level: RhythmLevel) => void;
  levelLocked: boolean;
  streak: number;
  best: number;
  scoreLabel?: string;
  recordLabel?: string;
  children: ReactNode;
}

export function RhythmGameFrame({
  title,
  helpTitle,
  helpDescription,
  help,
  level,
  onChangeLevel,
  levelLocked,
  streak,
  best,
  scoreLabel = "Sequência",
  recordLabel = "Recorde",
  children,
}: RhythmGameFrameProps) {
  const levelMeta = RHYTHM_LEVELS.find((item) => item.id === level)!;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
      <GamePlayHeader
        categoryLine="Ritmos"
        title={title}
        backHref="/jogos/ritmos"
        helpTitle={helpTitle}
        helpDescription={helpDescription}
        helpContent={<GameHelpBody sections={help} />}
      />

      <div className="space-y-2">
        <p
          className="text-xs font-medium text-[var(--muted)]"
          id="rhythm-level-label"
        >
          Nível
        </p>
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-labelledby="rhythm-level-label"
        >
          {RHYTHM_LEVELS.map((item) => {
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
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
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
          <dt className="text-[var(--muted)]">{scoreLabel}</dt>
          <dd className="font-semibold">{streak}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">{recordLabel}</dt>
          <dd className="font-semibold">{best}</dd>
        </div>
      </dl>
    </div>
  );
}
