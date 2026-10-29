import {
  TREBLE_LEDGER_HALF,
  type TrebleStaffLayoutMetrics,
  trebleStepCenterY,
} from '@/domains/games/notas/trebleStaffLayout';

export type EighthNoteTone = 'default' | 'preview' | 'correct' | 'wrong';

/** Haste para cima na linha do meio e abaixo (convenção da partitura). */
export function eighthStemPointsUp(staffStep: number): boolean {
  return staffStep <= 4;
}

function toneColor(tone: EighthNoteTone): string {
  if (tone === 'correct') return 'var(--color-brand)';
  if (tone === 'wrong') return 'var(--destructive)';
  return 'currentColor';
}

interface TrebleEighthNoteGlyphProps {
  staffStep: number;
  metrics: TrebleStaffLayoutMetrics;
  cx: number;
  tone?: EighthNoteTone;
}

/** Colcheia (cabeça preenchida, haste e bandeirola). */
export function TrebleEighthNoteGlyph({
  staffStep,
  metrics,
  cx,
  tone = 'default',
}: TrebleEighthNoteGlyphProps) {
  const cy = trebleStepCenterY(staffStep, metrics);
  const stemUp = eighthStemPointsUp(staffStep);
  const color = toneColor(tone);
  const preview = tone === 'preview';
  const headRx = metrics.lineGap * 0.78;
  const headRy = metrics.lineGap * 0.52;
  const stemLen = metrics.lineGap * 3.05;
  const stemX = stemUp ? cx + headRx * 0.78 : cx - headRx * 0.78;
  const stemEnd = stemUp ? cy - stemLen : cy + stemLen;
  const gap = metrics.lineGap;
  const flag = stemUp
    ? `M ${stemX} ${stemEnd} c ${gap * 0.15} ${gap * 0.45}, ${gap * 0.95} ${gap * 0.7}, ${gap * 1.2} ${gap * 1.45} c ${-gap * 0.7} ${-gap * 0.28}, ${-gap * 1.05} ${-gap * 0.85}, ${-gap * 1.2} ${-gap * 0.42}`
    : `M ${stemX} ${stemEnd} c ${gap * 0.15} ${-gap * 0.45}, ${gap * 0.95} ${-gap * 0.7}, ${gap * 1.2} ${-gap * 1.45} c ${-gap * 0.7} ${gap * 0.28}, ${-gap * 1.05} ${gap * 0.85}, ${-gap * 1.2} ${gap * 0.42}`;
  const needsLedger = staffStep <= -2 || staffStep >= 10;

  return (
    <g opacity={preview ? 0.9 : 1}>
      {needsLedger ? (
        <line
          x1={cx - TREBLE_LEDGER_HALF}
          y1={cy}
          x2={cx + TREBLE_LEDGER_HALF}
          y2={cy}
          stroke="currentColor"
          strokeWidth={1.2}
          opacity={0.55}
        />
      ) : null}
      <ellipse
        cx={cx}
        cy={cy}
        rx={headRx}
        ry={headRy}
        transform={`rotate(-20 ${cx} ${cy})`}
        fill={preview ? 'none' : color}
        stroke={color}
        strokeWidth={preview ? 1.7 : 1}
        strokeDasharray={preview ? '3 2' : undefined}
      />
      <line
        x1={stemX}
        y1={cy - (stemUp ? headRy * 0.15 : -headRy * 0.15)}
        x2={stemX}
        y2={stemEnd}
        stroke={color}
        strokeWidth={Math.max(1.35, gap * 0.11)}
        strokeLinecap="round"
        strokeDasharray={preview ? '3 2' : undefined}
      />
      <path
        d={flag}
        fill={preview ? 'none' : color}
        stroke={color}
        strokeWidth={preview ? 1.3 : 0.4}
        strokeLinejoin="round"
        strokeDasharray={preview ? '3 2' : undefined}
      />
    </g>
  );
}
