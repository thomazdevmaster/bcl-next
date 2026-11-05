import { clampPlaygroundVolume } from './playgroundVolume';
import { DRUM_CHANNEL, isStandardMidiFile, mergeStudyMidiLayers } from '@/study/studyMidiFix';

/** CC 7 — volume do canal. O arquivo pode reenviar esse controle; a trava impede que ele volte. */
export const CHANNEL_VOLUME_CC = 7;

/** Canais melódicos do GM. O 9 fica com a bateria. */
const MELODIC_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];

export type PlaygroundMidiChannel = {
  partId: string;
  channel: number;
  kind: 'melodic' | 'percussion';
  /** False quando o naipe divide o canal com outro e o volume não separa os dois. */
  separate: boolean;
};

export type PlaygroundPartVolumeRow = {
  id: string;
  label: string;
  channel: number;
  partIds: string[];
};

export type ChannelVolumeSynth = {
  controllerChange: (channel: number, controllerNumber: number, controllerValue: number) => void;
  lockController: (channel: number, controllerNumber: number, isLocked: boolean) => void;
};

export function assignPlaygroundMidiChannels(
  partIds: string[],
  isPercussive: (partId: string) => boolean,
): PlaygroundMidiChannel[] {
  const melodicCount = partIds.filter((partId) => !isPercussive(partId)).length;
  const assigned: PlaygroundMidiChannel[] = [];
  let melodicIndex = 0;
  for (const partId of partIds) {
    if (isPercussive(partId)) {
      assigned.push({
        partId,
        channel: DRUM_CHANNEL,
        kind: 'percussion',
        separate: false,
      });
      continue;
    }
    const sharesLast =
      melodicCount > MELODIC_CHANNELS.length && melodicIndex >= MELODIC_CHANNELS.length - 1;
    const channel = MELODIC_CHANNELS[Math.min(melodicIndex, MELODIC_CHANNELS.length - 1)] ?? 15;
    assigned.push({
      partId,
      channel,
      kind: 'melodic',
      separate: !sharesLast,
    });
    melodicIndex += 1;
  }
  return assigned;
}

export function playgroundPartVolumeRows(
  channels: PlaygroundMidiChannel[],
  labelFor: (partId: string) => string,
): PlaygroundPartVolumeRow[] {
  const rows: PlaygroundPartVolumeRow[] = [];
  const shared = new Map<number, PlaygroundMidiChannel[]>();
  const percussion: PlaygroundMidiChannel[] = [];

  for (const item of channels) {
    if (item.kind === 'percussion') {
      percussion.push(item);
      continue;
    }
    if (!item.separate) {
      const list = shared.get(item.channel) ?? [];
      list.push(item);
      shared.set(item.channel, list);
      continue;
    }
    rows.push({
      id: item.partId,
      label: labelFor(item.partId),
      channel: item.channel,
      partIds: [item.partId],
    });
  }

  for (const [channel, items] of shared) {
    rows.push({
      id: `shared-${channel}`,
      label: items.map((item) => labelFor(item.partId)).join(', '),
      channel,
      partIds: items.map((item) => item.partId),
    });
  }

  if (percussion.length === 1) {
    const only = percussion[0];
    rows.push({
      id: only.partId,
      label: labelFor(only.partId),
      channel: DRUM_CHANNEL,
      partIds: [only.partId],
    });
  } else if (percussion.length > 1) {
    rows.push({
      id: 'percussion',
      label: percussion.map((item) => labelFor(item.partId)).join(', '),
      channel: DRUM_CHANNEL,
      partIds: percussion.map((item) => item.partId),
    });
  }

  return rows;
}

function readVariableLength(data: Uint8Array, start: number): { value: number; next: number } {
  let value = 0;
  let i = start;
  while (i < data.length) {
    const byte = data[i];
    i += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, next: i };
}

function channelMessageDataLength(status: number): number {
  const hi = status & 0xf0;
  if (hi === 0xc0 || hi === 0xd0) return 1;
  if (hi >= 0x80 && hi <= 0xe0) return 2;
  return 0;
}

