export const PLAYGROUND_VOLUME_MIN = 0;
export const PLAYGROUND_VOLUME_MAX = 1;

export type PlaygroundVolumeIcon = 'volume_off' | 'volume_down' | 'volume_up';

export function clampPlaygroundVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(PLAYGROUND_VOLUME_MAX, Math.max(PLAYGROUND_VOLUME_MIN, value));
}

export function playgroundVolumeIcon(volume: number): PlaygroundVolumeIcon {
  if (volume <= 0) return 'volume_off';
  if (volume < 0.5) return 'volume_down';
  return 'volume_up';
}

/** Silenciar guarda o nível anterior. Ativar o som restaura esse nível. */
export function volumeAfterMuteToggle(
  volume: number,
  remembered: number,
): { volume: number; remembered: number } {
  if (volume <= 0) {
    const restored = remembered > 0 ? clampPlaygroundVolume(remembered) : 1;
    return { volume: restored, remembered: restored };
  }
  return { volume: 0, remembered: clampPlaygroundVolume(volume) };
}

type GainTarget = {
  gain: { value: number };
};

type SynthOutput = {
  disconnect: () => void;
  connect: (node: GainTarget) => void;
};

type GainFactory = {
  createGain: () => GainTarget;
  destination: unknown;
};

/** Liga a saída do sintetizador a um ganho geral antes do destino de áudio. */
export function connectMasterGain(
  synth: SynthOutput,
  context: GainFactory & { destination: AudioNode },
  volume: number,
): GainTarget {
  const gain = context.createGain();
  gain.gain.value = clampPlaygroundVolume(volume);
  synth.disconnect();
  synth.connect(gain);
  (gain as unknown as AudioNode).connect(context.destination);
  return gain;
}
