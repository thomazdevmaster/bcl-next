'use client';

import type { PlaygroundZoomState } from './playgroundZoomTypes';

export function ScorePlaygroundZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  compact = false,
}: {
  zoom: PlaygroundZoomState | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  compact?: boolean;
}) {
  if (!zoom || (!zoom.canZoomIn && !zoom.canZoomOut)) return null;

  return (
    <div className="flex items-center gap-1">
      {!compact ? (
        <span className="hidden min-w-[5.5rem] text-right text-xs tabular-nums text-[var(--muted)] sm:inline">
          {zoom.label}
        </span>
      ) : null}
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onZoomOut}
        disabled={!zoom.canZoomOut}
        aria-label={`Diminuir zoom (${zoom.label})`}
      >
        <span className="material-icons" aria-hidden>
          zoom_out
        </span>
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onZoomIn}
        disabled={!zoom.canZoomIn}
        aria-label={`Aumentar zoom (${zoom.label})`}
      >
        <span className="material-icons" aria-hidden>
          zoom_in
        </span>
      </button>
    </div>
  );
}
