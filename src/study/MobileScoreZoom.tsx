'use client';

import type { StudySession, StudyViewSnapshot } from '@/study/studySession';

export function MobileScoreZoom({
  session,
  state,
}: {
  session: StudySession;
  state: StudyViewSnapshot;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => session.zoomMobile('out')}
        disabled={!state.canZoomMobileOut}
        aria-label={`Diminuir zoom, ${state.mobileMeasuresPerLine} compassos por linha`}
      >
        <span className="material-icons" aria-hidden>
          zoom_out
        </span>
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => session.zoomMobile('in')}
        disabled={!state.canZoomMobileIn}
        aria-label={`Aumentar zoom, ${state.mobileMeasuresPerLine} compassos por linha`}
      >
        <span className="material-icons" aria-hidden>
          zoom_in
        </span>
      </button>
    </div>
  );
}
