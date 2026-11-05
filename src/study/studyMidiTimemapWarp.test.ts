// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('./studyUnrollMusicXml', async () => {
  const { prepareMusicXmlForStudyPlayback } = await import('./studyUtils');
  return {
    prepareMusicXmlForMidiPlayback: async (xml: string) => prepareMusicXmlForStudyPlayback(xml),
  };
});

import { assembleStudyPlaybackMidi } from './studyPlaybackMidi';
import {
  alignStudyPlaybackLayerToTimemap,
  extractTimedEventsFromSmf,
  readFirstSmfTempoBpm,
  warpStudySmfToTimemap,
} from './studyMidiFix';
import type { MeasureTimemapEntry } from './studyTimemap';
import { buildUnpitchedMidiFromXml } from './unpitchedMidiFromXml';

function vlq(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

function chunk(events: { tick: number; bytes: number[] }[]): number[] {
  const body: number[] = [];
  let last = 0;
  for (const event of [...events].sort((a, b) => a.tick - b.tick)) {
    body.push(...vlq(event.tick - last), ...event.bytes);
    last = event.tick;
  }
  body.push(0, 0xff, 0x2f, 0);
  const len = body.length;
  return [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff, ...body];
}

/** SMF formato 1 como o Verovio grava: andamentos na faixa 0, notas na faixa 1. */
function verovioLikeSmf(options: {
  division: number;
  tempos: number[];
  notes: { quarter: number; pitch: number; channel?: number }[];
}): ArrayBuffer {
  const tempoTrack = chunk(
    options.tempos.map((bpm) => {
      const us = Math.round(60_000_000 / bpm);
      return { tick: 0, bytes: [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff] };
    }),
  );
  const noteTrack = chunk(
    options.notes.flatMap((note) => {
      const channel = note.channel ?? 0;
      const tick = Math.round(note.quarter * options.division);
      return [
        { tick, bytes: [0x90 | channel, note.pitch, 90] },
        { tick: tick + Math.round(options.division / 2), bytes: [0x80 | channel, note.pitch, 0] },
      ];
    }),
  );
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, (options.division >> 8) & 0xff, options.division & 0xff];
  return new Uint8Array([...header, ...tempoTrack, ...noteTrack]).buffer;
}

function noteOnMs(midi: ArrayBuffer, channel?: number): number[] {
  const { events, division } = extractTimedEventsFromSmf(midi);
  const bpm = readFirstSmfTempoBpm(midi) ?? 120;
  const msPerTick = 60_000 / bpm / division;
  return events
    .filter((event) => (event.status & 0xf0) === 0x90 && event.d2 > 0)
    .filter((event) => channel == null || (event.status & 0x0f) === channel)
    .map((event) => Math.round(event.tick * msPerTick))
    .sort((a, b) => a - b);
}

function lastEventMs(midi: ArrayBuffer): number {
  const { events, division } = extractTimedEventsFromSmf(midi);
  const bpm = readFirstSmfTempoBpm(midi) ?? 120;
  const maxTick = events.reduce((max, event) => Math.max(max, event.tick), 0);
  return Math.round((maxTick / division) * (60_000 / bpm));
}

/** ♩=90 em 4/4: 2667 ms por compasso, como o timemap v2 do bcl-api. */
const TIMEMAP_90: MeasureTimemapEntry[] = [
  { measure: 0, timestamp: 0, duration: 2667, qstamp: 0, quarters: 4 },
  { measure: 1, timestamp: 2667, duration: 2666, qstamp: 4, quarters: 4 },
  { measure: 2, timestamp: 5333, duration: 2667, qstamp: 8, quarters: 4 },
];

describe('readFirstSmfTempoBpm', () => {
  it('usa o último Set Tempo do primeiro tick (Verovio grava 120 e depois o andamento real)', () => {
    const midi = verovioLikeSmf({ division: 120, tempos: [120, 90], notes: [{ quarter: 0, pitch: 60 }] });
    expect(readFirstSmfTempoBpm(midi)).toBeCloseTo(90, 3);
  });
});

describe('warpStudySmfToTimemap', () => {
  it('coloca cada nota no ms do compasso no timemap, seja qual for o andamento do arquivo', () => {
    const notes = [
      { quarter: 0, pitch: 60 },
      { quarter: 4, pitch: 62 },
      { quarter: 10, pitch: 64 },
    ];
    const at120 = verovioLikeSmf({ division: 120, tempos: [120], notes });
    const at60 = verovioLikeSmf({ division: 480, tempos: [60], notes });

    const warped120 = warpStudySmfToTimemap(at120, TIMEMAP_90, 90);
    const warped60 = warpStudySmfToTimemap(at60, TIMEMAP_90, 90);
    expect(warped120).not.toBeNull();
    expect(warped60).not.toBeNull();

    const expected = [0, 2667, 5333 + 2667 / 2];
    noteOnMs(warped120 as ArrayBuffer).forEach((ms, index) => {
      expect(Math.abs(ms - expected[index])).toBeLessThanOrEqual(2);
    });
    expect(noteOnMs(warped60 as ArrayBuffer)).toEqual(noteOnMs(warped120 as ArrayBuffer));
  });

  it('estende o arquivo até o fim do timemap para o sequenciador medir a mesma duração do cursor', () => {
    const midi = verovioLikeSmf({ division: 120, tempos: [90], notes: [{ quarter: 0, pitch: 60 }] });
    const warped = warpStudySmfToTimemap(midi, TIMEMAP_90, 90) as ArrayBuffer;
    expect(Math.abs(lastEventMs(warped) - 8000)).toBeLessThanOrEqual(2);
  });

  it('não altera o fluxo antigo quando o timemap não traz semínimas (API anterior)', () => {
    const midi = verovioLikeSmf({ division: 120, tempos: [90], notes: [{ quarter: 4, pitch: 60 }] });
    const legacy = TIMEMAP_90.map(({ measure, timestamp, duration }) => ({ measure, timestamp, duration }));
    expect(warpStudySmfToTimemap(midi, legacy, 90)).toBeNull();
    const aligned = alignStudyPlaybackLayerToTimemap(midi, legacy, 90);
    expect(Math.abs(noteOnMs(aligned)[0] - 2667)).toBeLessThanOrEqual(2);
  });
});

