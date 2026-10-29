'use client';

import { TrebleClefSymbol } from '@/components/games/notas/TrebleClefSymbol';
import {
  TrebleEighthNoteGlyph,
  type EighthNoteTone,
} from '@/components/games/notas/TrebleEighthNote';
import type {
  TrebleNaturalNote,
  TreblePairSide,
} from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_STAFF_METRICS,
  trebleStaffLineYs,
} from '@/domains/games/notas/trebleStaffLayout';

const LEFT_X = 78;
const RIGHT_X = 156;

interface TrebleStaffPairProps {
  left: TrebleNaturalNote;
  right: TrebleNaturalNote;
  feedback: 'idle' | 'correct' | 'wrong';
  chosen: TreblePairSide | null;
  higher: TreblePairSide;
  disabled: boolean;
  onPick: (side: TreblePairSide) => void;
}

function toneFor(
  side: TreblePairSide,
  feedback: 'idle' | 'correct' | 'wrong',
  chosen: TreblePairSide | null,
  higher: TreblePairSide,
): EighthNoteTone {
  if (feedback === 'idle') return 'default';
  if (side === higher) return 'correct';
  if (side === chosen && feedback === 'wrong') return 'wrong';
  return 'default';
}

/** Duas colcheias na mesma pauta para comparar a altura. */
export function TrebleStaffPair({
  left,
  right,
  feedback,
  chosen,
  higher,
  disabled,
  onPick,
}: TrebleStaffPairProps) {
  const lines = trebleStaffLineYs(TREBLE_STAFF_METRICS);

  return (
    <div
      className="relative mx-auto flex w-full max-w-md items-center"
      role="group"
      aria-label="Duas notas na partitura. Escolha a mais aguda."
    >
      <TrebleClefSymbol className="pointer-events-none h-[6.4rem] w-[3.2rem] shrink-0 -mr-2 text-[var(--foreground)] sm:h-[7rem] sm:w-[3.5rem]" />
      <svg
        viewBox="0 -10 220 116"
        className="h-[6.4rem] w-full flex-1 text-[var(--foreground)] sm:h-[7rem]"
        aria-hidden
      >
        {lines.map((y) => (
          <line
            key={y}
            x1={8}
            y1={y}
            x2={212}
            y2={y}
            stroke="currentColor"
            strokeWidth={1.2}
            opacity={0.55}
          />
        ))}
        <TrebleEighthNoteGlyph
          staffStep={left.staffStep}
          metrics={TREBLE_STAFF_METRICS}
          cx={LEFT_X}
          tone={toneFor('left', feedback, chosen, higher)}
        />
        <TrebleEighthNoteGlyph
          staffStep={right.staffStep}
          metrics={TREBLE_STAFF_METRICS}
          cx={RIGHT_X}
          tone={toneFor('right', feedback, chosen, higher)}
        />
        {!disabled ? (
          <>
            <rect
              x={40}
              y={-10}
              width={70}
              height={116}
              fill="transparent"
              className="cursor-pointer"
              onPointerDown={(event) => {
                event.preventDefault();
                onPick('left');
              }}
            />
            <rect
              x={118}
              y={-10}
              width={90}
              height={116}
              fill="transparent"
              className="cursor-pointer"
              onPointerDown={(event) => {
                event.preventDefault();
                onPick('right');
              }}
            />
          </>
        ) : null}
      </svg>
    </div>
  );
}
