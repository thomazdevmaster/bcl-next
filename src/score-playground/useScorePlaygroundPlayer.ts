'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FetchConverter,
  Player,
  PlayerState,
} from '@music-i18n/musicxml-player';
import type { StudyStartOptions } from '@/components/study/StudySongCatalog';
import { selectionStorageKey } from '@/study/songParts';
import { ScorePlaygroundSheetRenderer } from './ScorePlaygroundSheetRenderer';
import {
  buildPlaygroundPlaybackMidi,
  fetchPlaygroundMidiAndTimemap,
  fetchPlaygroundScoreXml,
  resolvePlaygroundCatalogXml,
} from './scorePlaygroundAssets';
import { failureMessage } from '@/lib/userMessages';
import {
  findTimemapIndexAtPosition,
  type MeasureTimemapEntry,
} from '@/study/studyTimemap';
import {
  buildUnrolledToWrittenMap,
  hasRealRepeats,
} from './scorePlaygroundRepeatMap';
import {
  readPlaygroundSessionPrefs,
  writePlaygroundSessionPrefs,
  type ScorePlaygroundSessionPrefs,
} from './scorePlaygroundSessionPrefs';
import { patchMusicXmlPlayerAudioWorklet } from './patchMusicXmlPlayerForNext';
import type { PlaygroundZoomState } from './playgroundZoomTypes';
import type { InstrumentInfo } from '@/study/studyUtils';
import { clampPlaygroundVolume, connectMasterGain } from './playgroundVolume';
import {
  applyPlaygroundChannelVolumes,
  playgroundPartVolumeRows,
  type ChannelVolumeSynth,
  type PlaygroundPartVolumeRow,
} from './playgroundMidiChannels';
import {
  buildMetronomeBeats,
  metronomeBeatsDue,
  metronomeClickDelaySeconds,
  metronomePositionJumped,
  playMetronomeClick,
  readBeatsPerMeasure,
  type MetronomeBeat,
} from './playgroundMetronome';

/** O Player indexa compassos em 0…n-1; o backend pode enviar números escritos na partitura. */
function timemapForPlayer(entries: MeasureTimemapEntry[]): MeasureTimemapEntry[] {
  return entries.map((entry, index) => ({
    measure: index,
    timestamp: entry.timestamp,
    duration: entry.duration,
  }));
}

function describeCaught(caught: unknown): string {
  if (caught instanceof Error) {
    return caught.message?.trim() || caught.name || 'Erro desconhecido';
  }
  if (typeof caught === 'string' && caught.trim()) return caught.trim();
  return '';
}

export interface ScorePlaygroundViewState {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  songTitle: string | null;
  error: string | null;
  playerReady: boolean;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  velocity: number;
  scoreLoading: boolean;
  zoom: PlaygroundZoomState | null;
  instruments: InstrumentInfo[];
  scoreInstrumentIds: string[];
  midiInstrumentIds: string[];
  volume: number;
  /** Linhas de volume por naipe. Vazio quando o MIDI não pôde separar os canais. */
  partVolumeRows: PlaygroundPartVolumeRow[];
  partVolumes: Record<string, number>;
  metronomeEnabled: boolean;
  /** `written` mostra a partitura com voltas/D.C./D.S.; `unrolled` é o padrão (eixo do Player). */
  displayMode: 'unrolled' | 'written';
  /** Só true quando a música tem repetição real e o backend enviou a correspondência de compassos. */
  canToggleScoreForm: boolean;
}

const INITIAL: ScorePlaygroundViewState = {
  phase: 'idle',
  songTitle: null,
  error: null,
  playerReady: false,
  playing: false,
  positionMs: 0,
  durationMs: 0,
  velocity: 1,
  scoreLoading: false,
  zoom: null,
  instruments: [],
  scoreInstrumentIds: [],
  midiInstrumentIds: [],
  volume: 1,
  partVolumeRows: [],
  partVolumes: {},
  metronomeEnabled: false,
  displayMode: 'unrolled',
  canToggleScoreForm: false,
};

