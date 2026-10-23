import { extractTempoInfoFromXml } from './studyUtils';
import { countDrumChannelNoteOns, countMidiNoteOns, midiHasAudibleNotes } from './studyMidiFix';
import {
  gmFromMuseScoreDisplay,
  gmFromMuseScoreInstrumentName,
  resolveMuseScoreDrumPlaybackPitch,
} from './museScoreDrumGm';

const DRUM_CHANNEL = 9;

type TimedEvent = { tick: number; status: number; d1: number; d2: number };

function writeVarLen(value: number): number[] {
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

function parseXml(xml: string): Document | null {
  if (typeof window === 'undefined') return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return null;
  return doc;
}

function buildInstrumentMidiMap(doc: Document, partId: string): Map<string, number> {
  const map = new Map<string, number>();
  const scorePart = doc.querySelector(`part-list > score-part[id="${partId}"]`);
  if (!scorePart) return map;

  scorePart.querySelectorAll('midi-instrument').forEach((midiInst) => {
    const id = midiInst.getAttribute('id');
    if (!id) return;
    const unpitchedRaw = midiInst.querySelector('midi-unpitched')?.textContent?.trim();
    const unpitchedNum = unpitchedRaw ? Number(unpitchedRaw) : undefined;
    const scoreInst = scorePart.querySelector(`score-instrument[id="${id}"]`);
    const name = scoreInst?.querySelector('instrument-name')?.textContent ?? null;
    const note = resolveMuseScoreDrumPlaybackPitch(
      name,
      unpitchedNum != null && !Number.isNaN(unpitchedNum) ? unpitchedNum : undefined,
    );
    if (note != null) map.set(id, note);
  });

  scorePart.querySelectorAll('score-instrument').forEach((scoreInst) => {
    const id = scoreInst.getAttribute('id');
    if (!id || map.has(id)) return;
    const note = resolveMuseScoreDrumPlaybackPitch(
      scoreInst.querySelector('instrument-name')?.textContent ?? null,
      undefined,
    );
    if (note != null) map.set(id, note);
  });

  return map;
}

function resolveNoteMidiPitch(
  noteEl: Element,
  instrumentMap: Map<string, number>,
  scorePart: Element | null,
): number | undefined {
  const instrumentRef = noteEl.querySelector('instrument')?.getAttribute('id');
  if (instrumentRef && instrumentMap.has(instrumentRef)) {
    return instrumentMap.get(instrumentRef);
  }

  if (instrumentRef && scorePart) {
    const scoreInst = scorePart.querySelector(`score-instrument[id="${instrumentRef}"]`);
    const name = scoreInst?.querySelector('instrument-name')?.textContent ?? null;
    const midiInst = scorePart.querySelector(`midi-instrument[id="${instrumentRef}"]`);
    const unpitchedRaw = midiInst?.querySelector('midi-unpitched')?.textContent?.trim();
    const unpitchedNum = unpitchedRaw ? Number(unpitchedRaw) : undefined;
    const fromMs = resolveMuseScoreDrumPlaybackPitch(
      name,
      unpitchedNum != null && !Number.isNaN(unpitchedNum) ? unpitchedNum : undefined,
    );
    if (fromMs != null) return fromMs;
    const fromName = gmFromMuseScoreInstrumentName(name);
    if (fromName != null) return fromName;
  }

  const unpitched = noteEl.querySelector('unpitched');
  if (!unpitched) return undefined;
  return gmFromMuseScoreDisplay(
    unpitched.querySelector('display-step')?.textContent?.trim(),
    unpitched.querySelector('display-octave')?.textContent?.trim(),
    noteEl.querySelector('notehead')?.textContent?.trim(),
  );
}

function dynamicsToVelocity(raw: string | null | undefined): number {
  if (!raw) return 96;
  const n = Number(raw);
  if (Number.isNaN(n)) return 96;
  if (n <= 127) return Math.max(1, Math.round(n));
  return Math.max(1, Math.min(127, Math.round((n / 127) * 127)));
}

function collectPartEvents(
  doc: Document,
  partId: string,
  instrumentMap: Map<string, number>,
): { events: TimedEvent[]; divisions: number } {
  const part = doc.querySelector(`part[id="${partId}"]`);
  const scorePart = doc.querySelector(`part-list > score-part[id="${partId}"]`);
  if (!part) return { events: [], divisions: 480 };

  const events: TimedEvent[] = [];
  let tick = 0;
  let divisions = 480;
  let pendingVelocity = 96;

  const measures = Array.from(part.children).filter(
    (node) => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'measure',
  );

  for (const measure of measures) {
    const measureStart = tick;
    for (const node of Array.from(measure.children)) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'attributes') {
        const div = node.querySelector('divisions')?.textContent?.trim();
        if (div) {
          const parsed = Number(div);
          if (!Number.isNaN(parsed) && parsed > 0) divisions = parsed;
        }
        continue;
      }
      if (tag === 'direction') {
        const dyn = node.querySelector('sound[dynamics]')?.getAttribute('dynamics');
        pendingVelocity = dynamicsToVelocity(dyn);
        continue;
      }
      if (tag === 'backup') {
        const dur = Number(node.querySelector('duration')?.textContent?.trim() ?? '0');
        if (!Number.isNaN(dur)) tick = Math.max(measureStart, tick - dur);
        continue;
      }
      if (tag === 'forward') {
        const dur = Number(node.querySelector('duration')?.textContent?.trim() ?? '0');
        if (!Number.isNaN(dur)) tick += dur;
        continue;
      }
      if (tag !== 'note') continue;

      const noteEl = node;
      if (noteEl.querySelector('rest')) {
        const dur = Number(noteEl.querySelector('duration')?.textContent?.trim() ?? '0');
        if (!Number.isNaN(dur)) tick += dur;
        continue;
      }
      if (!noteEl.querySelector('unpitched')) {
        const dur = Number(noteEl.querySelector('duration')?.textContent?.trim() ?? '0');
        if (!Number.isNaN(dur)) tick += dur;
        continue;
      }

      const midiNote = resolveNoteMidiPitch(noteEl, instrumentMap, scorePart);
      if (midiNote == null) {
        const dur = Number(noteEl.querySelector('duration')?.textContent?.trim() ?? '0');
        if (!Number.isNaN(dur)) tick += dur;
        continue;
      }

      const dur = Number(noteEl.querySelector('duration')?.textContent?.trim() ?? '0');
      if (Number.isNaN(dur) || dur <= 0) continue;

      const isChord = noteEl.querySelector('chord') != null;
      const start = tick;
      const vel = pendingVelocity;
      events.push({ tick: start, status: 0x90 | DRUM_CHANNEL, d1: midiNote, d2: vel });
      events.push({ tick: start + dur, status: 0x80 | DRUM_CHANNEL, d1: midiNote, d2: 0 });
      if (!isChord) tick += dur;
    }
  }

  return { events, divisions };
}

