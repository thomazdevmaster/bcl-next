/**
 * Montagem do MIDI de estudo: stems melódicos do backend (Verovio), percussão do stem
 * ou fallback MuseScore no browser — nunca merge monolítico que perde canal 10.
 */
import {
  countDrumChannelNoteOns,
  countGmDrumChannelNoteOns,
  countMidiNoteOns,
  drumChannelUsesGmKitPitches,
  isStandardMidiFile,
  mergeStudyMidiLayers,
  midiHasAudibleNotes,
  prepareStudyMidiBuffer,
  normalizeStudySmfTempo,
  remapAllNoteOnsToDrumChannel,
  remapGeneralMidiDrumsToChannel10,
  ensureGmDrumKitOnChannel10,
  alignStudyPlaybackLayerToTimemap,
} from './studyMidiFix';
import { prepareMusicXmlForMidiPlayback } from './studyUnrollMusicXml';
import type { MeasureTimemapEntry } from './studyTimemap';
import {
  enrichPercussionPartListFromCatalog,
  filterXmlByPartIds,
  partIdIsPercussive,
  prepareMusicXmlForStudyPlayback,
  selectionIncludesPercussion,
  selectionIsPercussionOnly,
} from './studyUtils';
import { buildUnpitchedMidiFromXml } from './unpitchedMidiFromXml';

export type ComposeStudyPlaybackMidiInput = {
  catalogXml: string;
  songId: string;
  partIds: string[];
  tempoBpm: number;
  fetchPartMidi: (songId: string, partIds: string[]) => Promise<ArrayBuffer | null>;
  resolvePartXml: (partIds: string[]) => Promise<string>;
};

export type StudyPlaybackMidiLayer = {
  kind: 'percussion' | 'melodic';
  buffer: ArrayBuffer;
};

export type AssembledStudyPlaybackMidi = {
  buffer: ArrayBuffer;
  source: 'server-stems' | 'client-percussion' | 'server-merge' | 'client-compose';
  /** Camadas já ajustadas ao timemap do servidor — evita segundo fit no player. */
  timemapPreAligned: boolean;
};

function finalizePlaybackLayer(
  buffer: ArrayBuffer,
  tempoBpm: number,
  timemap: MeasureTimemapEntry[] | null | undefined,
): ArrayBuffer {
  if (timemap?.length) {
    return alignStudyPlaybackLayerToTimemap(buffer, timemap, tempoBpm);
  }
  return normalizeStudySmfTempo(buffer, tempoBpm);
}

async function buildPercussionXmlFromCatalog(
  catalogXml: string,
  percIds: string[],
): Promise<string> {
  if (!catalogXml.includes('<score') || percIds.length === 0) return '';
  const filtered = filterXmlByPartIds(catalogXml, percIds);
  return prepareMusicXmlForMidiPlayback(
    enrichPercussionPartListFromCatalog(filtered, catalogXml, percIds),
  );
}

async function loadPercussionLayerFromClient(
  input: ComposeStudyPlaybackMidiInput,
  percIds: string[],
  tempoBpm: number,
): Promise<ArrayBuffer | null> {
  const buildFromXml = (percXml: string): ArrayBuffer | null => {
    if (!percXml.includes('<score')) return null;
    const fromXml = buildUnpitchedMidiFromXml(percXml, percIds, tempoBpm);
    if (!fromXml || countGmDrumChannelNoteOns(fromXml) === 0) return null;
    return fromXml;
  };

  let percXml = prepareMusicXmlForStudyPlayback(await input.resolvePartXml(percIds));
  percXml = enrichPercussionPartListFromCatalog(percXml, input.catalogXml, percIds);
  percXml = await prepareMusicXmlForMidiPlayback(percXml);
  const fromUnrolled = buildFromXml(percXml);
  if (fromUnrolled) return fromUnrolled;

  const fromCatalog = await buildPercussionXmlFromCatalog(input.catalogXml, percIds);
  return buildFromXml(fromCatalog);
}

function samePartSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join('|');
  const sb = [...b].sort().join('|');
  return sa === sb;
}

async function fetchStemMidi(
  input: ComposeStudyPlaybackMidiInput,
  stemPartIds: string[],
  prefetchedAll: ArrayBuffer | null,
): Promise<ArrayBuffer | null> {
  if (stemPartIds.length === 0) return null;
  if (prefetchedAll && samePartSet(stemPartIds, input.partIds)) {
    return prefetchedAll;
  }
  return input.fetchPartMidi(input.songId, stemPartIds);
}

async function loadPercussionStem(
  input: ComposeStudyPlaybackMidiInput,
  percIds: string[],
  prefetchedAll: ArrayBuffer | null,
  tempoBpm: number,
): Promise<{ buffer: ArrayBuffer | null; fromClient: boolean }> {
  const serverPerc = await fetchStemMidi(input, percIds, prefetchedAll);
  if (serverPerc && isStandardMidiFile(serverPerc)) {
    const candidates = [
      serverPerc,
      remapGeneralMidiDrumsToChannel10(serverPerc),
      remapAllNoteOnsToDrumChannel(serverPerc),
    ];
    for (const raw of candidates) {
      const prepared = ensureGmDrumKitOnChannel10(
        prepareStudyMidiBuffer(raw, { percussionOnly: true }),
      );
      if (
        midiHasAudibleNotes(prepared) &&
        drumChannelUsesGmKitPitches(prepared)
      ) {
        return { buffer: prepared, fromClient: false };
      }
    }
  }
  const client = await loadPercussionLayerFromClient(input, percIds, tempoBpm);
  if (client) {
    const prepared = ensureGmDrumKitOnChannel10(client);
    if (drumChannelUsesGmKitPitches(prepared)) {
      return { buffer: prepared, fromClient: true };
    }
  }
  return { buffer: null, fromClient: false };
}

/**
 * Monta o buffer final: melódicos sempre do merge de stems do servidor; percussão stem
 * a stem (servidor → fallback XML no cliente), depois mergeStudyMidiLayers (mesmo relógio).
 */
export async function assembleStudyPlaybackMidi(
  input: ComposeStudyPlaybackMidiInput,
  prefetchedAll: ArrayBuffer | null,
  timemap?: MeasureTimemapEntry[] | null,
): Promise<AssembledStudyPlaybackMidi | null> {
  const { catalogXml, partIds, tempoBpm } = input;
  if (partIds.length === 0 || !catalogXml.includes('<score')) return null;

  const percIds = partIds.filter((id) => partIdIsPercussive(catalogXml, id));
  const melodicIds = partIds.filter((id) => !percIds.includes(id));
  const playbackTempoBpm = tempoBpm;
  const timemapPreAligned = Boolean(timemap?.length);

  if (percIds.length === 0) {
    const melRaw = await fetchStemMidi(input, melodicIds, prefetchedAll);
    if (!melRaw || !isStandardMidiFile(melRaw)) return null;
    const prepared = prepareStudyMidiBuffer(melRaw, { percussionOnly: false });
    if (!midiHasAudibleNotes(prepared)) return null;
    return {
      buffer: finalizePlaybackLayer(prepared, playbackTempoBpm, timemap),
      source: 'server-merge',
      timemapPreAligned,
    };
  }

  let usedClientPerc = false;
  const { buffer: percBuf, fromClient } = await loadPercussionStem(
    input,
    percIds,
    prefetchedAll,
    playbackTempoBpm,
  );
  if (fromClient) usedClientPerc = true;

  let melBuf: ArrayBuffer | null = null;
  if (melodicIds.length > 0) {
    const melRaw = await fetchStemMidi(input, melodicIds, prefetchedAll);
    if (melRaw && isStandardMidiFile(melRaw)) {
      const prepared = prepareStudyMidiBuffer(melRaw, { percussionOnly: false });
      if (midiHasAudibleNotes(prepared) && countMidiNoteOns(prepared) > 0) {
        melBuf = prepared;
      }
    }
  }

  if (percBuf && melBuf) {
    const melLayer = finalizePlaybackLayer(melBuf, playbackTempoBpm, timemap);
    const percLayer = finalizePlaybackLayer(percBuf, playbackTempoBpm, timemap);
    const merged = mergeStudyMidiLayers(
      [
        { kind: 'melodic', buffer: melLayer },
        { kind: 'percussion', buffer: percLayer },
      ],
      playbackTempoBpm,
      { skipNormalize: timemapPreAligned },
    );
    if (!merged) return null;
    return {
      buffer: merged,
      source: usedClientPerc ? 'client-percussion' : 'server-stems',
      timemapPreAligned,
    };
  }

  if (percBuf && melodicIds.length === 0) {
    return {
      buffer: finalizePlaybackLayer(percBuf, playbackTempoBpm, timemap),
      source: usedClientPerc ? 'client-percussion' : 'server-stems',
      timemapPreAligned,
    };
  }

  if (melBuf && !percBuf) {
    return {
      buffer: finalizePlaybackLayer(melBuf, playbackTempoBpm, timemap),
      source: 'server-merge',
      timemapPreAligned,
    };
  }

  return composeStudyPlaybackMidiLegacy(input);
}

