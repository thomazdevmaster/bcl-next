"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RhythmGameFrame } from "@/components/games/ritmos/RhythmGameFrame";
import {
  RHYTHM_GLYPH_HEIGHT_PX,
  RhythmGlyph,
} from "@/components/games/ritmos/RhythmGlyph";
import {
  type RhythmFigure,
  type RhythmLevel,
  type RhythmLevelStats,
  readRhythmLevelStats,
  writeRhythmLevelStats,
} from "@/domains/games/ritmos/rhythmFigures";
import { RHYTHM_HOLD_HELP } from "@/domains/games/ritmos/rhythmHelp";
import {
  HOLD_NOTE_POINTS,
  HOLD_ROUND_POINTS,
  type HoldInterval,
  RHYTHM_HOLD_STORAGE_KEY,
  buildHoldRound,
  coveredBeats,
  lateBeats,
  noteSettled,
  scoreHoldNote,
  scoreHoldRest,
} from "@/domains/games/ritmos/rhythmHold";
import { RHYTHM_BEAT_MS, useRhythmPlayer } from "@/lib/music/useRhythmPlayer";

const PX_PER_BEAT = 88;
const PLAYHEAD_PX = 48;
const COUNT_IN_BEATS = 4;
const BEAT_SEC = RHYTHM_BEAT_MS / 1000;

type Phase = "ready" | "play" | "result";

interface Track {
  figure: RhythmFigure;
  start: number;
  end: number;
  releaseGrace: number;
  scored: boolean;
  points: number | null;
}

interface ScoredEvent {
  index: number;
  label: string;
  rest: boolean;
  points: number;
}

interface Clock {
  originAudio: number | null;
  originPerf: number;
  useAudio: boolean;
}

function readStats(): RhythmLevelStats {
  return readRhythmLevelStats(RHYTHM_HOLD_STORAGE_KEY);
}

