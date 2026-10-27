/** Referência: Lá4 (A4) = 440 Hz (padrão internacional). */

export const A4_REFERENCE_HZ = 440;
export const A4_MIDI = 69;

export type SolfegeName =
  | 'Dó'
  | 'Ré'
  | 'Mi'
  | 'Fá'
  | 'Sol'
  | 'Lá'
  | 'Si';

export interface PitchDefinition {
  id: string;
  midi: number;
  solfege: SolfegeName;
  letter: string;
}

/** Frequência em Hz a partir do número MIDI (temperamento igual). */
export function frequencyFromMidi(midi: number): number {
  return A4_REFERENCE_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

export function frequencyFromPitchId(
  pitches: readonly PitchDefinition[],
  pitchId: string,
): number | null {
  const pitch = pitches.find((item) => item.id === pitchId);
  return pitch ? frequencyFromMidi(pitch.midi) : null;
}
