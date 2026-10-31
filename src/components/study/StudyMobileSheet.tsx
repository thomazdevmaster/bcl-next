"use client";

import { type ReactNode, useState } from "react";

import { StudyInstrumentPanel } from "@/components/StudyInstrumentPanel";
import { StudyPlayerPanel } from "@/components/StudyPlayerPanel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/shared/Sheet";
import { youtubeWatchUrl } from "@/domains/songs/youtube";
import type { StudySession, StudyViewSnapshot } from "@/study/studySession";

import { StudyMobileTransportControls } from "./StudyMobileTransportControls";

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

  return (
    <>
      <div
        className="shrink-0 pointer-events-none"
        style={{ height: STUDY_MOBILE_FOOTER_HEIGHT }}
        aria-hidden
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="gap-0">
          <SheetHeader className="border-b border-[var(--border)] px-4 pt-4 pb-3">
            <SheetTitle>Opções do estudo</SheetTitle>
            <SheetDescription>
              Configure o player e os instrumentos da sessão.
            </SheetDescription>
          </SheetHeader>
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
                  onMetronomeVolume={(value) =>
                    session.setMetronomeVolume(value)
                  }
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
                  Uma pauta na partitura. O MIDI pode reunir vários
                  instrumentos.
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
          <StudyMobileTransportControls
            session={session}
            state={state}
            showOptionsButton={false}
            optionsOpen={open}
            onOpenOptions={() => setOpen(true)}
          />
        </SheetContent>
      </Sheet>
      <div
        aria-hidden={open}
        inert={open}
        className={`fixed bottom-0 left-0 right-0 z-[1005] border-t border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] ${open ? "pointer-events-none opacity-0" : ""}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <StudyMobileTransportControls
          session={session}
          state={state}
          showOptionsButton
          optionsOpen={open}
          onOpenOptions={() => setOpen(true)}
        />
      </div>
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
