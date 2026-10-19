import { MusicLoader } from '@/components/MusicLoader';
import { failureMessage } from '@/lib/userMessages';

type PlayerSlice = {
  loading: boolean;
  playerReady: boolean;
  playerLoading: boolean;
  midiLoaded: boolean;
  midiLoading: boolean;
  playerError: string | null;
  playerExpanded: boolean;
  bpm: number;
  bpmMin: number;
  bpmMax: number;
  timeSignature: string;
  baseBpm: number;
  metronomeEnabled: boolean;
  metronomeVolume: number;
  audioVolume: number;
  loopEnabled: boolean;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
};

type Props = {
  state: PlayerSlice;
  mobileControlsOnly?: boolean;
  /** Só andamento, volume, metrônomo e loop, para o menu do celular. */
  settingsOnly?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleExpanded: () => void;
  onTempo: (v: number) => void;
  onAudioVolume: (v: number) => void;
  onToggleMetronome: () => void;
  onMetronomeVolume: (v: number) => void;
  onToggleLoop: () => void;
  onLoopStart: (v: number | null) => void;
  onLoopEnd: (v: number | null) => void;
};

export function StudyPlayerPanel({
  state,
  mobileControlsOnly = false,
  settingsOnly = false,
  onPlay,
  onPause,
  onStop,
  onToggleExpanded,
  onTempo,
  onAudioVolume,
  onToggleMetronome,
  onMetronomeVolume,
  onToggleLoop,
  onLoopStart,
  onLoopEnd,
}: Props) {
  const disabledTransport = state.loading || state.playerLoading;

  if (settingsOnly) {
    return (
      <div className="flex flex-col gap-3">
        {!state.playerReady ? (
          state.playerError ? (
            <p className="text-sm text-[var(--muted)]">{failureMessage(undefined, state.playerError)}</p>
          ) : (
            <MusicLoader label="Preparando o player…" />
          )
        ) : (
          <PlayerSettings
            state={state}
            showLabels
            disabledTransport={disabledTransport}
            onTempo={onTempo}
            onAudioVolume={onAudioVolume}
            onToggleMetronome={onToggleMetronome}
            onMetronomeVolume={onMetronomeVolume}
            onToggleLoop={onToggleLoop}
            onLoopStart={onLoopStart}
            onLoopEnd={onLoopEnd}
          />
        )}
      </div>
    );
  }

  if (!state.playerReady) {
    return (
      <aside
        className={`sticky top-3 z-3 flex h-fit flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-all ${state.playerExpanded ? 'max-h-96' : 'max-h-14 overflow-hidden'}`}
      >
        {!mobileControlsOnly ? (
          <div className="flex min-h-11 flex-shrink-0 flex-nowrap items-center justify-between gap-2 bg-[var(--card-secondary)] px-3 py-2 text-xs font-semibold">
            <span>Player</span>
          </div>
        ) : null}
        <div className="px-4 py-4 text-center">
          {state.playerError ? (
            <p className="text-sm text-[var(--muted)]">{failureMessage(undefined, state.playerError)}</p>
          ) : (
            <MusicLoader label="Preparando o player…" />
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`sticky top-3 z-3 flex h-fit flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-all ${state.playerExpanded ? 'max-h-96' : 'max-h-14 overflow-hidden'}`}
    >
      {!mobileControlsOnly ? (
        <div className="flex min-h-11 flex-shrink-0 flex-wrap items-center justify-between gap-2 bg-[var(--card-secondary)] px-3 py-2 text-xs font-semibold">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-icons text-xl text-[var(--primary)]" aria-hidden>
              play_circle
            </span>
            <span>Player</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <button type="button" className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent ${disabledTransport ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--secondary)]'} ${state.playerExpanded ? 'text-[var(--primary)]' : ''}`} onClick={onPlay} disabled={disabledTransport} aria-label="Play">
              <span className="material-icons">play_arrow</span>
            </button>
            <button type="button" className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent ${disabledTransport ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--secondary)]'}`} onClick={onPause} disabled={disabledTransport} aria-label="Pausar">
              <span className="material-icons">pause</span>
            </button>
            <button type="button" className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent ${disabledTransport ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--secondary)]'}`} onClick={onStop} disabled={disabledTransport} aria-label="Parar">
              <span className="material-icons">stop</span>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-0 min-w-24 max-w-32">
            <span className="material-icons text-base text-[var(--muted)]" aria-hidden>
              volume_up
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.audioVolume}
              onChange={(e) => onAudioVolume(Number(e.target.value))}
              disabled={state.playerLoading}
              className="flex-1 min-w-0"
            />
          </div>
          <button type="button" className="btn-outline-primary inline-flex min-h-11 items-center gap-1 text-xs" onClick={onToggleExpanded}>
            <span className="material-icons text-lg">
              {state.playerExpanded ? 'expand_less' : 'expand_more'}
            </span>
            <span className="hidden md:inline">{state.playerExpanded ? 'Recolher' : 'Expandir'}</span>
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 px-3 py-3">
        {state.playerLoading || !state.midiLoaded ? (
          <div className="px-3 py-4 text-center">
            {state.playerLoading || state.midiLoading ? (
              <MusicLoader
                compact
                label={state.playerLoading ? 'Preparando o player…' : 'Carregando áudio (MIDI)…'}
              />
            ) : (
              <p className="text-xs text-[var(--muted)]">Áudio será carregado ao tocar em Play</p>
            )}
          </div>
        ) : null}

        {!mobileControlsOnly ? (
          <div className="flex items-center gap-2">
            <button type="button" className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--card-secondary)] ${disabledTransport ? 'cursor-not-allowed opacity-40' : ''}`} onClick={onPlay} disabled={disabledTransport}>
              <span className="material-icons">play_arrow</span>
            </button>
            <button type="button" className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--card-secondary)] ${disabledTransport ? 'cursor-not-allowed opacity-40' : ''}`} onClick={onPause} disabled={disabledTransport}>
              <span className="material-icons">pause</span>
            </button>
            <button type="button" className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-[var(--card-secondary)] ${disabledTransport ? 'cursor-not-allowed opacity-40' : ''}`} onClick={onStop} disabled={disabledTransport}>
              <span className="material-icons">stop</span>
            </button>
          </div>
        ) : null}

        <PlayerSettings
          state={state}
          disabledTransport={disabledTransport}
          onTempo={onTempo}
          onAudioVolume={onAudioVolume}
          onToggleMetronome={onToggleMetronome}
          onMetronomeVolume={onMetronomeVolume}
          onToggleLoop={onToggleLoop}
          onLoopStart={onLoopStart}
          onLoopEnd={onLoopEnd}
        />
      </div>
    </aside>
  );
}

function PlayerSettings({
  state,
  showLabels = false,
  disabledTransport,
  onTempo,
  onAudioVolume,
  onToggleMetronome,
  onMetronomeVolume,
  onToggleLoop,
  onLoopStart,
  onLoopEnd,
}: {
  state: PlayerSlice;
  showLabels?: boolean;
  disabledTransport: boolean;
  onTempo: (v: number) => void;
  onAudioVolume: (v: number) => void;
  onToggleMetronome: () => void;
  onMetronomeVolume: (v: number) => void;
  onToggleLoop: () => void;
  onLoopStart: (v: number | null) => void;
  onLoopEnd: (v: number | null) => void;
}) {
  const labelClass = showLabels
    ? 'mb-1.5 block text-xs font-medium text-[var(--muted)]'
    : 'mb-1.5 hidden text-xs font-medium text-[var(--muted)] md:block';
  const valueClass = showLabels
    ? 'min-w-fit text-xs font-medium text-[var(--muted)]'
    : 'hidden min-w-fit text-xs font-medium text-[var(--muted)] md:inline';

  return (
    <>
      <div>
        <span className={labelClass}>Andamento</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={state.bpmMin}
            max={state.bpmMax}
            step={1}
            value={state.bpm}
            onChange={(e) => onTempo(Number(e.target.value))}
            disabled={state.playerLoading}
            aria-label="Andamento"
            className="min-w-0 flex-1"
          />
          <span className={valueClass}>{Math.round(state.bpm)} BPM</span>
        </div>
      </div>

      <div>
        <span className={labelClass}>Volume</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.audioVolume}
            onChange={(e) => onAudioVolume(Number(e.target.value))}
            disabled={state.playerLoading}
            aria-label="Volume"
            className="min-w-0 flex-1"
          />
          <span className={valueClass}>{Math.round(state.audioVolume * 100)}%</span>
        </div>
      </div>

      <div>
        <span className={labelClass}>Metrônomo</span>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn-outline-primary min-h-11 text-xs disabled:cursor-not-allowed"
            onClick={onToggleMetronome}
            disabled={disabledTransport}
          >
            {state.metronomeEnabled ? 'Metrônomo ligado' : 'Metrônomo desligado'}
          </button>
          <span className={showLabels ? 'text-xs text-[var(--muted)]' : 'hidden text-xs text-[var(--muted)] md:inline'}>
            {state.timeSignature} · Base {Math.round(state.baseBpm)} BPM
          </span>
          <div className="flex items-center gap-2">
            <span className={showLabels ? 'text-xs font-medium text-[var(--muted)]' : 'hidden text-xs font-medium text-[var(--muted)] md:inline'}>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.metronomeVolume}
              onChange={(e) => onMetronomeVolume(Number(e.target.value))}
              disabled={!state.metronomeEnabled || state.playerLoading}
              aria-label="Volume do metrônomo"
              className="min-w-0 flex-1"
            />
          </div>
        </div>
      </div>

      <div>
        <span className={labelClass}>Loop</span>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--muted)]">Loop In (compasso)</span>
              <input
                type="number"
                value={state.loopStartMeasure ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onLoopStart(v === '' ? null : Number(v));
                }}
                className="text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--muted)]">Loop Out (compasso)</span>
              <input
                type="number"
                value={state.loopEndMeasure ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onLoopEnd(v === '' ? null : Number(v));
                }}
                className="text-xs"
              />
            </label>
            <button type="button" className="btn-primary min-h-11 text-xs disabled:cursor-not-allowed" onClick={onToggleLoop} disabled={state.playerLoading}>
              {state.loopEnabled ? 'Desativar Loop' : 'Ativar Loop'}
            </button>
          </div>
          <div className="flex gap-4 text-xs text-[var(--muted)]">
            <span>In: {state.loopStartMeasure ?? '-'}</span>
            <span>Out: {state.loopEndMeasure ?? '-'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
