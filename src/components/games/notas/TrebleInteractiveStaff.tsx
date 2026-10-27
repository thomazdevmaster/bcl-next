'use client';

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { TrebleClefSymbol } from '@/components/games/notas/TrebleClefSymbol';
import type { TrebleNaturalNote } from '@/domains/games/notas/trebleNaturals1Notes';
import {
  TREBLE_LEDGER_HALF,
  TREBLE_NOTE_X,
  TREBLE_STAFF_METRICS_TOUCH,
  trebleStaffLineYs,
  trebleStaffStepsInRange,
  trebleStepCenterY,
  trebleYToStaffStep,
} from '@/domains/games/notas/trebleStaffLayout';

const STAFF = TREBLE_STAFF_METRICS_TOUCH;

/** Altura da faixa de toque (viewBox); ~2× o espaço entre linhas. */
const TOUCH_BAND_HEIGHT = STAFF.lineGap * 2;

type StaffFeedback = 'idle' | 'correct' | 'wrong';

interface TrebleInteractiveStaffProps {
  feedback: StaffFeedback;
  target: TrebleNaturalNote | null;
  chosenStaffStep: number | null;
  previewStaffStep: number | null;
  disabled: boolean;
  /** true = celular: faixas largas; false = desktop: clique fino na coordenada Y. */
  useTouchBands: boolean;
  onPickStaffStep: (staffStep: number) => void;
  className?: string;
}

function ledgerForStep(staffStep: number): boolean {
  return staffStep <= -2 || staffStep >= 10;
}

function NoteHead({
  staffStep,
  tone,
}: {
  staffStep: number;
  tone: 'default' | 'preview' | 'correct' | 'wrong';
}) {
  const noteY = trebleStepCenterY(staffStep, STAFF);
  const stroke =
    tone === 'correct'
      ? 'var(--color-brand)'
      : tone === 'wrong'
        ? 'var(--destructive)'
        : 'currentColor';
  const dash = tone === 'preview' ? '4 3' : undefined;
  const opacity = tone === 'preview' ? 0.85 : 1;

  return (
    <>
      {ledgerForStep(staffStep) ? (
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
        rx={11}
        ry={8}
        fill="none"
        stroke={stroke}
        strokeWidth={2.2}
        strokeDasharray={dash}
        opacity={opacity}
      />
    </>
  );
}

/** Pauta clicável: toque na altura da nota pedida (estilo Musicca exercício 2). */
export function TrebleInteractiveStaff({
  feedback,
  target,
  chosenStaffStep,
  previewStaffStep,
  disabled,
  useTouchBands,
  onPickStaffStep,
  className = '',
}: TrebleInteractiveStaffProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lines = trebleStaffLineYs(STAFF);
  const touchSteps = trebleStaffStepsInRange();

  const handlePointerY = useCallback(
    (clientY: number) => {
      if (disabled || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const y = ((clientY - rect.top) / rect.height) * STAFF.viewHeight;
      onPickStaffStep(trebleYToStaffStep(y, STAFF));
    },
    [disabled, onPickStaffStep],
  );

  const handleBandPointer = useCallback(
    (event: ReactPointerEvent<SVGRectElement>, staffStep: number) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onPickStaffStep(staffStep);
    },
    [disabled, onPickStaffStep],
  );

  const showTarget =
    feedback !== 'idle' && target ? (
      <NoteHead staffStep={target.staffStep} tone="correct" />
    ) : null;

  const showChosen =
    feedback === 'wrong' && chosenStaffStep !== null ? (
      <NoteHead staffStep={chosenStaffStep} tone="wrong" />
    ) : null;

  const showPreview =
    feedback === 'idle' && previewStaffStep !== null ? (
      <NoteHead staffStep={previewStaffStep} tone="preview" />
    ) : null;

  return (
    <div
      className={`relative mx-auto flex w-full max-w-full touch-none select-none items-stretch ${className}`}
    >
      <TrebleClefSymbol className="pointer-events-none h-[14rem] w-[7rem] shrink-0 self-center -mr-1 text-[var(--foreground)] sm:h-[15rem] sm:w-[7.5rem]" />
      <svg
        ref={svgRef}
        viewBox={`0 0 200 ${STAFF.viewHeight}`}
        className={`min-h-[14rem] h-[14rem] w-full flex-1 text-[var(--foreground)] sm:h-[15rem] sm:min-h-[15rem] ${
          disabled ? 'cursor-default' : useTouchBands ? 'cursor-pointer' : 'cursor-crosshair'
        }`}
        role="img"
        aria-label="Partitura em clave de sol. Toque na altura da nota."
        onPointerDown={
          !disabled && !useTouchBands
            ? (event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                event.preventDefault();
                handlePointerY(event.clientY);
              }
            : undefined
        }
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
        {!disabled && !useTouchBands ? (
          <rect
            x={0}
            y={0}
            width={200}
            height={STAFF.viewHeight}
            fill="transparent"
            aria-hidden
          />
        ) : null}
        {showPreview}
        {showChosen}
        {showTarget}
        {!disabled && useTouchBands
          ? touchSteps.map((staffStep) => {
              const centerY = trebleStepCenterY(staffStep, STAFF);
              return (
                <rect
                  key={staffStep}
                  x={0}
                  y={centerY - TOUCH_BAND_HEIGHT / 2}
                  width={200}
                  height={TOUCH_BAND_HEIGHT}
                  fill="transparent"
                  className="touch-manipulation"
                  aria-hidden
                  onPointerDown={(event) => handleBandPointer(event, staffStep)}
                />
              );
            })
          : null}
      </svg>
    </div>
  );
}