export function useScorePlaygroundPlayer(ownerId: string | null) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<ScorePlaygroundSheetRenderer | null>(null);
  const loadTokenRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef<StudyStartOptions | null>(null);
  const velocityRef = useRef(1);
  const volumeRef = useRef(1);
  const volumeBeforeMuteRef = useRef(1);
  const gainRef = useRef<{ gain: { value: number } } | null>(null);
  const synthRef = useRef<ChannelVolumeSynth | null>(null);
  const partVolumeRowsRef = useRef<PlaygroundPartVolumeRow[]>([]);
  const partVolumesRef = useRef<Record<string, number>>({});
  const metronomeEnabledRef = useRef(false);
  const metronomeBeatsRef = useRef<MetronomeBeat[]>([]);
  const metronomeScheduledRef = useRef(new Map<number, () => void>());
  const metronomeLastPosRef = useRef<number | null>(null);
  const playerTimemapRef = useRef<MeasureTimemapEntry[]>([]);
  const togglingDisplayModeRef = useRef(false);
  const songIdRef = useRef<string | null>(null);
  const [state, setState] = useState<ScorePlaygroundViewState>(INITIAL);

  const persistPrefs = useCallback((patch: ScorePlaygroundSessionPrefs) => {
    const songId = songIdRef.current;
    if (!songId || typeof localStorage === 'undefined') return;
    writePlaygroundSessionPrefs(localStorage, ownerId, songId, patch);
  }, [ownerId]);

  const clearMetronomeSchedule = useCallback(() => {
    for (const stop of metronomeScheduledRef.current.values()) stop();
    metronomeScheduledRef.current.clear();
    metronomeLastPosRef.current = null;
  }, []);

  const syncMetronome = useCallback((player: Player) => {
    const audio = player as unknown as { _context?: AudioContext };
    const context = audio._context;
    const playing = metronomeEnabledRef.current && player.state === PlayerState.Playing;
    if (!playing || !context) {
      if (metronomeScheduledRef.current.size > 0) clearMetronomeSchedule();
      return;
    }
    const positionMs = player.position;
    if (metronomePositionJumped(metronomeLastPosRef.current, positionMs)) {
      clearMetronomeSchedule();
    }
    const due = metronomeBeatsDue(
      metronomeBeatsRef.current,
      positionMs,
      velocityRef.current,
      new Set(metronomeScheduledRef.current.keys()),
    );
    for (const beat of due) {
      const when =
        context.currentTime +
        metronomeClickDelaySeconds(beat.songMs, positionMs, velocityRef.current);
      metronomeScheduledRef.current.set(
        beat.id,
        playMetronomeClick(context, when, beat.accent),
      );
    }
    for (const [id, stop] of metronomeScheduledRef.current) {
      const beat = metronomeBeatsRef.current[id];
      if (beat && beat.songMs < positionMs - 250) {
        stop();
        metronomeScheduledRef.current.delete(id);
      }
    }
    metronomeLastPosRef.current = positionMs;
  }, [clearMetronomeSchedule]);

  const stopPositionLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startPositionLoop = useCallback(() => {
    stopPositionLoop();
    const tick = () => {
      const player = playerRef.current;
      if (player) {
        setState((prev) => ({
          ...prev,
          positionMs: player.position,
          durationMs: player.duration,
          playing: player.state === PlayerState.Playing,
        }));
        syncMetronome(player);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopPositionLoop, syncMetronome]);

  const teardownPlayer = useCallback(() => {
    stopPositionLoop();
    playerRef.current?.destroy();
    playerRef.current = null;
    gainRef.current = null;
    synthRef.current = null;
    partVolumeRowsRef.current = [];
    clearMetronomeSchedule();
    metronomeBeatsRef.current = [];
    playerTimemapRef.current = [];
    rendererRef.current = null;
    if (sheetRef.current) sheetRef.current.replaceChildren();
  }, [stopPositionLoop, clearMetronomeSchedule]);

  const refreshZoomState = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    setState((prev) => ({ ...prev, zoom: renderer.getZoomState() }));
  }, []);

  useEffect(() => () => teardownPlayer(), [teardownPlayer]);

  const resetToCatalog = useCallback(() => {
    optionsRef.current = null;
    songIdRef.current = null;
    volumeRef.current = 1;
    volumeBeforeMuteRef.current = 1;
    partVolumesRef.current = {};
    teardownPlayer();
    setState(INITIAL);
  }, [teardownPlayer]);

  const openSession = useCallback(
    async (options: StudyStartOptions) => {
      const token = loadTokenRef.current + 1;
      loadTokenRef.current = token;
      teardownPlayer();

      const songId = String(options.song.id);
      const scoreIds = options.scoreInstrumentIds;
      const midiIds = options.midiInstrumentIds;
      const selection = {
        instruments: options.instruments ?? [],
        scoreInstrumentIds: scoreIds,
        midiInstrumentIds: midiIds,
      };
      const prefs =
        typeof localStorage === 'undefined'
          ? {}
          : readPlaygroundSessionPrefs(localStorage, ownerId, songId);
      const velocity = prefs.velocity ?? 1;
      const volume = prefs.volume ?? 1;
      const metronomeEnabled = prefs.metronome ?? false;
      optionsRef.current = options;
      songIdRef.current = songId;
      velocityRef.current = velocity;
      volumeRef.current = volume;
      volumeBeforeMuteRef.current = volume > 0 ? volume : 1;
      metronomeEnabledRef.current = metronomeEnabled;
      if (scoreIds.length === 0 || midiIds.length === 0) {
        setState({
          ...INITIAL,
          phase: 'error',
          songTitle: options.song.title,
          error: 'Selecione ao menos um instrumento na partitura e no áudio.',
        });
        return;
      }

      try {
        localStorage.setItem(
          selectionStorageKey(ownerId, songId),
          JSON.stringify({ score: scoreIds, midi: midiIds }),
        );
      } catch {
        /* quota */
      }

      setState({
        ...INITIAL,
        ...selection,
        phase: 'loading',
        songTitle: options.song.title,
        scoreLoading: true,
        velocity,
        volume,
        metronomeEnabled,
      });

      try {
        let mount: HTMLDivElement | null = null;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          mount = sheetRef.current;
          if (mount) break;
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
        }
        if (!mount) throw new Error('container_missing');

        const [playbackXml, catalogXml, assets] = await Promise.all([
          fetchPlaygroundScoreXml(songId, scoreIds, 'unrolled'),
          resolvePlaygroundCatalogXml(
            songId,
            options.xml,
            options.fullScoreUrl,
          ),
          fetchPlaygroundMidiAndTimemap(songId, midiIds),
        ]);
        if (token !== loadTokenRef.current) return;

        const unrolledToWrittenMap = buildUnrolledToWrittenMap(assets.timemap);
        const repeatsDetected = hasRealRepeats(unrolledToWrittenMap);
        // Só baixa a partitura escrita quando há repetição real: evita tráfego extra em
        // celular/4G para a maioria das músicas, que toca igual nas duas formas.
        const writtenXml = repeatsDetected
          ? await fetchPlaygroundScoreXml(songId, scoreIds, 'written').catch(() => null)
          : null;
        if (token !== loadTokenRef.current) return;
        const canToggleScoreForm = repeatsDetected && writtenXml != null;

        const playbackMidi = await buildPlaygroundPlaybackMidi(
          catalogXml,
          songId,
          midiIds,
          assets.midi,
          assets.timemap,
        );
        if (token !== loadTokenRef.current) return;
        const partVolumeRows = playgroundPartVolumeRows(
          playbackMidi.channels,
          (partId) => options.instruments?.find((item) => item.id === partId)?.name ?? partId,
        );
        const partVolumes = prefs.partVolumes ?? {};
        partVolumeRowsRef.current = partVolumeRows;
        partVolumesRef.current = partVolumes;

        patchMusicXmlPlayerAudioWorklet();
        const renderer = new ScorePlaygroundSheetRenderer();
        renderer.setHeading({
          title: options.song.title,
          composer: options.song.composer,
          arranger: options.song.arranger,
        });
        renderer.setWrittenAlternative(
          canToggleScoreForm ? writtenXml : null,
          canToggleScoreForm ? unrolledToWrittenMap : null,
        );
        renderer.setMeasuresPerLine(prefs.measuresPerLine ?? null);
        const displayMode =
          prefs.displayMode === 'written' && canToggleScoreForm ? 'written' : 'unrolled';
        renderer.displayMode = displayMode;
        rendererRef.current = renderer;
        const playerTimemap = timemapForPlayer(assets.timemap);
        playerTimemapRef.current = playerTimemap;
        metronomeBeatsRef.current = buildMetronomeBeats(
          playerTimemap,
          readBeatsPerMeasure(playbackXml),
        );
        clearMetronomeSchedule();
        const converter = new FetchConverter(playbackMidi.buffer, playerTimemap);

        const player = await Player.create({
          container: mount,
          musicXml: playbackXml,
          renderer,
          converter,
          unroll: false,
          followCursor: true,
          repeat: 1,
          velocity,
        });
        if (token !== loadTokenRef.current) {
          player.destroy();
          return;
        }

        playerRef.current = player;
        gainRef.current = null;
        synthRef.current = null;
        try {
          const audio = player as unknown as {
            _synthesizer: Parameters<typeof connectMasterGain>[0] & ChannelVolumeSynth;
            _context: Parameters<typeof connectMasterGain>[1];
          };
          gainRef.current = connectMasterGain(audio._synthesizer, audio._context, volume);
          synthRef.current = audio._synthesizer;
          applyPlaygroundChannelVolumes(
            audio._synthesizer,
            partVolumeRowsRef.current,
            partVolumesRef.current,
          );
        } catch (caught) {
          console.error('[score_playground] volume', caught);
        }
        if (process.env.NODE_ENV === 'development') {
          (window as unknown as { __scorePlayground?: unknown }).__scorePlayground = {
            player,
            renderer,
            timemap: playerTimemap,
          };
        }
        setState({
          phase: 'ready',
          songTitle: options.song.title,
          error: null,
          playerReady: true,
          playing: false,
          positionMs: 0,
          durationMs: player.duration,
          velocity,
          volume,
          partVolumeRows,
          partVolumes,
          metronomeEnabled,
          scoreLoading: false,
          zoom: renderer.getZoomState(),
          displayMode,
          canToggleScoreForm,
          ...selection,
        });
        startPositionLoop();
      } catch (caught) {
        if (token !== loadTokenRef.current) return;
        console.error('[score_playground]', caught);
        const detail = describeCaught(caught);
        const message =
          caught instanceof Error && caught.message === 'midi_unavailable'
            ? 'O áudio ainda está sendo gerado. Aguarde a preparação e tente novamente.'
            : detail
                ? `Não foi possível abrir a partitura no playground: ${detail}`
                : failureMessage(caught, 'Não foi possível abrir a partitura no playground.');
        setState({
          ...INITIAL,
          phase: 'error',
          songTitle: options.song.title,
          error: message,
        });
      }
    },
    [ownerId, startPositionLoop, teardownPlayer, clearMetronomeSchedule],
  );

  const startSession = useCallback(
    (options: StudyStartOptions) => openSession(options),
    [openSession],
  );

  const changeInstruments = useCallback(
    (scoreInstrumentIds: string[], midiInstrumentIds: string[]) => {
      const options = optionsRef.current;
      if (!options) return;
      playerRef.current?.pause();
      void openSession({ ...options, scoreInstrumentIds, midiInstrumentIds });
    },
    [openSession],
  );

  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const rewind = useCallback(() => {
    playerRef.current?.rewind();
  }, []);

  const rememberZoom = useCallback(() => {
    const measures = rendererRef.current?.getZoomState().measuresPerLine;
    if (measures == null) return;
    persistPrefs({ measuresPerLine: measures });
  }, [persistPrefs]);

  const zoomIn = useCallback(() => {
    rendererRef.current?.zoomIn();
    rememberZoom();
    refreshZoomState();
    requestAnimationFrame(() => refreshZoomState());
    window.setTimeout(() => refreshZoomState(), 1200);
  }, [refreshZoomState, rememberZoom]);

  const zoomOut = useCallback(() => {
    rendererRef.current?.zoomOut();
    rememberZoom();
    refreshZoomState();
    requestAnimationFrame(() => refreshZoomState());
    window.setTimeout(() => refreshZoomState(), 1200);
  }, [refreshZoomState, rememberZoom]);

  const toggleDisplayMode = useCallback(() => {
    const renderer = rendererRef.current;
    const player = playerRef.current;
    if (!renderer || !player || !renderer.hasWrittenAlternative()) return;
    if (togglingDisplayModeRef.current) return;
    togglingDisplayModeRef.current = true;
    const nextMode = renderer.displayMode === 'written' ? 'unrolled' : 'written';
    void renderer.setDisplayMode(nextMode).then(() => {
      // Reposiciona o cursor na posição atual (tocando ou pausado) para não "piscar"
      // na origem só porque o motor de desenho foi trocado/reconstruído.
      const timemap = playerTimemapRef.current;
      if (timemap.length > 0) {
        const index = findTimemapIndexAtPosition(timemap, player.position);
        const entry = timemap[index];
        if (entry) {
          renderer.moveTo(
            entry.measure,
            entry.timestamp,
            Math.max(0, player.position - entry.timestamp),
            entry.duration,
          );
        }
      }
      setState((prev) => ({ ...prev, displayMode: renderer.displayMode }));
      persistPrefs({ displayMode: renderer.displayMode });
      refreshZoomState();
      togglingDisplayModeRef.current = false;
    });
  }, [persistPrefs, refreshZoomState]);

  const applyVolume = useCallback((value: number) => {
    const clamped = clampPlaygroundVolume(value);
    volumeRef.current = clamped;
    if (clamped > 0) volumeBeforeMuteRef.current = clamped;
    if (gainRef.current) gainRef.current.gain.value = clamped;
    setState((prev) => ({ ...prev, volume: clamped }));
    persistPrefs({ volume: clamped });
  }, [persistPrefs]);

  const setVolume = useCallback((value: number) => {
    applyVolume(value);
  }, [applyVolume]);

  const toggleMute = useCallback(() => {
    if (volumeRef.current <= 0) applyVolume(volumeBeforeMuteRef.current || 1);
    else applyVolume(0);
  }, [applyVolume]);

  const setPartVolume = useCallback((rowId: string, value: number) => {
    const clamped = clampPlaygroundVolume(value);
    const next = { ...partVolumesRef.current, [rowId]: clamped };
    partVolumesRef.current = next;
    const synth = synthRef.current;
    if (synth) {
      try {
        applyPlaygroundChannelVolumes(synth, partVolumeRowsRef.current, next);
      } catch (caught) {
        console.error('[score_playground] volume do naipe', caught);
      }
    }
    setState((prev) => ({ ...prev, partVolumes: next }));
    persistPrefs({ partVolumes: next });
  }, [persistPrefs]);

  const toggleMetronome = useCallback(() => {
    const enabled = !metronomeEnabledRef.current;
    metronomeEnabledRef.current = enabled;
    if (!enabled) clearMetronomeSchedule();
    setState((prev) => ({ ...prev, metronomeEnabled: enabled }));
    persistPrefs({ metronome: enabled });
  }, [clearMetronomeSchedule, persistPrefs]);

  const setVelocity = useCallback((value: number) => {
    const player = playerRef.current;
    if (!player) return;
    const clamped = Math.min(1.5, Math.max(0.5, value));
    player.velocity = clamped;
    velocityRef.current = clamped;
    clearMetronomeSchedule();
    setState((prev) => ({ ...prev, velocity: clamped }));
    persistPrefs({ velocity: clamped });
  }, [clearMetronomeSchedule, persistPrefs]);

  return {
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
  };
}
