import type { RhythmFigure } from '@/domains/games/ritmos/rhythmFigures';

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
  const stemmed = figure.id !== 'whole';
  return (
    <>
      <NoteHead filled={filled} dotted={figure.dotted} />
      {stemmed ? <Stem flags={flags} /> : null}
    </>
  );
}

interface RhythmGlyphProps {
  figure: RhythmFigure;
  className?: string;
}

/** Figura rítmica isolada, com a cabeça alinhada ao centro vertical. */
export function RhythmGlyph({ figure, className = '' }: RhythmGlyphProps) {
  return (
    <svg viewBox="0 0 40 64" className={className} aria-hidden>
      {figure.rest ? <RestShape id={figure.id} /> : <NoteShape figure={figure} />}
    </svg>
  );
}