/** Fallback: composição antiga (fetch melódico + percussão XML). */
async function composeStudyPlaybackMidiLegacy(
  input: ComposeStudyPlaybackMidiInput,
): Promise<AssembledStudyPlaybackMidi | null> {
  const composed = await composeStudyPlaybackMidi(input);
  if (!composed) return null;
  return { buffer: composed, source: 'client-compose', timemapPreAligned: false };
}

/** @deprecated Use assembleStudyPlaybackMidi */
export async function composeStudyPlaybackMidi(
  input: ComposeStudyPlaybackMidiInput,
): Promise<ArrayBuffer | null> {
  const { catalogXml, partIds, tempoBpm } = input;
  if (partIds.length === 0 || !catalogXml.includes('<score')) return null;

  const percIds = partIds.filter((id) => partIdIsPercussive(catalogXml, id));
  const melodicIds = partIds.filter((id) => !percIds.includes(id));

  const layers: StudyPlaybackMidiLayer[] = [];
  const playbackTempoBpm = tempoBpm;

  if (melodicIds.length > 0) {
    const server = await input.fetchPartMidi(input.songId, melodicIds);
    if (server) {
      layers.push({
        kind: 'melodic',
        buffer: prepareStudyMidiBuffer(server, { percussionOnly: false }),
      });
    }
  }

  if (percIds.length > 0) {
    const percussion = await loadPercussionLayerFromClient(input, percIds, playbackTempoBpm);
    if (percussion) layers.push({ kind: 'percussion', buffer: percussion });
  }

  if (layers.length === 0) return null;
  if (layers.length === 1) {
    return normalizeStudySmfTempo(layers[0].buffer, playbackTempoBpm);
  }

  return mergeStudyMidiLayers(layers, playbackTempoBpm);
}

/** @deprecated Prefer assembleStudyPlaybackMidi */
export function serverMergedMidiUsable(
  serverMidi: ArrayBuffer | null,
  catalogXml: string,
  partIds: string[],
): boolean {
  if (!serverMidi || !isStandardMidiFile(serverMidi)) return false;
  if (!catalogXml.includes('<score') || partIds.length === 0) return false;
  if (selectionIncludesPercussion(catalogXml, partIds)) return false;
  const prepared = prepareStudyMidiBuffer(serverMidi, {
    percussionOnly: selectionIsPercussionOnly(catalogXml, partIds),
  });
  return midiHasAudibleNotes(prepared) && countMidiNoteOns(prepared) > 0;
}
