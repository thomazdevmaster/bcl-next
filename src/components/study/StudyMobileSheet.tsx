'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { StudyInstrumentPanel } from '@/components/StudyInstrumentPanel';
import { StudyPlayerPanel } from '@/components/StudyPlayerPanel';
import { youtubeWatchUrl } from '@/domains/songs/youtube';
import type { StudySession, StudyViewSnapshot } from '@/study/studySession';
import { MobileScoreZoom } from '@/study/MobileScoreZoom';

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
  const startY = useRef<number | null>(null);
  const dragged = useRef(false);
  const watchUrl = youtubeWatchUrl(videoUrl ?? '');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    startY.current = event.clientY;
    dragged.current = false;
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (startY.current == null) return;
    const delta = event.clientY - startY.current;
    startY.current = null;
    if (delta < -28) {
      dragged.current = true;
      setOpen(true);
    } else if (delta > 28) {
      dragged.current = true;
      setOpen(false);
    }
  };

  return (
    <>
      <div className="h-[6.25rem] shrink-0 pointer-events-none" aria-hidden />
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[1004] bg-black/45"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div
        className="fixed bottom-0 left-0 right-0 z-[1005] flex max-h-[100dvh] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? 'Menu do estudo' : undefined}
      >
        <button
          type="button"
          className="flex h-11 w-full touch-none items-center justify-center text-[var(--muted)]"
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setOpen((current) => !current);
          }}
        >
          <span className="material-icons text-xl leading-none" aria-hidden>
            {open ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
          </span>
        </button>

        {open ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
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
                selectionMatchesApplied={state.instruments.selectionMatchesApplied}
                filter={state.instruments.filter}
                loading={state.loading}
                xmlLoaded={state.xmlLoaded}
                allSelected={state.instruments.allSelected}
                midiAllSelected={state.instruments.midiAllSelected}
                onFilterChange={(value) => session.setInstrumentFilter(value)}
                onToggle={(id, checked) => session.toggleInstrument(id, checked)}
                onToggleMidi={(id, checked) => session.toggleMidiInstrument(id, checked)}
                onSelectAllChange={(checked) =>
                  checked ? session.selectAllInstruments() : session.clearSelectedInstruments()
                }
                onSelectAllMidiChange={(checked) =>
                  checked ? session.selectAllMidiInstruments() : session.clearSelectedMidiInstruments()
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
          </div>
        ) : null}

        {open && !state.instruments.selectionMatchesApplied ? (
          <div className="flex gap-2 border-t border-[var(--border)] px-4 py-2">
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

        {open && watchUrl ? (
          <div className="px-4 pb-2">
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2"
            >
              <span className="material-icons text-lg" aria-hidden>
                smart_display
              </span>
              YouTube
            </a>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-2 px-3 py-1.5">
          <MobileScoreZoom session={session} state={state} />
          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void session.play()}
            disabled={state.loading || !state.xmlLoaded}
            aria-label="Play"
          >
            <span className="material-icons text-3xl">play_arrow</span>
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => session.pause()}
            disabled={state.loading || !state.xmlLoaded}
            aria-label="Pausar"
          >
            <span className="material-icons">pause</span>
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => session.stop()}
            disabled={state.loading || !state.xmlLoaded}
            aria-label="Parar"
          >
            <span className="material-icons">stop</span>
          </button>
        </div>
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
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open ? <div className="pb-3">{children}</div> : null}
    </div>
  );
}
