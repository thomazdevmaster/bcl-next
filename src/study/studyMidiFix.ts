/** Utilitários para MIDI de estudo (percussão GM / canal 10). */

export type StudySmfEvent = { tick: number; status: number; d1: number; d2: number };

const TARGET_DIVISION = 480;
const GM_DRUM_NOTE_MIN = 35;
const GM_DRUM_NOTE_MAX = 81;
const DRUM_CHANNEL = 9;

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

function writeVariableLength(value: number): number[] {
  if (value <= 0) return [0];
  const bytes: number[] = [];
  let v = value;
  bytes.unshift(v & 0x7f);
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function isStandardMidiFile(midi: ArrayBuffer): boolean {
  if (midi.byteLength < 14) return false;
  return new DataView(midi).getUint32(0) === 0x4d546864;
}

function channelMessageDataLength(status: number): number {
  const hi = status & 0xf0;
  if (hi === 0xc0 || hi === 0xd0) return 1;
  if (hi >= 0x80 && hi <= 0xe0) return 2;
  return 0;
}

function appendSetTempoMeta(bytes: number[], tempoBpm: number): void {
  bytes.push(...writeVariableLength(0));
  const microPerQuarter = Math.round(60_000_000 / Math.max(30, tempoBpm));
  bytes.push(
    0xff,
    0x51,
    0x03,
    (microPerQuarter >> 16) & 0xff,
    (microPerQuarter >> 8) & 0xff,
    microPerQuarter & 0xff,
  );
}

/** Escreve evento de voz MIDI com contagem correta de bytes (PC/pitch bend = 1 data byte). */
function appendChannelVoiceEvent(bytes: number[], ev: StudySmfEvent, lastTick: number): number {
  const delta = Math.max(0, ev.tick - lastTick);
  bytes.push(...writeVariableLength(delta));
  bytes.push(ev.status);
  const dataLen = channelMessageDataLength(ev.status);
  bytes.push(ev.d1);
  if (dataLen === 2) bytes.push(ev.d2);
  return ev.tick;
}

function buildSmfFormat0Track(trackData: Uint8Array, division: number): ArrayBuffer {
  const header = new Uint8Array(14);
  header[0] = 0x4d;
  header[1] = 0x54;
  header[2] = 0x68;
  header[3] = 0x64;
  header[4] = 0;
  header[5] = 0;
  header[6] = 0;
  header[7] = 6;
  header[8] = 0;
  header[9] = 0;
  header[10] = 0;
  header[11] = 1;
  header[12] = (division >> 8) & 0xff;
  header[13] = division & 0xff;

  const trackChunk = new Uint8Array(8 + trackData.length);
  trackChunk[0] = 0x4d;
  trackChunk[1] = 0x54;
  trackChunk[2] = 0x72;
  trackChunk[3] = 0x6b;
  new DataView(trackChunk.buffer).setUint32(4, trackData.length);
  trackChunk.set(trackData, 8);

  const out = new Uint8Array(header.length + trackChunk.length);
  out.set(header, 0);
  out.set(trackChunk, header.length);
  return out.buffer;
}

function patchTrackForDrumChannel(track: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  let runningStatus = 0;

  while (i < track.length) {
    const delta = readVariableLength(track, i);
    out.push(...writeVariableLength(delta.value));
    i = delta.next;
    if (i >= track.length) break;

    let statusByteAt = -1;
    let status = track[i];
    if (status < 0x80) {
      status = runningStatus;
    } else {
      statusByteAt = i;
      i += 1;
    }

    if (status === 0xff) {
      out.push(0xff);
      if (i >= track.length) break;
      const metaType = track[i];
      out.push(metaType);
      i += 1;
      const len = readVariableLength(track, i);
      out.push(...writeVariableLength(len.value));
      i = len.next;
      for (let j = 0; j < len.value && i < track.length; j += 1, i += 1) {
        out.push(track[i]);
      }
      if (metaType === 0x2f) break;
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      out.push(status);
      if (i >= track.length) break;
      const len = readVariableLength(track, i);
      out.push(...writeVariableLength(len.value));
      i = len.next;
      for (let j = 0; j < len.value && i < track.length; j += 1, i += 1) {
        out.push(track[i]);
      }
      continue;
    }

    const dataLen = channelMessageDataLength(status);
    if (dataLen === 0) {
      for (let k = i - (statusByteAt >= 0 ? 1 : 0); k < track.length; k += 1) {
        out.push(track[k]);
      }
      break;
    }

    const hi = status & 0xf0;
    const ch = status & 0x0f;
    const d0 = track[i];
    const d1 = dataLen === 2 ? track[i + 1] : 0;

    if (
      hi === 0x90 &&
      dataLen === 2 &&
      d1 > 0 &&
      d0 >= GM_DRUM_NOTE_MIN &&
      d0 <= GM_DRUM_NOTE_MAX &&
      ch !== DRUM_CHANNEL
    ) {
      const patched = 0x90 | DRUM_CHANNEL;
      out.push(patched);
      out.push(d0);
      out.push(d1);
      runningStatus = patched;
    } else {
      if (statusByteAt >= 0) out.push(track[statusByteAt]);
      for (let j = 0; j < dataLen; j += 1) out.push(track[i + j]);
      if (status >= 0x80 && status <= 0xef) runningStatus = status;
    }

    i += dataLen;
  }

  return new Uint8Array(out);
}

function patchTrackAllNoteOnsToDrumChannel(track: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  let runningStatus = 0;

  while (i < track.length) {
    const delta = readVariableLength(track, i);
    out.push(...writeVariableLength(delta.value));
    i = delta.next;
    if (i >= track.length) break;

    let statusByteAt = -1;
    let status = track[i];
    if (status < 0x80) {
      status = runningStatus;
    } else {
      statusByteAt = i;
      i += 1;
    }

    if (status === 0xff) {
      out.push(0xff);
      if (i >= track.length) break;
      const metaType = track[i];
      out.push(metaType);
      i += 1;
      const len = readVariableLength(track, i);
      out.push(...writeVariableLength(len.value));
      i = len.next;
      for (let j = 0; j < len.value && i < track.length; j += 1, i += 1) {
        out.push(track[i]);
      }
      if (metaType === 0x2f) break;
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      out.push(status);
      if (i >= track.length) break;
      const len = readVariableLength(track, i);
      out.push(...writeVariableLength(len.value));
      i = len.next;
      for (let j = 0; j < len.value && i < track.length; j += 1, i += 1) {
        out.push(track[i]);
      }
      continue;
    }

    const dataLen = channelMessageDataLength(status);
    if (dataLen === 0) {
      for (let k = i - (statusByteAt >= 0 ? 1 : 0); k < track.length; k += 1) {
        out.push(track[k]);
      }
      break;
    }

    const hi = status & 0xf0;
    const ch = status & 0x0f;
    const d0 = track[i];
    const d1 = dataLen === 2 ? track[i + 1] : 0;

    if (hi === 0x90 && dataLen === 2 && d1 > 0 && ch !== DRUM_CHANNEL) {
      const patched = 0x90 | DRUM_CHANNEL;
      out.push(patched);
      out.push(d0);
      out.push(d1);
      runningStatus = patched;
    } else {
      if (statusByteAt >= 0) out.push(track[statusByteAt]);
      for (let j = 0; j < dataLen; j += 1) out.push(track[i + j]);
      if (status >= 0x80 && status <= 0xef) runningStatus = status;
    }

    i += dataLen;
  }

  return new Uint8Array(out);
}

function rewriteSmfTracks(midi: ArrayBuffer, patchTrack: (t: Uint8Array) => Uint8Array): ArrayBuffer {
  if (!isStandardMidiFile(midi)) return midi;
  const bytes = new Uint8Array(midi.slice(0));
  const view = new DataView(bytes.buffer);
  const format = view.getUint16(8);
  const tracks = view.getUint16(10);
  const division = view.getUint16(12);
  let offset = 14;
  const chunks: Uint8Array[] = [bytes.slice(0, 14)];

  for (let trackIndex = 0; trackIndex < tracks && offset + 8 <= bytes.length; trackIndex += 1) {
    if (
      bytes[offset] !== 0x4d ||
      bytes[offset + 1] !== 0x54 ||
      bytes[offset + 2] !== 0x72 ||
      bytes[offset + 3] !== 0x6b
    ) {
      break;
    }
    const trackLength = view.getUint32(offset + 4);
    const trackStart = offset + 8;
    const trackEnd = trackStart + trackLength;
    const patched = patchTrack(bytes.slice(trackStart, trackEnd));
    const chunk = new Uint8Array(8 + patched.length);
    chunk[0] = 0x4d;
    chunk[1] = 0x54;
    chunk[2] = 0x72;
    chunk[3] = 0x6b;
    new DataView(chunk.buffer).setUint32(4, patched.length);
    chunk.set(patched, 8);
    chunks.push(chunk);
    offset = trackEnd;
  }

  if (offset < bytes.length) chunks.push(bytes.slice(offset));

  const total = chunks.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let write = 0;
  for (const part of chunks) {
    merged.set(part, write);
    write += part.length;
  }
  const outView = new DataView(merged.buffer);
  outView.setUint16(8, format);
  outView.setUint16(10, tracks);
  outView.setUint16(12, division);
  return merged.buffer;
}

/** Conta Note On com velocity > 0; `channel` 0–15 ou omitido para todos. */
export function countMidiNoteOns(midi: ArrayBuffer, channel?: number): number {
  if (!isStandardMidiFile(midi)) return 0;
  const bytes = new Uint8Array(midi);
  const view = new DataView(midi);
  const tracks = view.getUint16(10);
  let offset = 14;
  let count = 0;

  for (let trackIndex = 0; trackIndex < tracks && offset + 8 <= bytes.length; trackIndex += 1) {
    if (
      bytes[offset] !== 0x4d ||
      bytes[offset + 1] !== 0x54 ||
      bytes[offset + 2] !== 0x72 ||
      bytes[offset + 3] !== 0x6b
    ) {
      break;
    }
    const trackLength = view.getUint32(offset + 4);
    const trackStart = offset + 8;
    const trackEnd = trackStart + trackLength;
    let i = trackStart;
    let runningStatus = 0;

    while (i < trackEnd) {
      const delta = readVariableLength(bytes, i);
      i = delta.next;
      if (i >= trackEnd) break;

      let status = bytes[i];
      if (status < 0x80) {
        status = runningStatus;
      } else {
        i += 1;
      }

      if (status === 0xff) {
        if (i >= trackEnd) break;
        const metaType = bytes[i];
        i += 1;
        const len = readVariableLength(bytes, i);
        i = len.next + len.value;
        if (metaType === 0x2f) break;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        const len = readVariableLength(bytes, i);
        i = len.next + len.value;
        continue;
      }

      const dataLen = channelMessageDataLength(status);
      if (dataLen === 0) break;

      const hi = status & 0xf0;
      const ch = status & 0x0f;
      if (hi === 0x90 && i + 1 < trackEnd) {
        const velocity = bytes[i + 1];
        if (velocity > 0 && (channel === undefined || ch === channel)) count += 1;
      }

      if (status >= 0x80 && status <= 0xef) runningStatus = status;
      i += dataLen;
    }

    offset = trackEnd;
  }

  return count;
}

export function midiHasAudibleNotes(midi: ArrayBuffer): boolean {
  return countMidiNoteOns(midi) > 0;
}

export function countDrumChannelNoteOns(midi: ArrayBuffer): number {
  return countMidiNoteOns(midi, DRUM_CHANNEL);
}

/** Histograma GM (canal 10) para depurar timbres de bateria MuseScore. */
export function drumChannelPitchHistogram(midi: ArrayBuffer): Record<number, number> {
  const hist: Record<number, number> = {};
  if (!isStandardMidiFile(midi)) return hist;
  const bytes = new Uint8Array(midi);
  const view = new DataView(midi);
  const tracks = view.getUint16(10);
  let offset = 14;
  for (let t = 0; t < tracks && offset + 8 <= bytes.length; t += 1) {
    const trackLen = view.getUint32(offset + 4);
    let i = offset + 8;
    const end = i + trackLen;
    let running = 0;
    while (i < end) {
      const delta = readVariableLength(bytes, i);
      i = delta.next;
      if (i >= end) break;
      let status = bytes[i];
      if (status < 0x80) status = running;
      else {
        i += 1;
        if (status >= 0x80 && status <= 0xef) running = status;
      }
      if (status === 0xff) {
        i += 1;
        const meta = bytes[i++];
        const len = readVariableLength(bytes, i);
        i = len.next + len.value;
        if (meta === 0x2f) break;
        continue;
      }
      const hi = status & 0xf0;
      const ch = status & 0x0f;
      const dlen = hi === 0xc0 || hi === 0xd0 ? 1 : hi >= 0x80 && hi <= 0xe0 ? 2 : 0;
      if (dlen === 2 && hi === 0x90 && ch === DRUM_CHANNEL && i + 1 < end && bytes[i + 1] > 0) {
        const pitch = bytes[i];
        hist[pitch] = (hist[pitch] ?? 0) + 1;
      }
      i += dlen;
    }
    offset += 8 + trackLen;
  }
  return hist;
}

/** Move notas na faixa GM de bateria para o canal 10 (SpessaSynth / GM). */
export function remapGeneralMidiDrumsToChannel10(midi: ArrayBuffer): ArrayBuffer {
  return rewriteSmfTracks(midi, patchTrackForDrumChannel);
}

/** Seleção só percussão: todo Note On vai para o canal 10 (stem Verovio costuma usar canal 1). */
export function remapAllNoteOnsToDrumChannel(midi: ArrayBuffer): ArrayBuffer {
  return rewriteSmfTracks(midi, patchTrackAllNoteOnsToDrumChannel);
}

export function prepareStudyMidiBuffer(
  midi: ArrayBuffer,
  options?: { percussionOnly?: boolean },
): ArrayBuffer {
  if (!isStandardMidiFile(midi)) return midi;
  const before = countMidiNoteOns(midi);
  if (before === 0) return midi;

  /** Stems melódicos (baixo, metais): nunca mover notas para canal 10 — vira “bateria” errada. */
  if (!options?.percussionOnly) {
    return midi.slice(0);
  }

  const variants: ArrayBuffer[] = [midi];
  variants.push(remapAllNoteOnsToDrumChannel(midi));
  variants.push(remapGeneralMidiDrumsToChannel10(midi));

  let best = midi;
  let bestScore = -1;
  for (const candidate of variants) {
    if (!midiHasAudibleNotes(candidate)) continue;
    const notes = countMidiNoteOns(candidate);
    if (notes < before * 0.85) continue;
    const drums = countDrumChannelNoteOns(candidate);
    const score = drums * 1000 + notes;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/** Preferir MIDI com notas no canal de bateria quando a seleção inclui percussão. */
function smfFromTimedEvents(events: StudySmfEvent[], tempoBpm: number, division: number): ArrayBuffer {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.status - b.status);
  const bytes: number[] = [];
  let lastTick = 0;
  appendSetTempoMeta(bytes, tempoBpm);
  for (const ev of sorted) {
    lastTick = appendChannelVoiceEvent(bytes, ev, lastTick);
  }
  bytes.push(...writeVariableLength(0));
  bytes.push(0xff, 0x2f, 0x00);
  return buildSmfFormat0Track(new Uint8Array(bytes), division);
}

function scaleEvents(events: StudySmfEvent[], fromDiv: number, toDiv: number): StudySmfEvent[] {
  if (fromDiv <= 0 || fromDiv === toDiv) return events;
  const ratio = toDiv / fromDiv;
  return events.map((e) => ({ ...e, tick: Math.round(e.tick * ratio) }));
}

/** Extrai eventos de canal (Note/CC etc.) com tick absoluto por track. */
export function extractTimedEventsFromSmf(midi: ArrayBuffer): {
  events: StudySmfEvent[];
  division: number;
} {
  const events: StudySmfEvent[] = [];
  if (!isStandardMidiFile(midi)) return { events, division: TARGET_DIVISION };

  const bytes = new Uint8Array(midi);
  const view = new DataView(midi);
  const division = view.getUint16(12) || TARGET_DIVISION;
  const tracks = view.getUint16(10);
  let offset = 14;

  for (let trackIndex = 0; trackIndex < tracks && offset + 8 <= bytes.length; trackIndex += 1) {
    if (
      bytes[offset] !== 0x4d ||
      bytes[offset + 1] !== 0x54 ||
      bytes[offset + 2] !== 0x72 ||
      bytes[offset + 3] !== 0x6b
    ) {
      break;
    }
    const trackLength = view.getUint32(offset + 4);
    const trackStart = offset + 8;
    const trackEnd = trackStart + trackLength;
    let i = trackStart;
    let runningStatus = 0;
    let tick = 0;

    while (i < trackEnd) {
      const delta = readVariableLength(bytes, i);
      tick += delta.value;
      i = delta.next;
      if (i >= trackEnd) break;

      let statusByteAt = -1;
      let status = bytes[i];
      if (status < 0x80) {
        status = runningStatus;
      } else {
        statusByteAt = i;
        i += 1;
      }

      if (status === 0xff) {
        if (i >= trackEnd) break;
        const metaType = bytes[i];
        i += 1;
        const len = readVariableLength(bytes, i);
        i = len.next + len.value;
        if (metaType === 0x2f) break;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        const len = readVariableLength(bytes, i);
        i = len.next + len.value;
        continue;
      }

      const dataLen = channelMessageDataLength(status);
      if (dataLen === 0) break;

      if (status >= 0x80 && status <= 0xef) {
        events.push({
          tick,
          status,
          d1: bytes[i],
          d2: dataLen === 2 ? bytes[i + 1] : 0,
        });
        runningStatus = statusByteAt >= 0 ? status : runningStatus;
      }

      i += dataLen;
    }

    offset = trackEnd;
  }

  return { events, division };
}

function isChannelVoiceMessage(status: number): boolean {
  const hi = status & 0xf0;
  return hi >= 0x80 && hi <= 0xe0;
}

function encodeTrackData(
  events: StudySmfEvent[],
  options: { tempoBpm: number; includeTempo: boolean },
): Uint8Array {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.status - b.status);
  const bytes: number[] = [];
  let lastTick = 0;

  if (options.includeTempo) {
    appendSetTempoMeta(bytes, options.tempoBpm);
  }

  for (const ev of sorted) {
    lastTick = appendChannelVoiceEvent(bytes, ev, lastTick);
  }
  bytes.push(...writeVariableLength(0));
  bytes.push(0xff, 0x2f, 0x00);
  return new Uint8Array(bytes);
}

/** SMF formato 0 (faixa única): compatível com SpessaSynth; bateria + melódico no mesmo track. */
export function mergeStudyMidiLayers(
  layers: { kind: 'percussion' | 'melodic'; buffer: ArrayBuffer }[],
  tempoBpm: number,
): ArrayBuffer | null {
  if (layers.length === 0) return null;
  if (layers.length === 1) return layers[0].buffer;

  const merged: StudySmfEvent[] = [];

  for (const layer of layers) {
    const { events, division } = extractTimedEventsFromSmf(layer.buffer);
    let slice = scaleEvents(events, division, TARGET_DIVISION);
    if (layer.kind === 'melodic') {
      slice = slice.filter((e) => {
        if (!isChannelVoiceMessage(e.status)) return false;
        return (e.status & 0x0f) !== DRUM_CHANNEL;
      });
    } else {
      slice = slice.filter((e) => isChannelVoiceMessage(e.status));
    }
    merged.push(...slice);
  }

  if (merged.length === 0) return null;
  return smfFromTimedEvents(merged, tempoBpm, TARGET_DIVISION);
}

/** SMF formato 0 / 1 faixa gerado no estudo já é válido; não regravar (preserva mapa GM). */
export function shouldReencodeSmfForPlayback(midi: ArrayBuffer): boolean {
  if (!isStandardMidiFile(midi) || midi.byteLength < 14) return false;
  const view = new DataView(midi);
  const format = view.getUint16(8);
  const tracks = view.getUint16(10);
  return format !== 0 || tracks !== 1;
}

/** Regrava SMF válido (formato 0) para o SpessaSynth — corrige stems com meta/tempo malformados. */
export function reencodeSmfForPlayback(midi: ArrayBuffer, tempoBpm: number): ArrayBuffer {
  if (!isStandardMidiFile(midi)) return midi;
  const { events, division } = extractTimedEventsFromSmf(midi);
  if (events.length === 0) return midi.slice(0);
  const scaled = scaleEvents(events, division, TARGET_DIVISION);
  return smfFromTimedEvents(scaled, tempoBpm, TARGET_DIVISION);
}

/** @deprecated Use mergeStudyMidiLayers */
export function mergeStudyMidiBuffers(
  buffers: ArrayBuffer[],
  tempoBpm: number,
): ArrayBuffer | null {
  const layers = buffers.map((buffer, index) => ({
    kind: (index === 0 ? 'percussion' : 'melodic') as 'percussion' | 'melodic',
    buffer,
  }));
  return mergeStudyMidiLayers(layers, tempoBpm);
}

export function pickBestMidiForPercussion(
  candidates: ArrayBuffer[],
  includesPercussion: boolean,
  percussionOnly = false,
): ArrayBuffer | null {
  const fixed = candidates
    .filter((buf) => isStandardMidiFile(buf))
    .map((buf) => prepareStudyMidiBuffer(buf, { percussionOnly }))
    .filter((buf) => midiHasAudibleNotes(buf));

  if (fixed.length === 0) return null;
  if (!includesPercussion) return fixed[0];

  const withDrums = fixed.filter((buf) => countDrumChannelNoteOns(buf) > 0);
  if (withDrums.length > 0) {
    return withDrums.sort((a, b) => countDrumChannelNoteOns(b) - countDrumChannelNoteOns(a))[0];
  }
  return fixed.sort((a, b) => countMidiNoteOns(b) - countMidiNoteOns(a))[0];
}
