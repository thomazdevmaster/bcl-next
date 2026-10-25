import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { metadataFromMusicXml } from '../src/domains/songs/musicXmlMetadata.ts';
import {
  DEFAULT_INSTRUMENT_METADATA,
  resolveInstrumentMetadata,
} from '../src/study/instrumentHelper.ts';

const files = [
  'Africa.musicxml',
  'Vento Ventania.musicxml',
  'caravan_arranjo.musicxml.musicxml',
  'Rock You Like A Hurricane.musicxml',
];

function quarterBpmFromMetronomeBlock(block: string): number | null {
  const perMinute = Number(block.match(/<per-minute>([^<]+)/)?.[1]?.trim());
  if (Number.isNaN(perMinute) || perMinute <= 0) return null;
  const unit = block.match(/<beat-unit>([^<]+)/)?.[1]?.trim().toLowerCase() ?? 'quarter';
  const dotted = /<beat-unit-dot/.test(block);
  let beatLengthInQuarters = 1;
  switch (unit) {
    case 'whole':
      beatLengthInQuarters = 4;
      break;
    case 'half':
      beatLengthInQuarters = 2;
      break;
    case 'eighth':
      beatLengthInQuarters = 0.5;
      break;
    case '16th':
      beatLengthInQuarters = 0.25;
      break;
    default:
      beatLengthInQuarters = 1;
  }
  if (dotted) beatLengthInQuarters *= 1.5;
  return perMinute * beatLengthInQuarters;
}

/** Espelha `extractTempoInfoFromXml` (primeiro compasso + fallbacks). */
function extractTempoInfoFromXml(xml: string) {
  const firstMeasure = xml.match(/<part id="[^"]+"[\s\S]*?<measure[\s\S]*?<\/measure>/)?.[0] ?? '';
  let bpm: number | null = null;
  const soundInMeasure = firstMeasure.match(/<sound tempo="([^"]+)"/);
  if (soundInMeasure) {
    const parsed = Number(soundInMeasure[1]);
    if (!Number.isNaN(parsed) && parsed > 0) bpm = parsed;
  }
  if (bpm == null) {
    const metronome = firstMeasure.match(/<metronome[\s\S]*?<\/metronome>/)?.[0];
    if (metronome) bpm = quarterBpmFromMetronomeBlock(metronome);
  }
  if (bpm == null) {
    const sound = xml.match(/<sound tempo="([^"]+)"/);
    if (sound) {
      const parsed = Number(sound[1]);
      if (!Number.isNaN(parsed) && parsed > 0) bpm = parsed;
    }
  }
  if (bpm == null) {
    const metronome = xml.match(/<metronome[\s\S]*?<\/metronome>/)?.[0];
    if (metronome) bpm = quarterBpmFromMetronomeBlock(metronome);
  }

  const attrs = firstMeasure.match(/<attributes>([\s\S]*?)<\/attributes>/)?.[1] ?? '';
  const beats = attrs.match(/<beats>(\d+)<\/beats>/)?.[1];
  const beatType = attrs.match(/<beat-type>(\d+)<\/beat-type>/)?.[1];
  const beatsPerMeasure = beats ? Number(beats) : null;
  const beatUnit = beatType ? Number(beatType) : null;
  const timeSignature =
    beatsPerMeasure != null && beatUnit != null ? `${beatsPerMeasure}/${beatUnit}` : null;
  return { bpm, timeSignature, beatsPerMeasure, beatUnit };
}

/** Espelha `extractMarkedTempoBpmFromXml`. */
function extractMarkedTempoBpmFromXml(xml: string): number | null {
  let peak = 0;
  for (const m of xml.matchAll(/<sound tempo="([^"]+)"/g)) {
    const parsed = Number(m[1]);
    if (!Number.isNaN(parsed) && parsed > peak) peak = parsed;
  }
  for (const block of xml.matchAll(/<metronome[\s\S]*?<\/metronome>/g)) {
    const quarterBpm = quarterBpmFromMetronomeBlock(block[0]);
    if (quarterBpm != null && quarterBpm > peak) peak = quarterBpm;
  }
  return peak > 0 ? peak : null;
}

/** Espelha `extractInstrumentsFromXml`. */
function extractInstrumentsFromXml(xml: string) {
  const partList = xml.match(/<part-list>([\s\S]*?)<\/part-list>/i)?.[1] ?? '';
  const parts = [
    ...partList.matchAll(/<score-part id="([^"]+)"[\s\S]*?(?=<score-part id=|<\/part-list>)/g),
  ];
  const lastOpen = partList.lastIndexOf('<score-part id="');
  if (lastOpen >= 0) {
    const tail = partList.slice(lastOpen);
    const lastId = tail.match(/^<score-part id="([^"]+)"/)?.[1];
    if (lastId && !parts.some((p) => p[1] === lastId)) {
      parts.push([tail, lastId] as RegExpMatchArray);
    }
  }
  return parts
    .map((match) => {
      const id = match[1];
      const chunk = match[0];
      const partName = chunk.match(/<part-name>([^<]+)/)?.[1]?.trim() ?? '';
      const instrumentName =
        chunk.match(/<score-instrument[\s\S]*?<instrument-name>([^<]+)/)?.[1]?.trim() ?? '';
      const partAbbrev = chunk.match(/<part-abbreviation>([^<]+)/)?.[1]?.trim() ?? '';
      const candidates = [partName, instrumentName, partAbbrev].filter(Boolean);
      let meta = null;
      for (const candidate of candidates) {
        meta = resolveInstrumentMetadata(candidate);
        if (meta) break;
      }
      const fallbackName = candidates[0] || DEFAULT_INSTRUMENT_METADATA.name;
      return {
        id,
        name: meta?.name || fallbackName,
        iconPath: meta?.iconPath || DEFAULT_INSTRUMENT_METADATA.iconPath,
        title: meta?.title || fallbackName,
        partNameRaw: partName,
      };
    })
    .filter((p) => p.id);
}

for (const f of files) {
  const xml = readFileSync(join(process.cwd(), f), 'utf8');
  console.log(
    JSON.stringify(
      {
        file: f,
        metadata: metadataFromMusicXml(xml),
        tempo: extractTempoInfoFromXml(xml),
        peakTempoMarked: extractMarkedTempoBpmFromXml(xml),
        instrumentCount: extractInstrumentsFromXml(xml).length,
        instruments: extractInstrumentsFromXml(xml),
      },
      null,
      2,
    ),
  );
  console.log('\n---\n');
}
