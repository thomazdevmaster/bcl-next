'use client';

import { TrebleClefSymbol } from '@/components/games/notas/TrebleClefSymbol';
import {
  TrebleEighthNoteGlyph,
  type EighthNoteTone,
} from '@/components/games/notas/TrebleEighthNote';
import type { TrebleNaturalNote } from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_STAFF_METRICS,
  TREBLE_STAFF_METRICS_TOUCH,
  gameStaffSize,
  trebleStaffLineYs,
  trebleYToStaffStep,
  type TrebleStaffLayoutMetrics,
} from '@/domains/games/notas/trebleStaffLayout';
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

const LOWER_X = 78;
const UPPER_X = 156;

interface IntervalPairStaffProps {
  lower: TrebleNaturalNote;
  upperStep: number | null;
  upperTone?: EighthNoteTone;
  lowerTone?: EighthNoteTone;
  className?: string;
}

export function IntervalPairStaff({
  lower,
  upperStep,
  upperTone = 'default',
  lowerTone = 'default',
  className = '',
}: IntervalPairStaffProps) {
  const metrics = TREBLE_STAFF_METRICS;
  const lines = trebleStaffLineYs(metrics);
  const staff = gameStaffSize(220, metrics.viewHeight + 20, metrics.lineGap);

  return (
    <div className={`relative mx-auto flex w-full items-center justify-center overflow-x-auto text-[var(--foreground)] ${className}`}>
      <TrebleClefSymbol
        className="pointer-events-none shrink-0 -mr-2"
        style={{ height: staff.height, width: staff.clefWidth }}
      />
      <svg
        viewBox={`0 -10 220 ${metrics.viewHeight + 20}`}
        className="shrink-0"
        style={{ height: staff.height, width: staff.width }}
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
          staffStep={lower.staffStep}
          metrics={metrics}
          cx={LOWER_X}
          tone={lowerTone}
        />
        {upperStep !== null ? (
          <TrebleEighthNoteGlyph
            staffStep={upperStep}
            metrics={metrics}
            cx={UPPER_X}
            tone={upperTone}
          />
        ) : null}
      </svg>
    </div>
  );
}

interface IntervalWriteStaffProps {
  lower: TrebleNaturalNote;
  marks: Array<{ step: number; tone: EighthNoteTone }>;
  disabled: boolean;
  onPick: (staffStep: number) => void;
}

/** Pauta maior: a nota grave fica fixa e o toque define a aguda. */
export function IntervalWriteStaff({
  lower,
  marks,
  disabled,
  onPick,
}: IntervalWriteStaffProps) {
  const metrics: TrebleStaffLayoutMetrics = TREBLE_STAFF_METRICS_TOUCH;
  const lines = trebleStaffLineYs(metrics);
  const staff = gameStaffSize(200, metrics.viewHeight, metrics.lineGap);
  const svgRef = useRef<SVGSVGElement>(null);

  const pickFromY = useCallback(
    (clientY: number) => {
      if (disabled || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const y = ((clientY - rect.top) / rect.height) * metrics.viewHeight;
      onPick(trebleYToStaffStep(y, metrics));
    },
    [disabled, metrics, onPick],
  );

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    pickFromY(event.clientY);
  };

  return (
    <div className="relative mx-auto flex w-full items-center justify-center overflow-x-auto text-[var(--foreground)]">
      <TrebleClefSymbol
        className="pointer-events-none shrink-0 self-center text-[var(--foreground)]"
        style={{ height: staff.height, width: staff.clefWidth }}
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 200 ${metrics.viewHeight}`}
        className={`shrink-0 touch-none ${
          disabled ? 'cursor-default' : 'cursor-crosshair'
        }`}
        style={{ height: staff.height, width: staff.width }}
        aria-label="Partitura. Toque na altura da nota aguda."
        onPointerDown={onPointerDown}
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
          staffStep={lower.staffStep}
          metrics={metrics}
          cx={LOWER_X}
        />
        {marks.map((mark) => (
          <TrebleEighthNoteGlyph
            key={`${mark.tone}-${mark.step}`}
            staffStep={mark.step}
            metrics={metrics}
            cx={UPPER_X}
            tone={mark.tone}
          />
        ))}
      </svg>
    </div>
  );
}
