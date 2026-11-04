"use client";

import { MusicLoader } from "@/components/MusicLoader";
import { MobileScoreZoom } from "@/study/MobileScoreZoom";
import type { StudySession, StudyViewSnapshot } from "@/study/studySession";

interface StudyMobileTransportControlsProps {
  session: StudySession;
  state: StudyViewSnapshot;
  showOptionsButton: boolean;
  optionsOpen: boolean;
  onOpenOptions: () => void;
}

export function StudyMobileTransportControls({
  session,
  state,
  showOptionsButton,
  optionsOpen,
  onOpenOptions,
}: StudyMobileTransportControlsProps) {
  const transportBlocked =
    state.loading || !state.xmlLoaded || state.audioPreparing;

  return (
    <div className="flex h-[3.25rem] shrink-0 items-center justify-center gap-1 px-2">
      {showOptionsButton ? (
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
          onClick={onOpenOptions}
          aria-expanded={optionsOpen}
          aria-label="Mais opções"
        >
          <span className="material-icons text-xl" aria-hidden>
            tune
          </span>
        </button>
      ) : null}
      <MobileScoreZoom session={session} state={state} />
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => void session.play()}
        disabled={transportBlocked}
        aria-busy={state.audioPreparing}
        aria-label={state.audioPreparing ? "Preparando áudio" : "Play"}
      >
        {state.audioPreparing ? (
          <MusicLoader compact label="" className="py-0" tone="current" />
        ) : (
          <span className="material-icons text-3xl">play_arrow</span>
        )}
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => session.pause()}
        disabled={transportBlocked}
        aria-label="Pausar"
      >
        <span className="material-icons">pause</span>
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => session.stop()}
        disabled={transportBlocked}
        aria-label="Parar"
      >
        <span className="material-icons">stop</span>
      </button>
    </div>
  );
}
