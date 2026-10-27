'use client';

import { TrebleClefSymbol } from '@/components/games/notas/TrebleClefSymbol';
import type { TrebleNaturalNote } from '@/domains/games/notas/trebleNaturals1Notes';

const STAFF_TOP = 34;
const LINE_GAP = 11;
const NOTE_X = 132;
const LEDGER_HALF = 22;

function stepCenterY(staffStep: number): number {
  return STAFF_TOP + (4 - staffStep * 0.5) * LINE_GAP;
}

interface TrebleStaffNoteProps {
  note: TrebleNaturalNote;
  className?: string;
}

/** Partitura (clave de sol + pauta) com uma semíbreve. */
export function TrebleStaffNote({ note, className = '' }: TrebleStaffNoteProps) {
  const lines = [0, 1, 2, 3, 4].map((index) => STAFF_TOP + index * LINE_GAP);
  const noteY = stepCenterY(note.staffStep);
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
            x1={NOTE_X - LEDGER_HALF}
            y1={noteY}
            x2={NOTE_X + LEDGER_HALF}
            y2={noteY}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.55}
          />
        ) : null}
        {needsLedgerAbove ? (
          <line
            x1={NOTE_X - LEDGER_HALF}
            y1={noteY}
            x2={NOTE_X + LEDGER_HALF}
            y2={noteY}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.55}
          />
        ) : null}
        <ellipse
          cx={NOTE_X}
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
