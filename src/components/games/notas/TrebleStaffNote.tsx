'use client';

import { TrebleClefSymbol } from '@/components/games/notas/TrebleClefSymbol';
import { TrebleEighthNoteGlyph } from '@/components/games/notas/TrebleEighthNote';
import type { TrebleNaturalNote } from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_NOTE_X,
  TREBLE_STAFF_METRICS,
  trebleStaffLineYs,
} from '@/domains/games/notas/trebleStaffLayout';

interface TrebleStaffNoteProps {
  note: TrebleNaturalNote;
  className?: string;
}

/** Partitura (clave de sol + pauta) com uma colcheia. */
export function TrebleStaffNote({ note, className = '' }: TrebleStaffNoteProps) {
  const lines = trebleStaffLineYs(TREBLE_STAFF_METRICS);

  return (
    <div
      className={`relative mx-auto flex max-w-[17.5rem] items-center ${className}`}
      role="img"
      aria-label="Nota na partitura em clave de sol"
    >
      <TrebleClefSymbol className="pointer-events-none h-[6.4rem] w-[3.2rem] shrink-0 -mr-3 text-[var(--foreground)]" />
      <svg
        viewBox="0 -10 200 116"
        className="h-[6.4rem] flex-1 text-[var(--foreground)]"
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
        <TrebleEighthNoteGlyph
          staffStep={note.staffStep}
          metrics={TREBLE_STAFF_METRICS}
          cx={TREBLE_NOTE_X}
        />
      </svg>
    </div>
  );
}
