'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getApiUrl } from '@/config/environment';
import { useAuth } from '@/contexts/AuthContext';
import { useStudySession } from '@/study/useStudySession';
import { MusicLoader } from '@/components/MusicLoader';
import { StudyInstrumentPanel } from '@/components/StudyInstrumentPanel';
import { StudyPlayerPanel } from '@/components/StudyPlayerPanel';
import {
  StudySongCatalog,
  type StudyStartOptions,
} from '@/components/study/StudySongCatalog';
import { youtubeEmbedUrl, youtubeWatchUrl } from '@/domains/songs/youtube';
import { StudyMobileSheet } from '@/components/study/StudyMobileSheet';
import { MobileScoreZoom } from '@/study/MobileScoreZoom';

export default function StudyPage() {
  const apiUrl = getApiUrl();
  const { user } = useAuth();
  const params = useParams<{ slug?: string[] }>();
  const focusSongId = params?.slug?.[0] ?? null;

  const [snack, setSnack] = useState<string | null>(null);
  const { session, state, scoreContainerRef, osmdContainerRef } = useStudySession(
    () => apiUrl,
    (m) => {
      setSnack(m);
      window.setTimeout(() => setSnack(null), 4000);
    },
  );

  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const showInitialContent =
    !state.xmlLoaded &&
    !state.scoreLoading &&
    !selectedSongId;

  const instrumentsOpen =
    state.xmlLoaded &&
    state.instruments.available.length >= 1 &&
    !state.instruments.cardCollapsed;

  useEffect(() => {
    session.setOwnerId(user?.id != null ? String(user.id) : null);
  }, [session, user?.id]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const onChange = () => {
      session.updateMobile(mq.matches);
    };
    session.updateMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [session]);

  useEffect(() => {
    document.body.classList.toggle('study-fullscreen-active', state.fullscreenScore);
    document.body.classList.toggle(
      'study-mobile-fullscreen-active',
      state.fullscreenScore && state.isMobile,
    );
    return () => {
      document.body.classList.remove('study-fullscreen-active');
      document.body.classList.remove('study-mobile-fullscreen-active');
    };
  }, [state.fullscreenScore, state.isMobile]);

  useEffect(() => {
    const el = scoreContainerRef.current;
    if (!el || !state.isMobile || !state.xmlLoaded) return;
    let startDistance = 0;
    let applied = false;
    const distance = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      if (!a || !b) return 0;
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        startDistance = distance(event.touches);
        applied = false;
      }
    };
    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || applied || startDistance <= 0) return;
      const ratio = distance(event.touches) / startDistance;
      if (ratio > 1.15) {
        applied = true;
        event.preventDefault();
        session.zoomMobile('in');
      } else if (ratio < 0.87) {
        applied = true;
        event.preventDefault();
        session.zoomMobile('out');
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, [scoreContainerRef, session, state.isMobile, state.xmlLoaded]);

  useEffect(() => {
    const onBlur = () => session.pause();
    const onVis = () => {
      if (document.hidden) session.pause();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [session]);

  const backToExamples = useCallback(() => {
    session.reset();
    setSelectedSongId(null);
    setVideoUrl(null);
    setVideoOpen(false);
  }, [session]);

  const startStudy = ({
    song,
    xml,
    scoreInstrumentIds,
    midiInstrumentIds,
    instruments,
    fullScoreUrl,
  }: StudyStartOptions) => {
    const songId = String(song.id);
    setSelectedSongId(songId);
    setVideoUrl(song.videoUrl?.trim() ? song.videoUrl : null);
    setVideoOpen(false);
    void session.loadStudy(xml, songId, song.title, {
      scoreInstrumentIds,
      midiInstrumentIds,
      catalog: instruments,
      fullScoreUrl,
    });
  };

  const playerSlice = useMemo(
    () => ({
      loading: state.loading,
      playerReady: state.playerReady,
      playerLoading: state.playerLoading,
      midiLoaded: state.midiLoaded,
      midiLoading: state.midiLoading,
      playerError: state.playerError,
      playerExpanded: state.playerExpanded,
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
    }),
    [state],
  );

  const showScoreBlock =
    state.xmlLoaded || state.scoreLoading || selectedSongId;

  const desktopInstruments =
    state.xmlLoaded &&
    state.instruments.available.length >= 1 &&
    !(state.fullscreenScore && state.isMobile);

  const mobileInstruments =
    state.xmlLoaded &&
    state.instruments.available.length >= 1 &&
    state.isMobile &&
    !state.fullscreenScore;

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-5 pb-5 ${
        state.fullscreenScore
          ? `fixed inset-0 z-[1001] h-[100dvh] max-h-[100dvh] w-screen overflow-hidden pb-0 ${
              state.isMobile && state.xmlLoaded ? 'bg-[var(--score-canvas)]' : 'bg-[var(--background)]'
            }`
          : ''
      }`}
    >
      {snack ? <div className="fixed bottom-20 left-1/2 z-[1200] -translate-x-1/2 rounded-[var(--radius)] bg-[var(--color-ink)] px-4 py-2.5 text-sm text-[var(--header-fg)] shadow-[var(--shadow-soft)]" role="status">{snack}</div> : null}

      {state.scoreLoading && !state.xmlLoaded ? (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[var(--background)]">
          <MusicLoader label="Carregando partitura…" />
        </div>
      ) : null}

      {!state.fullscreenScore && (
        <header className="flex flex-wrap items-end justify-between gap-4 px-4 py-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-icons text-3xl text-primary" aria-hidden>
                music_note
              </span>
              <h1 className="m-0 text-3xl font-semibold tracking-tight">Estudo</h1>
            </div>
            <p className="mt-1 max-w-4xl text-[var(--muted)]">
              Escolha uma música, configure a partitura e o MIDI e comece a praticar.
            </p>
          </div>
          {state.xmlLoaded ? (
            <button type="button" className="btn-outline-primary inline-flex min-h-11 items-center gap-1.5" onClick={backToExamples}>
              <span className="material-icons text-lg" aria-hidden>
                arrow_back
              </span>
              Escolher outra música
            </button>
          ) : null}
        </header>
      )}

      {showInitialContent ? (
        <StudySongCatalog
          onStart={startStudy}
          ownerId={user?.id != null ? String(user.id) : null}
          personId={user?.personId != null ? String(user.personId) : null}
          initialSongId={focusSongId}
        />
      ) : null}

      <div className={`relative flex min-h-0 flex-1 gap-4 ${state.fullscreenScore && state.isMobile ? 'study-mobile-fullscreen flex-col' : 'flex-col lg:flex-row lg:items-start'}`}>
        {mobileInstruments && instrumentsOpen ? (
          <aside className="fixed bottom-0 left-0 top-0 z-[1100] flex w-[90vw] max-w-80 translate-x-0 flex-col border-r border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]" role="dialog" aria-label="Menu de instrumentos">
            <StudyInstrumentPanel
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
              onFilterChange={(v) => session.setInstrumentFilter(v)}
              onToggle={(id, c) => session.toggleInstrument(id, c)}
              onToggleMidi={(id, c) => session.toggleMidiInstrument(id, c)}
              onSelectAllChange={(checked) =>
                checked ? session.selectAllInstruments() : session.clearSelectedInstruments()
              }
              onSelectAllMidiChange={(checked) =>
                checked ? session.selectAllMidiInstruments() : session.clearSelectedMidiInstruments()
              }
              onApply={() => session.applySelectedInstruments()}
              onCancel={() => session.cancelInstrumentSelection()}
              onRestore={() => session.restoreAppliedInstruments()}
              onClose={() => session.setInstrumentCardCollapsed(true)}
              singleScore
            />
          </aside>
        ) : null}
        {mobileInstruments && state.instruments.cardCollapsed ? (
          <button
            type="button"
            className="fixed left-0 top-2/5 z-[1101] inline-flex h-12 min-w-12 cursor-pointer items-center justify-center gap-2 rounded-r-lg border border-[var(--border)] bg-[var(--card)] px-2 text-[var(--foreground)] shadow-[var(--shadow-soft)]"
            onClick={() => session.toggleInstrumentsMenu()}
            aria-label="Expandir instrumentos"
          >
            <span className="material-icons">chevron_right</span>
            <span className="whitespace-nowrap text-sm font-medium max-w-0 overflow-hidden opacity-0 transition-all">Instrumentos</span>
          </button>
        ) : null}

        {desktopInstruments ? (
          <>
            <aside
              className={`hidden h-[min(72vh,calc(100dvh-10rem))] w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] lg:flex ${state.instruments.cardCollapsed ? 'lg:hidden' : ''}`}
              aria-label="Menu de instrumentos"
            >
              <StudyInstrumentPanel
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
                onFilterChange={(v) => session.setInstrumentFilter(v)}
                onToggle={(id, c) => session.toggleInstrument(id, c)}
                onToggleMidi={(id, c) => session.toggleMidiInstrument(id, c)}
                onSelectAllChange={(checked) =>
                  checked ? session.selectAllInstruments() : session.clearSelectedInstruments()
                }
                onSelectAllMidiChange={(checked) =>
                  checked ? session.selectAllMidiInstruments() : session.clearSelectedMidiInstruments()
                }
                onApply={() => session.applySelectedInstruments()}
                onCancel={() => session.cancelInstrumentSelection()}
                onRestore={() => session.restoreAppliedInstruments()}
                onClose={() => session.setInstrumentCardCollapsed(true)}
              />
            </aside>
            {state.instruments.cardCollapsed ? (
              <button
                type="button"
                className="inline-flex h-12 min-w-12 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-2xl border border-[var(--border)] bg-[var(--card)] px-2 text-[var(--foreground)] shadow-[var(--shadow-soft)]"
                onClick={() => session.toggleInstrumentsMenu()}
                aria-label="Expandir instrumentos"
              >
                <span className="material-icons">chevron_right</span>
                <span className="whitespace-nowrap text-sm font-medium max-w-0 overflow-hidden opacity-0">Instrumentos</span>
              </button>
            ) : null}
          </>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-4">
        {!(state.fullscreenScore && state.isMobile) && showScoreBlock ? (
          <div className="min-h-0 w-full">
            <div className="flex flex-col gap-5 min-w-0">
              {state.xmlLoaded ? (
                <StudyPlayerPanel
                  state={playerSlice}
                  onPlay={() => void session.play()}
                  onPause={() => session.pause()}
                  onStop={() => session.stop()}
                  onToggleExpanded={() => session.togglePlayerExpanded()}
                  onTempo={(v) => session.setTempo(v)}
                  onAudioVolume={(v) => session.setAudioVolume(v)}
                  onToggleMetronome={() => session.toggleMetronome()}
                  onMetronomeVolume={(v) => session.setMetronomeVolume(v)}
                  onToggleLoop={() => session.toggleLoop()}
                  onLoopStart={(v) => session.setLoopStartMeasure(v)}
                  onLoopEnd={(v) => session.setLoopEndMeasure(v)}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {showScoreBlock ? (
          <section
            className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] ${
              state.fullscreenScore ? 'score-view-shell min-h-0 flex-1 rounded-none border-0 shadow-none' : ''
            }`}
          >
            {state.fullscreenScore && !state.isMobile ? (
              <button
                type="button"
                className="absolute right-3 top-3 z-20 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium shadow-[var(--shadow-soft)]"
                onClick={() => session.toggleFullscreenScore()}
                aria-label="Sair da tela cheia"
              >
                <span className="material-icons text-lg" aria-hidden>
                  fullscreen_exit
                </span>
                <span>Sair da tela cheia</span>
              </button>
            ) : null}

            {videoOpen && !state.isMobile && youtubeEmbedUrl(videoUrl ?? '') ? (
              <div className="border-b border-[var(--border)] bg-black">
                <div className="mx-auto aspect-video w-full max-w-3xl">
                  <iframe
                    className="h-full w-full"
                    src={youtubeEmbedUrl(videoUrl ?? '') ?? undefined}
                    title={`Vídeo de ${state.currentScoreName}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : null}
            <div className={`flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 ${state.fullscreenScore && state.isMobile ? 'hidden' : ''}`}>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
                <span className="material-icons text-2xl text-[var(--primary)]" aria-hidden>
                  menu_book
                </span>
                <span className="font-medium">Partitura</span>
                <span className="font-medium text-[var(--muted)]">{state.currentScoreName}</span>
                {state.playbackPosition ? (
                  <span className="whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--foreground)]" aria-live="polite">
                    Compasso {state.playbackPosition.measure}, tempo {state.playbackPosition.beat}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {state.xmlLoaded ? (
                  <div className="flex flex-wrap gap-1.5">
                    {youtubeWatchUrl(videoUrl ?? '') ? (
                      <button
                        type="button"
                        className="btn-outline-primary inline-flex min-h-11 items-center gap-1.5 text-xs"
                        onClick={() => setVideoOpen((open) => !open)}
                        aria-expanded={videoOpen}
                      >
                        <span className="material-icons text-base">smart_display</span>
                        <span className="hidden md:inline">{videoOpen ? 'Fechar vídeo' : 'Vídeo'}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-outline-primary inline-flex min-h-11 items-center gap-1.5 text-xs"
                      onClick={() => session.openInstrumentSelection()}
                    >
                      <span className="material-icons text-base">tune</span>
                      <span className="hidden md:inline">Instrumentos</span>
                    </button>
                    {state.isMobile ? (
                      <MobileScoreZoom session={session} state={state} />
                    ) : (
                      <button
                        type="button"
                        className="btn-outline-primary inline-flex min-h-11 items-center gap-1.5 text-xs"
                        onClick={() => session.toggleFullscreenScore()}
                      >
                        <span className="material-icons text-base">
                          {state.fullscreenScore ? 'fullscreen_exit' : 'fullscreen'}
                        </span>
                        <span className="hidden md:inline">
                          {state.fullscreenScore ? 'Sair da tela cheia' : 'Tela cheia'}
                        </span>
                      </button>
                    )}
                  </div>
                ) : null}
                <div className="text-sm">
                  {state.scoreLoading ? <MusicLoader compact label="Carregando…" /> : null}
                  {!state.scoreLoading && state.scoreError ? (
                    <span className="text-[var(--destructive)]">{state.scoreError}</span>
                  ) : null}
                  {!state.scoreLoading && !state.scoreError ? (
                    <span className="text-[var(--color-brand-strong)]">{state.xmlLoaded ? 'Pronto' : 'Pendente'}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div
                className={`score-container relative min-h-0 flex-1 overflow-auto ${state.fullscreenScore && state.isMobile ? 'max-h-none px-0 py-2' : 'max-h-[70vh] min-h-52 px-4 py-4'}`}
                ref={scoreContainerRef}
              >
                {state.scoreLoading ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--score-page)]">
                    <MusicLoader label="Carregando partitura…" />
                  </div>
                ) : null}
                <div ref={osmdContainerRef} className="relative min-h-52 study-osmd-host" />
              </div>
            </div>
          </section>
        ) : null}
        </div>

        {state.fullscreenScore && state.isMobile && showScoreBlock ? (
          <StudyMobileSheet
            session={session}
            state={state}
            videoUrl={videoUrl}
            onBack={backToExamples}
          />
        ) : null}
      </div>
    </div>
  );
}
