import { describe, expect, it } from 'vitest';
import { DRUM_CHANNEL } from '@/study/studyMidiFix';
import {
  applyPlaygroundChannelVolumes,
  assemblePlaygroundChannelMidi,
  assignPlaygroundMidiChannels,
  playgroundPartVolumeRows,
  remapSmfVoiceToChannel,
} from './playgroundMidiChannels';

function smf(track: number[]): ArrayBuffer {
  const data = new Uint8Array(track);
  const header = new Uint8Array(14);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x4d546864);
  view.setUint32(4, 6);
  view.setUint16(8, 0);
  view.setUint16(10, 1);
  view.setUint16(12, 96);
  const chunk = new Uint8Array(8 + data.length);
  chunk.set([0x4d, 0x54, 0x72, 0x6b], 0);
  new DataView(chunk.buffer).setUint32(4, data.length);
  chunk.set(data, 8);
  const out = new Uint8Array(header.length + chunk.length);
  out.set(header, 0);
  out.set(chunk, header.length);
  return out.buffer;
}

const NOTE = [
  0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
  0x00, 0xc3, 0x40,
  0x00, 0xb3, 0x07, 0x5a,
  0x00, 0x93, 0x3c, 0x64,
  0x0a, 0x3c, 0x00,
  0x00, 0xe3, 0x00, 0x40,
  0x00, 0xff, 0x2f, 0x00,
];

describe('assignPlaygroundMidiChannels', () => {
  const perc = (id: string) => id.startsWith('D');

  it('dá um canal melódico a cada naipe e deixa a bateria no canal 10', () => {
    expect(assignPlaygroundMidiChannels(['P1', 'D1', 'P2'], perc)).toEqual([
      { partId: 'P1', channel: 0, kind: 'melodic', separate: true },
      { partId: 'D1', channel: DRUM_CHANNEL, kind: 'percussion', separate: false },
      { partId: 'P2', channel: 1, kind: 'melodic', separate: true },
    ]);
  });

  it('não usa o canal da bateria e agrupa o que passar de 15 naipes', () => {
    const ids = Array.from({ length: 16 }, (_, index) => `P${index + 1}`);
    const assigned = assignPlaygroundMidiChannels(ids, () => false);
    const channels = assigned.map((item) => item.channel);
    expect(channels).not.toContain(DRUM_CHANNEL);
    expect(new Set(channels.slice(0, 14)).size).toBe(14);
    expect(assigned[14]).toMatchObject({ channel: 15, separate: false });
    expect(assigned[15]).toMatchObject({ channel: 15, separate: false });
    expect(assigned[13].separate).toBe(true);
  });
});

describe('playgroundPartVolumeRows', () => {
  it('junta a percussão num controle e o estouro de canais noutro', () => {
    const channels = assignPlaygroundMidiChannels(
      ['P1', 'D1', 'D2', ...Array.from({ length: 15 }, (_, index) => `X${index}`)],
      (id) => id.startsWith('D'),
    );
    const rows = playgroundPartVolumeRows(channels, (id) => id);
    expect(rows.find((row) => row.id === 'percussion')?.partIds).toEqual(['D1', 'D2']);
    expect(rows.find((row) => row.id === 'shared-15')?.partIds).toEqual(['X13', 'X14']);
    expect(rows.find((row) => row.id === 'P1')?.channel).toBe(0);
  });
});

describe('remapSmfVoiceToChannel', () => {
  it('reescreve nota, programa, volume e bend e preserva o tempo e o status corrido', () => {
    const remapped = new Uint8Array(remapSmfVoiceToChannel(smf(NOTE), 0));
    expect(Array.from(remapped)).toContain(0xc0);
    expect(Array.from(remapped)).toContain(0xb0);
    expect(Array.from(remapped)).toContain(0x90);
    expect(Array.from(remapped)).toContain(0xe0);
    expect(Array.from(remapped)).not.toContain(0xc3);
    expect(Array.from(remapped)).not.toContain(0x93);
    expect(Array.from(remapped).slice(remapped.indexOf(0x51), remapped.indexOf(0x51) + 5)).toEqual([
      0x51, 0x03, 0x07, 0xa1, 0x20,
    ]);
    const noteOn = remapped.indexOf(0x90);
    expect(Array.from(remapped.slice(noteOn, noteOn + 6))).toEqual([0x90, 0x3c, 0x64, 0x0a, 0x3c, 0x00]);
  });
});

describe('assemblePlaygroundChannelMidi', () => {
  it('mantém cada naipe no canal atribuído depois da mistura', async () => {
    const stem = smf(NOTE);
    const mixed = await assemblePlaygroundChannelMidi({
      partIds: ['P1', 'P2', 'D1'],
      isPercussive: (id) => id === 'D1',
      tempoBpm: 120,
      loadStem: async () => stem.slice(0),
    });
    expect(mixed?.channels.map((item) => item.channel)).toEqual([0, 1, DRUM_CHANNEL]);
    const bytes = new Uint8Array(mixed?.buffer ?? new ArrayBuffer(0));
    expect(bytes).toContain(0x90);
    expect(bytes).toContain(0x91);
    expect(bytes).toContain(0x99);
  });

  it('desiste da separação se algum naipe não tiver MIDI', async () => {
    const mixed = await assemblePlaygroundChannelMidi({
      partIds: ['P1', 'P2'],
      isPercussive: () => false,
      tempoBpm: 120,
      loadStem: async (ids) => (ids[0] === 'P1' ? smf(NOTE) : null),
    });
    expect(mixed).toBeNull();
  });
});

describe('applyPlaygroundChannelVolumes', () => {
  it('grava o volume do canal e trava o controle para o arquivo não repor', () => {
    const calls: string[] = [];
    applyPlaygroundChannelVolumes(
      {
        controllerChange: (channel, controller, value) => {
          calls.push(`cc ${channel} ${controller} ${value}`);
        },
        lockController: (channel, controller, locked) => {
          calls.push(`lock ${channel} ${controller} ${locked}`);
        },
      },
      [
        { id: 'P1', label: 'Flauta', channel: 0, partIds: ['P1'] },
        { id: 'percussion', label: 'Bateria', channel: 9, partIds: ['D1'] },
      ],
      { P1: 0.5, percussion: 0 },
    );
    expect(calls).toEqual([
      'lock 0 7 false',
      'cc 0 7 64',
      'lock 0 7 true',
      'lock 9 7 false',
      'cc 9 7 0',
      'lock 9 7 true',
    ]);
  });
});
