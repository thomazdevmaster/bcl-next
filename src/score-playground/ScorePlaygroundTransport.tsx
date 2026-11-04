'use client';

import { useState } from 'react';
import type { ScorePlaygroundViewState } from './useScorePlaygroundPlayer';
import { ScorePlaygroundZoomControls } from './ScorePlaygroundZoomControls';
import { playgroundVolumeIcon } from './playgroundVolume';

export function formatPlaygroundMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export type ScorePlaygroundTransportProps = {
  state: ScorePlaygroundViewState;
  mobile: boolean;
  onRewind: () => void;
  onPlay: () => void;
  onPause: () => void;
  onToggleMetronome: () => void;
  onOpenInstruments: () => void;
  onToggleMute: () => void;
  onVolume: (value: number) => void;
  onPartVolume: (rowId: string, value: number) => void;
  onVelocity: (value: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleDisplayMode: () => void;
};

const ICON_BUTTON =
  'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40';

const CHIP_BUTTON =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40';

export function ScorePlaygroundTransport(props: ScorePlaygroundTransportProps) {
  return props.mobile ? <MobileTransport {...props} /> : <DesktopTransport {...props} />;
}

function RewindButton({ state, onRewind }: ScorePlaygroundTransportProps) {
  return (
    <button
      type="button"
      aria-label="Voltar ao início"
      className={ICON_BUTTON}
      onClick={onRewind}
      disabled={!state.playerReady}
    >
      <span className="material-icons" aria-hidden>
        skip_previous
      </span>
    </button>
  );
}

function PlayButton({ state, onPlay, onPause }: ScorePlaygroundTransportProps) {
  return (
    <button
      type="button"
      aria-label={state.playing ? 'Pausar' : 'Tocar'}
      className={`${ICON_BUTTON} text-[var(--primary)]`}
      onClick={state.playing ? onPause : onPlay}
      disabled={!state.playerReady}
    >
      <span className="material-icons" aria-hidden>
        {state.playing ? 'pause' : 'play_arrow'}
      </span>
    </button>
  );
}

function VolumeSlider({ state, onToggleMute, onVolume }: ScorePlaygroundTransportProps) {
  return (
    <>
      <button
        type="button"
        aria-label={state.volume <= 0 ? 'Ativar som' : 'Silenciar'}
        className={ICON_BUTTON}
        onClick={onToggleMute}
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
          onChange={(event) => onVolume(Number(event.target.value))}
          aria-label="Volume geral"
          aria-valuetext={`${Math.round(state.volume * 100)} por cento`}
        />
      </label>
    </>
  );
}

function TempoSlider({ state, onVelocity }: ScorePlaygroundTransportProps) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="whitespace-nowrap">Andamento</span>
      <input
        type="range"
        min={0.5}
        max={1.5}
        step={0.05}
        value={state.velocity}
        className="h-11 min-w-0 flex-1"
        onChange={(event) => onVelocity(Number(event.target.value))}
        aria-label="Andamento"
        aria-valuetext={`${Math.round(state.velocity * 100)} por cento`}
      />
      <span className="w-10 shrink-0 text-right tabular-nums">
        {Math.round(state.velocity * 100)}%
      </span>
    </label>
  );
}

function PartVolumeList({ state, onPartVolume, id }: ScorePlaygroundTransportProps & { id?: string }) {
  return (
    <div id={id}>
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
                  onChange={(event) => onPartVolume(row.id, Number(event.target.value))}
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
  );
}