function encodeTrack(events: TimedEvent[], tempoBpm: number): Uint8Array {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.status - b.status);
  const bytes: number[] = [];
  let lastTick = 0;

  bytes.push(...writeVarLen(0));
  const microPerQuarter = Math.round(60_000_000 / Math.max(30, tempoBpm));
  bytes.push(0xff, 0x51, 0x03, (microPerQuarter >> 16) & 0xff, (microPerQuarter >> 8) & 0xff, microPerQuarter & 0xff);

  for (const ev of sorted) {
    const delta = Math.max(0, ev.tick - lastTick);
    bytes.push(...writeVarLen(delta));
    bytes.push(ev.status, ev.d1);
    const hi = ev.status & 0xf0;
    if (hi !== 0xc0 && hi !== 0xd0) bytes.push(ev.d2);
    lastTick = ev.tick;
  }

  bytes.push(...writeVarLen(0));
  bytes.push(0xff, 0x2f, 0x00);
  return new Uint8Array(bytes);
}

function buildSmf(trackData: Uint8Array, division = 480): ArrayBuffer {
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

/** Gera MIDI SMF a partir de notação unpitched (bateria/percussão MuseScore). */
export function buildUnpitchedMidiFromXml(
  xml: string,
  partIds: string[],
  tempoOverrideBpm?: number,
): ArrayBuffer | null {
  const doc = parseXml(xml);
  if (!doc || partIds.length === 0) return null;

  const tempo =
    tempoOverrideBpm != null && tempoOverrideBpm > 0
      ? tempoOverrideBpm
      : extractTempoInfoFromXml(xml)?.bpm ?? 120;
  const allEvents: TimedEvent[] = [];
  let smfDivision = 480;

  for (const partId of partIds) {
    const map = buildInstrumentMidiMap(doc, partId);
    const collected = collectPartEvents(doc, partId, map);
    if (collected.events.length === 0) continue;
    smfDivision = collected.divisions;
    allEvents.push(...collected.events);
  }

  if (allEvents.length === 0) return null;

  const track = encodeTrack(allEvents, tempo);
  const midi = buildSmf(track, smfDivision);
  if (!midiHasAudibleNotes(midi) || countDrumChannelNoteOns(midi) === 0) return null;
  return midi;
}