function rewriteTrackChannel(bytes: Uint8Array, start: number, end: number, channel: number): void {
  let i = start;
  let running = 0;
  while (i < end) {
    const delta = readVariableLength(bytes, i);
    i = delta.next;
    if (i >= end) break;
    const statusByte = bytes[i];
    const explicit = statusByte >= 0x80;
    const status = explicit ? statusByte : running;
    if (status === 0xff) {
      if (!explicit) break;
      i += 2;
      if (i > end) break;
      const length = readVariableLength(bytes, i);
      i = length.next + length.value;
      continue;
    }
    if (status === 0xf0 || status === 0xf7) {
      if (!explicit) break;
      i += 1;
      const length = readVariableLength(bytes, i);
      i = length.next + length.value;
      continue;
    }
    const dataLength = channelMessageDataLength(status);
    if (dataLength === 0) break;
    if (explicit && status >= 0x80 && status <= 0xef) {
      bytes[i] = (status & 0xf0) | (channel & 0x0f);
      running = bytes[i];
      i += 1 + dataLength;
      continue;
    }
    running = status;
    i += dataLength;
  }
}

/** Troca o canal de toda mensagem de voz, sem mexer em tempo, meta ou sysex. */
export function remapSmfVoiceToChannel(midi: ArrayBuffer, channel: number): ArrayBuffer {
  if (!isStandardMidiFile(midi) || channel < 0 || channel > 15) return midi.slice(0);
  const bytes = new Uint8Array(midi.byteLength);
  bytes.set(new Uint8Array(midi));
  const view = new DataView(bytes.buffer);
  const tracks = view.getUint16(10);
  let offset = 14;
  for (let track = 0; track < tracks && offset + 8 <= bytes.length; track += 1) {
    const marker = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    if (marker !== 'MTrk') break;
    const trackLength = view.getUint32(offset + 4);
    const start = offset + 8;
    const end = Math.min(bytes.length, start + trackLength);
    rewriteTrackChannel(bytes, start, end, channel);
    offset = end;
  }
  return bytes.buffer;
}

export async function assemblePlaygroundChannelMidi(options: {
  partIds: string[];
  isPercussive: (partId: string) => boolean;
  tempoBpm: number;
  loadStem: (partIds: string[]) => Promise<ArrayBuffer | null>;
}): Promise<{ buffer: ArrayBuffer; channels: PlaygroundMidiChannel[] } | null> {
  const channels = assignPlaygroundMidiChannels(options.partIds, options.isPercussive);
  if (channels.length === 0) return null;

  const layers = await Promise.all(
    channels.map(async (item) => {
      const buffer = await options.loadStem([item.partId]);
      if (!buffer) return null;
      const channel = item.kind === 'percussion' ? DRUM_CHANNEL : item.channel;
      return {
        kind: item.kind,
        buffer: remapSmfVoiceToChannel(buffer, channel),
      };
    }),
  );
  if (layers.some((layer) => layer == null)) return null;
  const ready = layers.filter((layer): layer is { kind: 'melodic' | 'percussion'; buffer: ArrayBuffer } => layer != null);
  if (ready.length === 1) return { buffer: ready[0].buffer, channels };
  const merged = mergeStudyMidiLayers(ready, options.tempoBpm, { skipNormalize: true });
  if (!merged) return null;
  return { buffer: merged, channels };
}

export function applyPlaygroundChannelVolumes(
  synth: ChannelVolumeSynth,
  rows: PlaygroundPartVolumeRow[],
  volumes: Record<string, number>,
): void {
  const seen = new Set<number>();
  for (const row of rows) {
    if (seen.has(row.channel)) continue;
    seen.add(row.channel);
    const value = Math.round(clampPlaygroundVolume(volumes[row.id] ?? 1) * 127);
    synth.lockController(row.channel, CHANNEL_VOLUME_CC, false);
    synth.controllerChange(row.channel, CHANNEL_VOLUME_CC, value);
    synth.lockController(row.channel, CHANNEL_VOLUME_CC, true);
  }
}
