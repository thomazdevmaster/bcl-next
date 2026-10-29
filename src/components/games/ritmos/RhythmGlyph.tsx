import type { RhythmFigure } from '@/domains/games/ritmos/rhythmFigures';
import { GAME_STAFF_LINE_GAP_PX } from '@/domains/games/notas/trebleStaffLayout';

const VIEW_W = 40;
const VIEW_H = 64;
/** Diâmetro vertical da cabeça (2 × ry 6.2), no viewBox. */
const HEAD_DIAMETER = 12.4;
/** Cabeça da colcheia na pauta: 2 × lineGap × 0.52. */
const TREBLE_HEAD_PX = GAME_STAFF_LINE_GAP_PX * 1.04;

export const RHYTHM_GLYPH_HEIGHT_PX = Math.round(
  (TREBLE_HEAD_PX * VIEW_H) / HEAD_DIAMETER,
);
export const RHYTHM_GLYPH_WIDTH_PX = Math.round(
  RHYTHM_GLYPH_HEIGHT_PX * (VIEW_W / VIEW_H),
);

const HEAD_Y = 34;

function NoteHead({
  filled,
  dotted,
}: {
  filled: boolean;
  dotted: boolean;
}) {
  return (
    <>
      <ellipse
        cx={16}
        cy={HEAD_Y}
        rx={9}
        ry={6.2}
        transform={`rotate(-18 16 ${HEAD_Y})`}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 1 : 1.8}
      />
      {dotted ? <circle cx={30} cy={HEAD_Y - 5} r={2.1} fill="currentColor" /> : null}
    </>
  );
}

function Stem({ flags }: { flags: 0 | 1 | 2 }) {
  const stemX = 23.2;
  const stemTop = 8;
  return (
    <>
      <line
        x1={stemX}
        y1={HEAD_Y - 1}
        x2={stemX}
        y2={stemTop}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {flags >= 1 ? (
        <path
          d={`M ${stemX} ${stemTop} c 2 6, 10 8, 12 16 c -8 -2, -11 -8, -12 -6`}
          fill="currentColor"
        />
      ) : null}
      {flags >= 2 ? (
        <path
          d={`M ${stemX} ${stemTop + 7} c 2 6, 10 8, 12 16 c -8 -2, -11 -8, -12 -6`}
          fill="currentColor"
        />
      ) : null}
    </>
  );
}

function RestShape({ id }: { id: RhythmFigure['id'] }) {
  if (id === 'rest-whole' || id === 'rest-half') {
    const hanging = id === 'rest-whole';
    return (
      <rect
        x={10}
        y={hanging ? HEAD_Y : HEAD_Y - 7}
        width={16}
        height={7}
        rx={0.6}
        fill="currentColor"
      />
    );
  }
  if (id === 'rest-quarter') {
    return (
      <path
        d="M24 8c-10 6 8 10-6 16-8 4 8 6-2 12-6 4 6 6 2 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  return (
    <>
      <path
        d="M22 12c-10 8 6 10-2 18"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx={14} cy={38} r={2.3} fill="currentColor" />
    </>
  );
}

function NoteShape({ figure }: { figure: RhythmFigure }) {
  if (figure.id === 'whole' || figure.id === 'rest-whole') {
    return <NoteHead filled={false} dotted={false} />;
  }
  const filled = figure.id !== 'half' && figure.id !== 'dotted-half';
  const flags = figure.id === 'sixteenth' ? 2 : figure.id === 'eighth' ? 1 : 0;
  return (
    <>
      <NoteHead filled={filled} dotted={figure.dotted} />
      <Stem flags={flags} />
    </>
  );
}

interface RhythmGlyphProps {
  figure: RhythmFigure;
  className?: string;
}

/** Figura rítmica isolada, no mesmo tamanho da cabeça das notas da pauta. */
export function RhythmGlyph({ figure, className = '' }: RhythmGlyphProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`shrink-0 ${className}`}
      style={{ height: RHYTHM_GLYPH_HEIGHT_PX, width: RHYTHM_GLYPH_WIDTH_PX }}
      aria-hidden
    >
      {figure.rest ? <RestShape id={figure.id} /> : <NoteShape figure={figure} />}
    </svg>
  );
}