export function RhythmHoldGame() {
  const player = useRhythmPlayer();
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const [stats, setStats] = useState<RhythmLevelStats>(readStats);
  const [phase, setPhase] = useState<Phase>("ready");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [nowBeat, setNowBeat] = useState(-COUNT_IN_BEATS);
  const [holding, setHolding] = useState(false);
  const [results, setResults] = useState<ScoredEvent[]>([]);
  const [roundPoints, setRoundPoints] = useState(0);

  const tracksRef = useRef<Track[]>([]);
  const holdsRef = useRef<HoldInterval[]>([]);
  const clockRef = useRef<Clock>({
    originAudio: null,
    originPerf: 0,
    useAudio: false,
  });
  const phaseRef = useRef<Phase>("ready");
  const rafRef = useRef(0);
  const levelRef = useRef<RhythmLevel>(stats.selectedLevel);
  const bestRef = useRef(stats.bestStreakByLevel);

  const currentBeat = useCallback(() => {
    const clock = clockRef.current;
    if (clock.useAudio && clock.originAudio != null) {
      const time = playerRef.current.getTime();
      if (time != null) return (time - clock.originAudio) / BEAT_SEC;
    }
    return (performance.now() - clock.originPerf) / RHYTHM_BEAT_MS;
  }, []);

  const finishRound = useCallback((total: number) => {
    phaseRef.current = "result";
    setPhase("result");
    setRoundPoints(total);
    const level = levelRef.current;
    const best = bestRef.current;
    if (total <= best[level]) return;
    const next = { ...best, [level]: total };
    bestRef.current = next;
    const saved: RhythmLevelStats = {
      selectedLevel: level,
      bestStreakByLevel: next,
    };
    writeRhythmLevelStats(RHYTHM_HOLD_STORAGE_KEY, saved);
    setStats(saved);
  }, []);

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (phaseRef.current !== "play") return;
      const beat = currentBeat();
      setNowBeat(beat);
      const holds = holdsRef.current;
      const scored: ScoredEvent[] = [];
      let changed = false;

      for (let index = 0; index < tracksRef.current.length; index += 1) {
        const track = tracksRef.current[index]!;
        if (!track.scored) {
          const duration = track.end - track.start;
          if (track.figure.rest) {
            if (beat >= track.end) {
              track.points = scoreHoldRest(
                duration,
                coveredBeats(track.start, track.end, holds, beat),
              );
              track.scored = true;
              changed = true;
            }
          } else if (
            noteSettled(track.start, track.end, holds, beat, track.releaseGrace)
          ) {
            track.points = scoreHoldNote(
              duration,
              coveredBeats(track.start, track.end, holds, track.end),
              lateBeats(track.end, duration, holds, track.releaseGrace),
            );
            track.scored = true;
            changed = true;
          }
        }
        if (track.points != null) {
          scored.push({
            index,
            label: track.figure.label,
            rest: track.figure.rest,
            points: track.points,
          });
        }
      }

      if (changed) {
        setResults(scored);
        setRoundPoints(scored.reduce((sum, item) => sum + item.points, 0));
      }

      const allScored =
        tracksRef.current.length > 0 &&
        tracksRef.current.every((track) => track.scored);
      if (allScored) {
        const total = tracksRef.current.reduce(
          (sum, track) => sum + (track.points ?? 0),
          0,
        );
        finishRound(total);
        return;
      }
      rafRef.current = window.requestAnimationFrame(() => {
        tickRef.current();
      });
    };
  }, [currentBeat, finishRound]);

  const stopRound = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    playerRef.current.stop();
    holdsRef.current = [];
    setHolding(false);
  }, []);

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      playerRef.current.stop();
    };
  }, []);

  const startRound = useCallback(() => {
    stopRound();
    const events = buildHoldRound(levelRef.current);
    const nextTracks: Track[] = events.map((event) => ({
      ...event,
      scored: false,
      points: null,
    }));
    tracksRef.current = nextTracks;
    holdsRef.current = [];
    setTracks(nextTracks);
    setResults([]);
    setRoundPoints(0);
    setNowBeat(-COUNT_IN_BEATS);
    setHolding(false);

    const totalBeats = events.at(-1)?.end ?? 0;
    const origin = playerRef.current.playMetronome(totalBeats, {
      countIn: true,
    });
    if (origin != null) {
      clockRef.current = { originAudio: origin, originPerf: 0, useAudio: true };
    } else {
      clockRef.current = {
        originAudio: null,
        originPerf: performance.now() + 50 + COUNT_IN_BEATS * RHYTHM_BEAT_MS,
        useAudio: false,
      };
    }
    phaseRef.current = "play";
    setPhase("play");
    rafRef.current = window.requestAnimationFrame(() => {
      tickRef.current();
    });
  }, [stopRound]);

  const changeLevel = useCallback(
    (next: RhythmLevel) => {
      if (next === levelRef.current) return;
      stopRound();
      phaseRef.current = "ready";
      setPhase("ready");
      tracksRef.current = [];
      setTracks([]);
      setResults([]);
      setRoundPoints(0);
      setNowBeat(-COUNT_IN_BEATS);
      const saved: RhythmLevelStats = {
        selectedLevel: next,
        bestStreakByLevel: bestRef.current,
      };
      levelRef.current = next;
      writeRhythmLevelStats(RHYTHM_HOLD_STORAGE_KEY, saved);
      setStats(saved);
    },
    [stopRound],
  );

  const pressAt = useCallback((beat: number) => {
    if (phaseRef.current !== "play") return;
    if (holdsRef.current.some((hold) => hold.end == null)) return;
    holdsRef.current.push({ start: beat, end: null });
    playerRef.current.startSustain();
    setHolding(true);
  }, []);

  const releaseAt = useCallback((beat: number) => {
    const open = holdsRef.current.find((hold) => hold.end == null);
    if (!open) return;
    open.end = beat;
    playerRef.current.stopSustain();
    setHolding(false);
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      pressAt(currentBeat());
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      event.preventDefault();
      releaseAt(currentBeat());
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      releaseAt(currentBeat());
    };
  }, [currentBeat, phase, pressAt, releaseAt]);

  const maxPoints = Math.max(tracks.length, 1) * HOLD_NOTE_POINTS;
  const countIn = phase === "play" && nowBeat < 0;
  const countBeat = countIn
    ? Math.min(COUNT_IN_BEATS, Math.floor(nowBeat + COUNT_IN_BEATS) + 1)
    : 0;
  const active = tracks.find(
    (track) => nowBeat >= track.start && nowBeat < track.end,
  );
  const beatFlash = ((nowBeat % 1) + 1) % 1 < 0.12;

  let status = "Um compasso de metrônomo, depois as notas.";
  if (countIn) status = `Metrônomo, tempo ${countBeat}.`;
  else if (phase === "result")
    status = `${roundPoints} de ${tracks.length * HOLD_NOTE_POINTS} pontos.`;
  else if (active?.figure.rest)
    status = `${active.figure.label}: solte o botão.`;
  else if (active) status = `${active.figure.label}: segure o botão.`;
  else if (
    phase === "play" &&
    nowBeat >= 0 &&
    tracks.some((track) => track.start > nowBeat)
  )
    status = "Solte e prepare a próxima nota.";
  else if (phase === "play") status = "Acompanhe a linha.";

  const laneLabel = tracks.map((track) => track.figure.label).join(", ");

  return (
    <RhythmGameFrame
      title="Segure o tempo"
      helpTitle="Como jogar Segure o tempo"
      helpDescription="Segure o botão pelo tempo da nota e solte nas pausas."
      help={RHYTHM_HOLD_HELP}
      level={stats.selectedLevel}
      onChangeLevel={changeLevel}
      levelLocked={phase === "play"}
      streak={roundPoints}
      best={stats.bestStreakByLevel[stats.selectedLevel]}
      scoreLabel="Pontos"
      recordLabel="Recorde"
    >
      <div className="space-y-3">
        <div
          className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]"
          style={{ height: RHYTHM_GLYPH_HEIGHT_PX + 16 }}
          role="img"
          aria-label={laneLabel || "Pauta vazia"}
        >
          <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-current opacity-45" />
          {tracks.map((track, index) => {
            const width = (track.end - track.start) * PX_PER_BEAT;
            const x = PLAYHEAD_PX + (track.start - nowBeat) * PX_PER_BEAT;
            const current = active === track;
            return (
              <div
                key={`${track.figure.id}-${index}`}
                className={`absolute top-1 bottom-1 flex items-center justify-start overflow-visible rounded-md border ${
                  track.figure.rest
                    ? "border-dashed border-[var(--muted)] bg-[var(--card-secondary)]"
                    : "border-[var(--color-brand)]/40 bg-[var(--color-brand)]/15"
                } ${current ? "ring-2 ring-[var(--color-brand)]" : ""}`}
                style={{
                  left: 0,
                  width,
                  transform: `translateX(${x}px)`,
                  zIndex: index + 1,
                }}
              >
                <RhythmGlyph figure={track.figure} />
              </div>
            );
          })}
          <div
            className="pointer-events-none absolute bottom-2 top-2 z-20 w-0.5 bg-[var(--color-brand)]"
            style={{ left: PLAYHEAD_PX }}
          />
          <div
            className={`pointer-events-none absolute top-2 z-20 size-3 -translate-x-1/2 rounded-full bg-[var(--color-brand)] ${
              beatFlash ? "opacity-100" : "opacity-25"
            }`}
            style={{ left: PLAYHEAD_PX }}
            aria-hidden
          />
        </div>

        <p
          className="min-h-5 text-sm text-[var(--foreground)]"
          aria-live="polite"
        >
          {status}
        </p>

        {results.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {results.map((item) => (
              <li
                key={item.index}
                className="rounded-full border border-[var(--border)] bg-[var(--card-secondary)] px-2.5 py-1 text-xs font-medium"
              >
                {item.label} {item.points}/{HOLD_NOTE_POINTS}
              </li>
            ))}
          </ul>
        ) : null}

        {phase === "play" || holding ? (
          <button
            type="button"
            aria-pressed={holding}
            aria-label={
              holding ? "Segurando o tempo" : "Segure o tempo da nota"
            }
            className={`w-full min-h-24 touch-none select-none rounded-2xl text-lg font-semibold ${
              holding
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-2 border-[var(--color-brand)] bg-[var(--card)] text-[var(--foreground)]"
            }`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              pressAt(currentBeat());
            }}
            onPointerUp={(event) => {
              event.preventDefault();
              releaseAt(currentBeat());
            }}
            onPointerCancel={(event) => {
              event.preventDefault();
              releaseAt(currentBeat());
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {holding ? "Segurando" : "Segure"}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-4 text-base font-semibold text-[var(--primary-foreground)]"
            onClick={startRound}
          >
            {phase === "result" ? "Outra rodada" : "Começar"}
          </button>
        )}

        {phase !== "play" ? (
          <p className="text-xs text-[var(--muted)]">
            {phase === "result"
              ? `Nesta rodada, ${roundPoints} de ${tracks.length * HOLD_NOTE_POINTS}.`
              : `A rodada vale ${HOLD_ROUND_POINTS[stats.selectedLevel]} pontos. Cada figura vale ${HOLD_NOTE_POINTS}.`}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            {roundPoints} de {maxPoints} até aqui
          </p>
        )}
      </div>
    </RhythmGameFrame>
  );
}
