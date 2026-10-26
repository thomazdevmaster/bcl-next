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
import type { MeasureTimemapEntry } from '@/study/studyTimemap';
import { patchMusicXmlPlayerAudioWorklet } from './patchMusicXmlPlayerForNext';
import type { PlaygroundZoomState } from './playgroundZoomTypes';

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
};

export function useScorePlaygroundPlayer(ownerId: string | null) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const rendererRef = useRef<ScorePlaygroundSheetRenderer | null>(null);
  const loadTokenRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<ScorePlaygroundViewState>(INITIAL);

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
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopPositionLoop]);

  const teardownPlayer = useCallback(() => {
    stopPositionLoop();
    playerRef.current?.destroy();
    playerRef.current = null;
    rendererRef.current = null;
    if (sheetRef.current) sheetRef.current.replaceChildren();
  }, [stopPositionLoop]);

  const refreshZoomState = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    setState((prev) => ({ ...prev, zoom: renderer.getZoomState() }));
  }, []);

  useEffect(() => () => teardownPlayer(), [teardownPlayer]);

  const resetToCatalog = useCallback(() => {
    teardownPlayer();
    setState(INITIAL);
  }, [teardownPlayer]);

  const startSession = useCallback(
    async (options: StudyStartOptions) => {
      const token = loadTokenRef.current + 1;
      loadTokenRef.current = token;
      teardownPlayer();

      const songId = String(options.song.id);
      const scoreIds = options.scoreInstrumentIds;
      const midiIds = options.midiInstrumentIds;
      const sameSelection =
        scoreIds.length === midiIds.length &&
        scoreIds.every((id) => midiIds.includes(id));
      if (!sameSelection) {
        setState({
          ...INITIAL,
          phase: 'error',
          songTitle: options.song.title,
          error:
            'No playground, use os mesmos instrumentos na partitura e no áudio para sincronizar cursor e MIDI. Ajuste a seleção e tente de novo.',
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
        phase: 'loading',
        songTitle: options.song.title,
        scoreLoading: true,
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

        const playbackMidi = await buildPlaygroundPlaybackMidi(
          catalogXml,
          songId,
          midiIds,
          assets.midi,
          assets.timemap,
        );
        if (token !== loadTokenRef.current) return;

        patchMusicXmlPlayerAudioWorklet();
        const renderer = new ScorePlaygroundSheetRenderer();
        rendererRef.current = renderer;
        const playerTimemap = timemapForPlayer(assets.timemap);
        const converter = new FetchConverter(playbackMidi, playerTimemap);

        const player = await Player.create({
          container: mount,
          musicXml: playbackXml,
          renderer,
          converter,
          unroll: false,
          followCursor: true,
          repeat: 1,
          velocity: 1,
        });
        if (token !== loadTokenRef.current) {
          player.destroy();
          return;
        }

        playerRef.current = player;
        setState({
          phase: 'ready',
          songTitle: options.song.title,
          error: null,
          playerReady: true,
          playing: false,
          positionMs: 0,
          durationMs: player.duration,
          velocity: 1,
          scoreLoading: false,
          zoom: renderer.getZoomState(),
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
    [ownerId, startPositionLoop, teardownPlayer],
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

  const zoomIn = useCallback(() => {
    rendererRef.current?.zoomIn();
    refreshZoomState();
    requestAnimationFrame(() => refreshZoomState());
    window.setTimeout(() => refreshZoomState(), 1200);
  }, [refreshZoomState]);

  const zoomOut = useCallback(() => {
    rendererRef.current?.zoomOut();
    refreshZoomState();
    requestAnimationFrame(() => refreshZoomState());
    window.setTimeout(() => refreshZoomState(), 1200);
  }, [refreshZoomState]);

  const setVelocity = useCallback((value: number) => {
    const player = playerRef.current;
    if (!player) return;
    const clamped = Math.min(1.5, Math.max(0.5, value));
    player.velocity = clamped;
    setState((prev) => ({ ...prev, velocity: clamped }));
  }, []);

  return {
    sheetRef,
    state,
    startSession,
    resetToCatalog,
    play,
    pause,
    rewind,
    setVelocity,
    zoomIn,
    zoomOut,
  };
}
