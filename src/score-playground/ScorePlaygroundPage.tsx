'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MusicLoader } from '@/components/MusicLoader';
import {
  StudySongCatalog,
  type StudyStartOptions,
} from '@/components/study/StudySongCatalog';
import { StudyPublicRepertoireNotice } from '@/components/study/StudyPublicRepertoireNotice';
import { useScorePlaygroundPlayer } from './useScorePlaygroundPlayer';
import { ScorePlaygroundZoomControls } from './ScorePlaygroundZoomControls';
import { ScorePlaygroundInstrumentDialog } from './ScorePlaygroundInstrumentDialog';
import { playgroundVolumeIcon } from './playgroundVolume';

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ScorePlaygroundPage() {
  const { user } = useAuth();
  const ownerId = user?.id != null ? String(user.id) : null;
  const {
    sheetRef,
    state,
    startSession,
    changeInstruments,
    resetToCatalog,
    play,
    pause,
    rewind,
    setVelocity,
    setVolume,
    setPartVolume,
    toggleMute,
    toggleMetronome,
    zoomIn,
    zoomOut,
    toggleDisplayMode,
  } = useScorePlaygroundPlayer(ownerId);

  const [mobile, setMobile] = useState(false);
  const [instrumentsOpen, setInstrumentsOpen] = useState(false);
  const [partVolumesOpen, setPartVolumesOpen] = useState(false);
  const scoreScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scoreScrollRef.current;
    if (!el || state.phase !== 'ready') return;
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
      if (event.touches.length !== 2) return;
      if (applied || startDistance <= 0) return;
      const ratio = distance(event.touches) / startDistance;
      if (ratio > 1.15) {
        applied = true;
        event.preventDefault();
        zoomIn();
      } else if (ratio < 0.87) {
        applied = true;
        event.preventDefault();
        zoomOut();
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, [state.phase, zoomIn, zoomOut]);

  useEffect(() => {
    if (state.phase !== 'ready') return;
    const onHide = () => {
      if (document.hidden) pause();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      if (state.playing) pause();
      else play();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('keydown', onKey);
    };
  }, [pause, play, state.phase, state.playing]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const inSession = state.phase === 'loading' || state.phase === 'ready' || state.phase === 'error';

  useEffect(() => {
    if (!inSession) return;
    const html = document.documentElement;
    const main = document.querySelector('main');
    const prevHtml = html.style.overflow;
    const prevMain = main instanceof HTMLElement ? main.style.overflow : '';
    html.style.overflow = 'hidden';
    if (main instanceof HTMLElement) main.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      if (main instanceof HTMLElement) main.style.overflow = prevMain;
    };
  }, [inSession]);

  const handleStart = (options: StudyStartOptions) => {
    void startSession(options);
  };

  if (inSession) {
    return (
      <div
        className="fixed inset-0 z-[15] flex flex-col overflow-hidden bg-[var(--background)] md:left-[var(--content-margin)]"
        aria-label="Sessão de partitura"
      >
        {state.phase === 'error' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6" role="alert">
            <p className="text-lg font-semibold">{state.songTitle ?? 'Erro'}</p>
            <p className="max-w-md text-center text-sm text-[var(--muted)]">{state.error}</p>
            <button type="button" className="btn-outline-primary min-h-11 px-4" onClick={resetToCatalog}>
              Voltar ao catálogo
            </button>
          </div>
        ) : (
          <>
            {state.phase === 'loading' ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--background)]/95 p-6">
                <MusicLoader
                  label={
                    state.scoreLoading
                      ? 'Carregando partitura…'
                      : 'Preparando sessão…'
                  }
                />
                {state.songTitle ? (
                  <p className="text-sm text-[var(--muted)]">{state.songTitle}</p>
                ) : null}
                <p className="max-w-sm text-center text-xs text-[var(--muted)]">
                  Partituras longas levam mais tempo para desenhar. O áudio começa junto com a pauta.
                </p>
              </div>
            ) : null}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:px-4">
              <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{state.songTitle}</h2>
              <div className="flex items-center gap-2">
                <ScorePlaygroundZoomControls
                  zoom={state.zoom}
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                />
                {state.canToggleScoreForm ? (
                  <button
                    type="button"
                    aria-pressed={state.displayMode === 'written'}
                    aria-label={
                      state.displayMode === 'written'
                        ? 'Mostrar partitura desdobrada (sem voltas)'
                        : 'Mostrar partitura escrita (com voltas)'
                    }
                    title={
                      state.displayMode === 'written'
                        ? 'Com voltas (D.C./D.S./repetições)'
                        : 'Desdobrada (sem voltas)'
                    }
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium ${state.displayMode === 'written' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)]'}`}
                    onClick={toggleDisplayMode}
                  >
                    <span className="material-icons text-lg" aria-hidden>
                      repeat
                    </span>
                    <span className="hidden sm:inline">
                      {state.displayMode === 'written' ? 'Com voltas' : 'Desdobrada'}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium"
                  onClick={resetToCatalog}
                >
                  <span className="material-icons text-lg" aria-hidden>
                    arrow_back
                  </span>
                  <span className="hidden sm:inline">Catálogo</span>
                </button>
              </div>
            </div>

            <div
              ref={scoreScrollRef}
              data-score-scroll
              className="relative min-h-0 flex-1 touch-pan-x touch-pan-y overflow-x-auto overflow-y-auto overscroll-contain bg-[var(--background)] px-2 py-2 sm:px-3"
            >
              <div ref={sheetRef} className="score-playground-sheet min-h-[12rem] w-full" />
            </div>

            <div
              className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-2 py-1 sm:px-3"
              style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Voltar ao início"
                    className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent hover:bg-[var(--secondary)] ${!state.playerReady ? 'cursor-not-allowed opacity-40' : ''}`}
                    onClick={rewind}
                    disabled={!state.playerReady}
                  >
                    <span className="material-icons" aria-hidden>
                      skip_previous
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={state.playing ? 'Pausar' : 'Tocar'}
                    className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent text-[var(--primary)] hover:bg-[var(--secondary)] ${!state.playerReady ? 'cursor-not-allowed opacity-40' : ''}`}
                    onClick={state.playing ? pause : play}
                    disabled={!state.playerReady}
                  >
                    <span className="material-icons" aria-hidden>
                      {state.playing ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={state.metronomeEnabled}
                    aria-label={state.metronomeEnabled ? 'Desligar metrônomo' : 'Ligar metrônomo'}
                    className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40 ${state.metronomeEnabled ? 'bg-[var(--primary)] text-white' : 'bg-transparent'}`}
                    onClick={toggleMetronome}
                    disabled={!state.playerReady}
                  >
                    <span className="material-icons" aria-hidden>
                      timer
                    </span>
                  </button>
                  {state.instruments.length > 0 ? (
                    <button
                      type="button"
                      aria-label="Alterar instrumentos"
                      aria-haspopup="dialog"
                      className="ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        pause();
                        setInstrumentsOpen(true);
                      }}
                      disabled={state.phase !== 'ready'}
                    >
                      <span className="material-icons text-lg" aria-hidden>
                        tune
                      </span>
                      Instrumentos
                    </button>
                  ) : null}
                  <p className="ml-1 text-xs tabular-nums text-[var(--muted)]">
                    {formatMs(state.positionMs)} / {formatMs(state.durationMs)}
                  </p>
                </div>

                <div className="flex min-w-0 flex-1 basis-full items-center gap-3 text-xs text-[var(--muted)] sm:basis-auto sm:justify-end">
                  <div className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-72">
                    <button
                      type="button"
                      aria-label={state.volume <= 0 ? 'Ativar som' : 'Silenciar'}
                      className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={toggleMute}
                      disabled={!state.playerReady}
                    >
                      <span className="material-icons" aria-hidden>
                        {playgroundVolumeIcon(state.volume)}
                      </span>
                    </button>
                    <label className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="sr-only">Volume</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={state.volume}
                        className="h-11 min-w-0 flex-1"
                        onChange={(event) => setVolume(Number(event.target.value))}
                        aria-label="Volume geral"
                        aria-valuetext={`${Math.round(state.volume * 100)} por cento`}
                      />
                    </label>
                    {state.partVolumeRows.length > 0 ? (
                      <button
                        type="button"
                        aria-expanded={partVolumesOpen}
                        aria-controls="playground-part-volumes"
                        aria-label={partVolumesOpen ? 'Ocultar volume dos naipes' : 'Volume dos naipes'}
                        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setPartVolumesOpen((open) => !open)}
                        disabled={!state.playerReady}
                      >
                        <span className="material-icons" aria-hidden>
                          graphic_eq
                        </span>
                      </button>
                    ) : null}
                  </div>
                  <label className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-56">
                    <span className="whitespace-nowrap">Andamento</span>
                    <input
                      type="range"
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      value={state.velocity}
                      className="h-11 min-w-0 flex-1"
                      onChange={(event) => setVelocity(Number(event.target.value))}
                      aria-label="Andamento"
                      aria-valuetext={`${Math.round(state.velocity * 100)} por cento`}
                    />
                    <span className="w-10 shrink-0 text-right tabular-nums">
                      {Math.round(state.velocity * 100)}%
                    </span>
                  </label>
                </div>
              </div>
              {partVolumesOpen && state.partVolumeRows.length > 0 ? (
                <div id="playground-part-volumes" className="mt-1 border-t border-[var(--border)] pt-1">
                  <p className="px-1 text-xs text-[var(--muted)]">
                    Volume de cada naipe. O volume geral continua valendo para todos.
                  </p>
                  <ul className="max-h-48 overflow-y-auto">
                    {state.partVolumeRows.map((row) => {
                      const level = state.partVolumes[row.id] ?? 1;
                      return (
                        <li key={row.id} className="flex min-h-11 items-center gap-2 px-1">
                          <span className="w-[38%] min-w-0 truncate text-xs" title={row.label}>
                            {row.label}
                          </span>
                          <label className="flex min-w-0 flex-1 items-center">
                            <span className="sr-only">{`Volume de ${row.label}`}</span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={level}
                              className="h-11 min-w-0 flex-1"
                              onChange={(event) => setPartVolume(row.id, Number(event.target.value))}
                              aria-label={`Volume de ${row.label}`}
                              aria-valuetext={`${Math.round(level * 100)} por cento`}
                            />
                          </label>
                          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--muted)]">
                            {Math.round(level * 100)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </>
        )}
        {instrumentsOpen ? (
          <ScorePlaygroundInstrumentDialog
            instruments={state.instruments}
            scoreInstrumentIds={state.scoreInstrumentIds}
            midiInstrumentIds={state.midiInstrumentIds}
            singleScore={mobile}
            onClose={() => setInstrumentsOpen(false)}
            onApply={(scoreIds, midiIds) => {
              setInstrumentsOpen(false);
              changeInstruments(scoreIds, midiIds);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 py-2 sm:py-4">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Laboratório
        </p>
        <h1 className="text-xl font-semibold sm:text-2xl">Score playground</h1>
        <p className="mt-1 max-w-4xl text-sm text-[var(--muted)]">
          Partitura renderizada com o motor MuseScore (webmscore) e áudio preparado pelo servidor,
          como no estudo — com outra pilha de visualização e player.
        </p>
      </header>

      <StudyPublicRepertoireNotice context="study" />
      <StudySongCatalog
        onStart={handleStart}
        ownerId={ownerId}
        personId={user?.personId != null ? String(user.personId) : null}
      />
    </div>
  );
}
