import {
  getPlaybackPositionFromTimemap,
  getPlaybackPositionFromUniformTempo,
  getStudyPlaybackPositionMs,
  readPlayerTimemap,
} from './studyTimemap';

export class StudyPlayerController {
  player: unknown = null;
  metronomeEnabled = false;
  metronomeVolume = 0.5;

  private metronomeTimer: number | null = null;
  private metronomeSyncTimer: number | null = null;
  private audioContext: AudioContext | null = null;
  private metronomeBeat = 0;
  private metronomeLastBeatIndex: number | null = null;
  private metronomeLastMeasureIndex: number | null = null;

  stopMetronome() {
    if (this.metronomeTimer) {
      window.clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
    if (this.metronomeSyncTimer) {
      window.clearInterval(this.metronomeSyncTimer);
      this.metronomeSyncTimer = null;
    }
    this.metronomeBeat = 0;
    this.metronomeLastBeatIndex = null;
    this.metronomeLastMeasureIndex = null;
  }

  restartMetronome(isPlaying: boolean, bpm: number, beatsPerMeasure: number) {
    if (!this.metronomeEnabled) return;
    this.stopMetronome();
    if (isPlaying) this.startMetronomeSync(bpm, beatsPerMeasure);
    else this.startMetronome(bpm, beatsPerMeasure);
  }

  startMetronome(bpm: number, beatsPerMeasure: number) {
    if (this.metronomeTimer) return;
    this.ensureAudioContext();
    const interval = this.getMetronomeIntervalMs(bpm);
    this.metronomeBeat = 0;
    this.clickMetronome(true, beatsPerMeasure);
    this.metronomeTimer = window.setInterval(() => this.clickMetronome(false, beatsPerMeasure), interval);
  }

  startMetronomeSync(_bpm: number, beatsPerMeasure: number) {
    if (this.metronomeSyncTimer) return;
    this.ensureAudioContext();
    this.metronomeLastBeatIndex = null;
    this.metronomeLastMeasureIndex = null;
    this.metronomeSyncTimer = window.setInterval(() => {
      if (!this.player) return;
      const posMs = this.getPlayerPositionMs();
      if (posMs == null) return;
      const timemap = readPlayerTimemap(this.player);
      const beatInfo = timemap?.length
        ? this.getBeatIndexFromTimemap(posMs, timemap, beatsPerMeasure)
        : this.getBeatIndexFromUniformTempo(posMs, beatsPerMeasure, _bpm);
      if (!beatInfo) return;
      if (this.metronomeLastBeatIndex === beatInfo.globalBeat) return;
      const accent = beatInfo.beatInMeasure === 0;
      this.clickMetronome(accent, beatsPerMeasure);
      this.metronomeLastBeatIndex = beatInfo.globalBeat;
      this.metronomeLastMeasureIndex = beatInfo.measureIndex;
    }, 30);
  }

  private getMetronomeIntervalMs(bpm: number): number {
    const safeBpm = Math.max(30, bpm);
    return Math.round(60000 / safeBpm);
  }

  private ensureAudioContext() {
    if (this.audioContext) return;
    const AudioCtx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.audioContext = new AudioCtx();
  }

  private clickMetronome(forceAccent: boolean, beatsPerMeasure: number) {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const isAccent = forceAccent || this.metronomeBeat === 0;
    osc.frequency.value = isAccent ? 1400 : 1000;
    const baseVol = Math.max(0, Math.min(1, this.metronomeVolume));
    const vol = isAccent ? Math.min(1, baseVol * 1.4) : baseVol;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
    this.metronomeBeat = (this.metronomeBeat + 1) % Math.max(1, beatsPerMeasure);
  }

  private getPlayerPositionMs(): number | null {
    return getStudyPlaybackPositionMs(this.player);
  }

  private getBeatIndexFromTimemap(
    posMs: number,
    timemap: NonNullable<ReturnType<typeof readPlayerTimemap>>,
    beatsPerMeasure: number,
  ): {
    globalBeat: number;
    beatInMeasure: number;
    measureIndex: number;
  } | null {
    const pos = getPlaybackPositionFromTimemap(timemap, posMs, beatsPerMeasure);
    if (!pos) return null;
    const beats = Math.max(1, beatsPerMeasure);
    const globalBeat = pos.measureIndex * beats + pos.beatInMeasure;
    return {
      globalBeat,
      beatInMeasure: pos.beatInMeasure,
      measureIndex: pos.measureIndex,
    };
  }

  private getBeatIndexFromUniformTempo(
    posMs: number,
    beatsPerMeasure: number,
    tempoBpm: number,
  ): {
    globalBeat: number;
    beatInMeasure: number;
    measureIndex: number;
  } | null {
    const pos = getPlaybackPositionFromUniformTempo(posMs, beatsPerMeasure, tempoBpm);
    const beats = Math.max(1, beatsPerMeasure);
    const globalBeat = pos.measureIndex * beats + pos.beatInMeasure;
    return {
      globalBeat,
      beatInMeasure: pos.beatInMeasure,
      measureIndex: pos.measureIndex,
    };
  }
}
