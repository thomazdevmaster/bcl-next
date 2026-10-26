"use client";

import { type ReactNode, useState } from "react";

import { MusicLoader } from "@/components/MusicLoader";
import { StudyInstrumentPanel } from "@/components/StudyInstrumentPanel";
import { StudyPlayerPanel } from "@/components/StudyPlayerPanel";
import { EntityDialog } from "@/components/shared/EntityDialog";
import { youtubeWatchUrl } from "@/domains/songs/youtube";
import { MobileScoreZoom } from "@/study/MobileScoreZoom";
import type { StudySession, StudyViewSnapshot } from "@/study/studySession";

/** Reserva espaço para a barra fixa de controles (rolagem da partitura). */
export const STUDY_MOBILE_FOOTER_HEIGHT =
  "calc(3.25rem + env(safe-area-inset-bottom, 0px))";

export function StudyMobileSheet({
  session,
  state,
  videoUrl,
  onBack,
}: {
  session: StudySession;
  state: StudyViewSnapshot;
  videoUrl: string | null;
  onBack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [instrumentsOpen, setInstrumentsOpen] = useState(false);
  const watchUrl = youtubeWatchUrl(videoUrl ?? "");
  const transportBlocked =
    state.loading || !state.xmlLoaded || state.audioPreparing;

  const renderTransportControls = (showOptionsButton: boolean) => (
    <div className="flex h-[3.25rem] shrink-0 items-center justify-center gap-1 px-2">
      {showOptionsButton ? (
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
          onClick={() => setOpen(true)}
          aria-expanded={open}
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

  return (
    <>
      <div
        className="shrink-0 pointer-events-none"
        style={{ height: STUDY_MOBILE_FOOTER_HEIGHT }}
        aria-hidden
      />
      <EntityDialog
        open={open}
        title="Opções do estudo"
        description="Configure o player e os instrumentos da sessão."
        size="xl"
        placement="bottom"
        onClose={() => setOpen(false)}
      >
        {open ? (
          <div className="max-h-[min(70dvh,28rem)] min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2">
            <button
              type="button"
              className="btn-outline-primary mb-3 inline-flex min-h-11 w-full items-center justify-center gap-2"
              onClick={onBack}
            >
              <span className="material-icons text-lg" aria-hidden>
                arrow_back
              </span>
              Voltar
            </button>

            <SheetSection
              title="Player"
              open={playerOpen}
              onToggle={() => setPlayerOpen((current) => !current)}
            >
              <StudyPlayerPanel
                settingsOnly
                state={{
                  loading: state.loading,
                  playerReady: state.playerReady,
                  playerLoading: state.playerLoading,
                  midiLoaded: state.midiLoaded,
                  midiLoading: state.midiLoading,
                  playerError: state.playerError,
                  audioReady: state.audioReady,
                  audioPreparing: state.audioPreparing,
                  playerExpanded: true,
                  bpm: state.bpm,
                  bpmMin: state.bpmMin,
                  bpmMax: state.bpmMax,
                  timeSignature: state.timeSignature,
                  baseBpm: state.baseBpm,
                  metronomeEnabled: state.metronomeEnabled,
                  metronomeVolume: state.metronomeVolume,
                  audioVolume: state.audioVolume,
                  loopEnabled: state.loopEnabled,
                  loopStartMeasure: state.loopStartMeasure,
                  loopEndMeasure: state.loopEndMeasure,
                }}
                onPlay={() => undefined}
                onPause={() => undefined}
                onStop={() => undefined}
                onToggleExpanded={() => undefined}
                onTempo={(value) => session.setTempo(value)}
                onAudioVolume={(value) => session.setAudioVolume(value)}
                onToggleMetronome={() => session.toggleMetronome()}
                onMetronomeVolume={(value) => session.setMetronomeVolume(value)}
                onToggleLoop={() => session.toggleLoop()}
                onLoopStart={(value) => session.setLoopStartMeasure(value)}
                onLoopEnd={(value) => session.setLoopEndMeasure(value)}
              />
            </SheetSection>

            <SheetSection
              title="Instrumentos"
              open={instrumentsOpen}
              onToggle={() => setInstrumentsOpen((current) => !current)}
            >
              <p className="mb-2 text-sm text-[var(--muted)]">
                Uma pauta na partitura. O MIDI pode reunir vários instrumentos.
              </p>
              <StudyInstrumentPanel
                embedded
                hideActions
                singleScore
                available={state.instruments.available}
                selectedIds={state.instruments.selectedIds}
                midiSelectedIds={state.instruments.midiSelectedIds}
                filtered={state.instruments.filtered}
                selectionMatchesApplied={
                  state.instruments.selectionMatchesApplied
                }
                filter={state.instruments.filter}
                loading={state.loading}
                xmlLoaded={state.xmlLoaded}
                allSelected={state.instruments.allSelected}
                midiAllSelected={state.instruments.midiAllSelected}
                onFilterChange={(value) => session.setInstrumentFilter(value)}
                onToggle={(id, checked) =>
                  session.toggleInstrument(id, checked)
                }
                onToggleMidi={(id, checked) =>
                  session.toggleMidiInstrument(id, checked)
                }
                onSelectAllChange={(checked) =>
                  checked
                    ? session.selectAllInstruments()
                    : session.clearSelectedInstruments()
                }
                onSelectAllMidiChange={(checked) =>
                  checked
                    ? session.selectAllMidiInstruments()
                    : session.clearSelectedMidiInstruments()
                }
                onApply={() => {
                  session.applySelectedInstruments();
                  setOpen(false);
                }}
                onCancel={() => session.cancelInstrumentSelection()}
                onRestore={() => session.restoreAppliedInstruments()}
                onClose={() => setInstrumentsOpen(false)}
              />
            </SheetSection>

            {watchUrl ? (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2"
              >
                <span className="material-icons text-lg" aria-hidden>
                  smart_display
                </span>
                YouTube
              </a>
            ) : null}

            {!state.instruments.selectionMatchesApplied ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn-primary min-h-11 flex-1 text-sm disabled:cursor-not-allowed"
                  onClick={() => {
                    session.applySelectedInstruments();
                    setOpen(false);
                  }}
                  disabled={state.loading || !state.xmlLoaded}
                >
                  Gerar com selecionados
                </button>
                <button
                  type="button"
                  className="btn-outline-primary min-h-11 shrink-0 text-sm disabled:cursor-not-allowed"
                  onClick={() => session.cancelInstrumentSelection()}
                  disabled={state.loading}
                >
                  Cancelar
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {renderTransportControls(false)}
      </EntityDialog>
      {!open ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[1005] border-t border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {renderTransportControls(true)}
        </div>
      ) : null}
    </>
  );
}

function SheetSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-medium"
        aria-expanded={open}
        onClick={onToggle}
      >
        {title}
        <span className="material-icons" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open ? <div className="pb-3">{children}</div> : null}
    </div>
  );
}
