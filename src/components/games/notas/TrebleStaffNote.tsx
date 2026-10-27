'use client';

import { TrebleClefSymbol } from '@/components/games/notas/TrebleClefSymbol';
import type { TrebleNaturalNote } from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_LEDGER_HALF,
  TREBLE_NOTE_X,
  TREBLE_STAFF_METRICS,
  trebleStaffLineYs,
  trebleStepCenterY,
} from '@/domains/games/notas/trebleStaffLayout';

interface TrebleStaffNoteProps {
  note: TrebleNaturalNote;
  className?: string;
}

/** Partitura (clave de sol + pauta) com uma semíbreve. */
export function TrebleStaffNote({ note, className = '' }: TrebleStaffNoteProps) {
  const lines = trebleStaffLineYs(TREBLE_STAFF_METRICS);
  const noteY = trebleStepCenterY(note.staffStep, TREBLE_STAFF_METRICS);
  const needsLedgerBelow = note.staffStep <= -2;
  const needsLedgerAbove = note.staffStep >= 10;

  return (
    <div
      className={`relative mx-auto flex max-w-[17.5rem] items-center ${className}`}
      role="img"
      aria-label="Nota na partitura em clave de sol"
    >
      <TrebleClefSymbol className="pointer-events-none h-[5.5rem] w-[2.75rem] shrink-0 -mr-3 text-[var(--foreground)]" />
      <svg
        viewBox="0 0 200 96"
        className="h-[5.5rem] flex-1 text-[var(--foreground)]"
        aria-hidden
      >
        {lines.map((y) => (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={196}
            y2={y}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.55}
          />
        ))}
        {needsLedgerBelow ? (
          <line
            x1={TREBLE_NOTE_X - TREBLE_LEDGER_HALF}
            y1={noteY}
            x2={TREBLE_NOTE_X + TREBLE_LEDGER_HALF}
            y2={noteY}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.55}
          />
        ) : null}
        {needsLedgerAbove ? (
          <line
            x1={TREBLE_NOTE_X - TREBLE_LEDGER_HALF}
            y1={noteY}
            x2={TREBLE_NOTE_X + TREBLE_LEDGER_HALF}
            y2={noteY}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.55}
          />
        ) : null}
        <ellipse
          cx={TREBLE_NOTE_X}
          cy={noteY}
          rx={9}
          ry={6.5}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
        />
      </svg>
    </div>
  );
}