function MobileTransport(props: ScorePlaygroundTransportProps) {
  const { state } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const ready = state.phase === 'ready';

  return (
    <div className="flex flex-col">
      {menuOpen ? (
        <div
          id="playground-more-options"
          className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto border-b border-[var(--border)] pb-2 pt-1 text-xs text-[var(--muted)]"
        >
          <div className="flex flex-wrap gap-2 text-[var(--foreground)]">
            <button
              type="button"
              aria-pressed={state.metronomeEnabled}
              className={`${CHIP_BUTTON} ${state.metronomeEnabled ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)]'}`}
              onClick={props.onToggleMetronome}
              disabled={!state.playerReady}
            >
              <span className="material-icons text-lg" aria-hidden>
                timer
              </span>
              Metrônomo
            </button>
            {state.instruments.length > 0 ? (
              <button
                type="button"
                aria-haspopup="dialog"
                className={`${CHIP_BUTTON} bg-[var(--card)]`}
                onClick={() => {
                  setMenuOpen(false);
                  props.onOpenInstruments();
                }}
                disabled={!ready}
              >
                <span className="material-icons text-lg" aria-hidden>
                  tune
                </span>
                Instrumentos
              </button>
            ) : null}
            {state.canToggleScoreForm ? (
              <button
                type="button"
                aria-pressed={state.displayMode === 'written'}
                className={`${CHIP_BUTTON} ${state.displayMode === 'written' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)]'}`}
                onClick={props.onToggleDisplayMode}
              >
                <span className="material-icons text-lg" aria-hidden>
                  repeat
                </span>
                {state.displayMode === 'written' ? 'Com voltas' : 'Desdobrada'}
              </button>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <VolumeSlider {...props} />
          </div>
          {state.partVolumeRows.length > 0 ? <PartVolumeList {...props} /> : null}
          <div className="flex min-w-0 items-center px-1">
            <TempoSlider {...props} />
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-0.5">
        <RewindButton {...props} />
        <PlayButton {...props} />
        <p
          className="flex min-w-0 flex-col items-center text-[11px] leading-tight tabular-nums text-[var(--muted)]"
          aria-label={`${formatPlaygroundMs(state.positionMs)} de ${formatPlaygroundMs(state.durationMs)}`}
        >
          <span>{formatPlaygroundMs(state.positionMs)}</span>
          <span>{formatPlaygroundMs(state.durationMs)}</span>
        </p>
        <ScorePlaygroundZoomControls
          zoom={state.zoom}
          onZoomIn={props.onZoomIn}
          onZoomOut={props.onZoomOut}
          compact
        />
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="playground-more-options"
          aria-label={menuOpen ? 'Fechar opções' : 'Mais opções'}
          className={ICON_BUTTON}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="material-icons" aria-hidden>
            {menuOpen ? 'expand_more' : 'expand_less'}
          </span>
        </button>
      </div>
    </div>
  );
}

function DesktopTransport(props: ScorePlaygroundTransportProps) {
  const { state } = props;
  const [partVolumesOpen, setPartVolumesOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1">
          <RewindButton {...props} />
          <PlayButton {...props} />
          <button
            type="button"
            aria-pressed={state.metronomeEnabled}
            aria-label={state.metronomeEnabled ? 'Desligar metrônomo' : 'Ligar metrônomo'}
            className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-40 ${state.metronomeEnabled ? 'bg-[var(--primary)] text-white' : 'bg-transparent'}`}
            onClick={props.onToggleMetronome}
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
              className={`ml-2 ${CHIP_BUTTON} bg-[var(--card)]`}
              onClick={props.onOpenInstruments}
              disabled={state.phase !== 'ready'}
            >
              <span className="material-icons text-lg" aria-hidden>
                tune
              </span>
              Instrumentos
            </button>
          ) : null}
          <p className="ml-1 text-xs tabular-nums text-[var(--muted)]">
            {formatPlaygroundMs(state.positionMs)} / {formatPlaygroundMs(state.durationMs)}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 basis-full items-center gap-3 text-xs text-[var(--muted)] sm:basis-auto sm:justify-end">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-72">
            <VolumeSlider {...props} />
            {state.partVolumeRows.length > 0 ? (
              <button
                type="button"
                aria-expanded={partVolumesOpen}
                aria-controls="playground-part-volumes"
                aria-label={partVolumesOpen ? 'Ocultar volume dos naipes' : 'Volume dos naipes'}
                className={ICON_BUTTON}
                onClick={() => setPartVolumesOpen((open) => !open)}
                disabled={!state.playerReady}
              >
                <span className="material-icons" aria-hidden>
                  graphic_eq
                </span>
              </button>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 items-center sm:max-w-56">
            <TempoSlider {...props} />
          </div>
        </div>
      </div>
      {partVolumesOpen && state.partVolumeRows.length > 0 ? (
        <div className="mt-1 border-t border-[var(--border)] pt-1">
          <PartVolumeList {...props} id="playground-part-volumes" />
        </div>
      ) : null}
    </>
  );
}