const drumPart = (id: string, divisions: number, body: string) => `
  <part id="${id}">
    <measure number="1">
      <attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign></clef></attributes>
      ${body}
    </measure>
  </part>`;

const drumScorePart = (id: string) => `
  <score-part id="${id}">
    <part-name>Bateria</part-name>
    <score-instrument id="${id}-I36"><instrument-name>Bass Drum</instrument-name></score-instrument>
    <score-instrument id="${id}-I43"><instrument-name>Floor Tom</instrument-name></score-instrument>
    <midi-instrument id="${id}-I36"><midi-channel>10</midi-channel><midi-unpitched>37</midi-unpitched></midi-instrument>
    <midi-instrument id="${id}-I43"><midi-channel>10</midi-channel><midi-unpitched>44</midi-unpitched></midi-instrument>
  </score-part>`;

const unpitched = (instrument: string, duration: number, chord = false) => `
  <note>${chord ? '<chord/>' : ''}
    <unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>
    <duration>${duration}</duration>
    <instrument id="${instrument}"/>
  </note>`;

describe('buildUnpitchedMidiFromXml', () => {
  it('toca a nota de acorde junto da anterior, não depois dela', () => {
    const xml = `<?xml version="1.0"?><score-partwise version="3.1">
      <part-list>${drumScorePart('P1')}</part-list>
      ${drumPart('P1', 1, `${unpitched('P1-I36', 1)}${unpitched('P1-I43', 1, true)}${unpitched('P1-I36', 1)}<note><rest/><duration>1</duration></note>`)}
    </score-partwise>`;
    const midi = buildUnpitchedMidiFromXml(xml, ['P1'], 120) as ArrayBuffer;
    expect(noteOnMs(midi, 9)).toEqual([0, 0, 500]);
  });

  it('mantém a mesma posição quando naipes de percussão usam divisions diferentes', () => {
    const xml = `<?xml version="1.0"?><score-partwise version="3.1">
      <part-list>${drumScorePart('P1')}${drumScorePart('P2')}</part-list>
      ${drumPart('P1', 1, `<note><rest/><duration>2</duration></note>${unpitched('P1-I36', 2)}`)}
      ${drumPart('P2', 4, `<note><rest/><duration>8</duration></note>${unpitched('P2-I43', 8)}`)}
    </score-partwise>`;
    const midi = buildUnpitchedMidiFromXml(xml, ['P1', 'P2'], 120) as ArrayBuffer;
    expect(noteOnMs(midi, 9)).toEqual([1000, 1000]);
  });
});

describe('assembleStudyPlaybackMidi com timemap v2', () => {
  const catalogXml = `<?xml version="1.0"?><score-partwise version="3.1">
    <part-list>
      <score-part id="P1"><part-name>Trompete</part-name></score-part>
      ${drumScorePart('P2')}
    </part-list>
    <part id="P1">
      <measure number="1">
        <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
        <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type><sound tempo="90"/></direction>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note>
      </measure>
      <measure number="2"><note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note></measure>
      <measure number="3"><note><rest/><duration>4</duration></note></measure>
    </part>
    <part id="P2">
      <measure number="1">
        <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign></clef></attributes>
        ${unpitched('P2-I36', 4)}
      </measure>
      <measure number="2">${unpitched('P2-I36', 4)}</measure>
      <measure number="3"><note><rest/><duration>4</duration></note></measure>
    </part>
  </score-partwise>`;

  it('stem melódico do servidor a 120 BPM e bateria do cliente atacam juntos no compasso 2', async () => {
    const melodic = verovioLikeSmf({
      division: 120,
      tempos: [120],
      notes: [
        { quarter: 0, pitch: 72 },
        { quarter: 4, pitch: 74 },
      ],
    });
    const assembled = await assembleStudyPlaybackMidi(
      {
        catalogXml,
        songId: '7',
        partIds: ['P1', 'P2'],
        tempoBpm: 90,
        fetchPartMidi: async (_songId, ids) => (ids.length === 1 && ids[0] === 'P1' ? melodic : null),
        resolvePartXml: async () => catalogXml,
      },
      null,
      TIMEMAP_90,
    );
    expect(assembled).not.toBeNull();
    const buffer = (assembled as { buffer: ArrayBuffer }).buffer;
    const trumpet = noteOnMs(buffer, 0);
    const drums = noteOnMs(buffer, 9);
    expect(trumpet).toHaveLength(2);
    expect(drums).toHaveLength(2);
    expect(Math.abs(trumpet[1] - 2667)).toBeLessThanOrEqual(2);
    expect(Math.abs(drums[1] - trumpet[1])).toBeLessThanOrEqual(2);
    expect(Math.abs(lastEventMs(buffer) - 8000)).toBeLessThanOrEqual(2);
  });
});
