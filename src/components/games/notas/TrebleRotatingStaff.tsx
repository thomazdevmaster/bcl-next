'use client';

import { TrebleEighthNoteGlyph } from '@/components/games/notas/TrebleEighthNote';
import type { EighthNoteTone } from '@/components/games/notas/TrebleEighthNote';
import { GAME_STAFF_LINE_GAP_PX } from '@/domains/games/notas/trebleStaffLayout';
import { TREBLE_WHEEL_SLOT_COUNT } from '@/domains/games/notas/trebleNaturals1Notes';

const STAFF_GAP_PERCENT = 12;
const NOTE_VIEW = 100;
const NOTE_LINE_GAP = STAFF_GAP_PERCENT;
const WHEEL_HEIGHT_PX = Math.round(
  GAME_STAFF_LINE_GAP_PX / (STAFF_GAP_PERCENT / 100),
);
const NOTE_METRICS = {
  staffTop: NOTE_VIEW / 2 - 2 * NOTE_LINE_GAP,
  lineGap: NOTE_LINE_GAP,
  viewHeight: NOTE_VIEW,
};

function shortestWheelDelta(slotIndex: number, active: number): number {
  let delta = slotIndex - active;
  const half = Math.floor(TREBLE_WHEEL_SLOT_COUNT / 2);
  if (delta > half) delta -= TREBLE_WHEEL_SLOT_COUNT;
  if (delta < -half) delta += TREBLE_WHEEL_SLOT_COUNT;
  return delta;
}

/** Linha `lineIndex` 0 = topo da pauta. O encaixe fica na metade da altura. */
function lineTopPercent(slot: number, lineIndex: number): number {
  const noteFromTop = 4 - slot * 0.5;
  return 50 + (lineIndex - noteFromTop) * STAFF_GAP_PERCENT;
}

function StaffFace({ slot }: { slot: number }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      {[0, 1, 2, 3, 4].map((lineIndex) => (
        <span
          key={lineIndex}
          className="absolute left-[8%] h-0.5 w-[84%] -translate-y-1/2 bg-[var(--foreground)] opacity-55"
          style={{ top: `${lineTopPercent(slot, lineIndex)}%` }}
        />
      ))}
    </div>
  );
}

interface TrebleRotatingStaffProps {
  slot: number;
  tone: EighthNoteTone;
  reduceMotion: boolean;
}

/** Pauta em sete encaixes. O centro é a colcheia que o jogador alinha. */
export function TrebleRotatingStaff({
  slot,
  tone,
  reduceMotion,
}: TrebleRotatingStaffProps) {
  return (
    <div>
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden"
        style={{ height: WHEEL_HEIGHT_PX }}
      >
        {Array.from({ length: TREBLE_WHEEL_SLOT_COUNT }, (_, index) => {
          const delta = shortestWheelDelta(index, slot);
          const visible = Math.abs(delta) <= 1;
          return (
            <div
              key={index}
              className={`absolute inset-0 ${
                reduceMotion ? '' : 'transition-all duration-300 ease-out'
              }`}
              style={{
                transform: `translateX(${delta * 78}%) rotate(${delta * 16}deg) scale(${
                  delta === 0 ? 1 : 0.86
                })`,
                opacity: visible ? (delta === 0 ? 1 : 0.35) : 0,
                zIndex: 10 - Math.abs(delta),
              }}
              aria-hidden={delta !== 0}
            >
              <StaffFace slot={index} />
            </div>
          );
        })}
        <svg
          viewBox={`0 0 ${NOTE_VIEW} ${NOTE_VIEW}`}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full text-[var(--foreground)]"
          aria-hidden
        >
          <TrebleEighthNoteGlyph
            staffStep={4}
            metrics={NOTE_METRICS}
            cx={62}
            tone={tone}
          />
        </svg>
      </div>
      <div className="mt-1 flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: TREBLE_WHEEL_SLOT_COUNT }, (_, index) => (
          <span
            key={index}
            className={`h-2 w-2 rounded-full ${
              index === slot
                ? 'bg-[var(--color-brand)]'
                : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
