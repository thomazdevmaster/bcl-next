import { RhythmGlyph } from '@/components/games/ritmos/RhythmGlyph';
import type { RhythmFigure } from '@/domains/games/ritmos/rhythmFigures';

interface RhythmStaffProps {
  figures: RhythmFigure[];
  missingBeats?: number;
  compact?: boolean;
  className?: string;
}

/** Pauta de uma linha com figuras espaçadas pela duração. */
export function RhythmStaff({
  figures,
  missingBeats = 0,
  compact = false,
  className = '',
}: RhythmStaffProps) {
  const label = [
    ...figures.map((figure) => figure.label),
    missingBeats > 0 ? 'espaço em branco' : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className={`relative flex w-full items-center ${compact ? 'h-16' : 'h-24'} ${className}`}
      role="img"
      aria-label={label || 'Compasso vazio'}
    >
      <div className="pointer-events-none absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-current opacity-55" />
      <div className="relative flex h-full w-full items-center">
        {figures.map((figure, index) => (
          <div
            key={`${figure.id}-${index}`}
            className="flex h-full min-w-0 items-center justify-center"
            style={{ flexGrow: figure.beats, flexBasis: 0 }}
          >
            <RhythmGlyph
              figure={figure}
              className={compact ? 'h-14 w-8' : 'h-[5.25rem] w-10'}
            />
          </div>
        ))}
        {missingBeats > 0 ? (
          <div
            className="flex h-full min-w-0 items-center justify-center px-1"
            style={{ flexGrow: missingBeats, flexBasis: 0 }}
          >
            <span className="inline-flex h-10 w-full max-w-16 items-center justify-center rounded-md border border-dashed border-current text-sm font-semibold opacity-70">
              ?
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
