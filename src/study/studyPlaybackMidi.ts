/**
 * Composição única do MIDI de estudo: percussão via MusicXML (MuseScore), melódicos via API.
 */
import {
  countDrumChannelNoteOns,
  mergeStudyMidiLayers,
  prepareStudyMidiBuffer,
} from './studyMidiFix';
import {
  enrichPercussionPartListFromCatalog,
  filterXmlByPartIds,
  partIdIsPercussive,
  prepareMusicXmlForStudyPlayback,
} from './studyUtils';
import { buildUnpitchedMidiFromXml } from './unpitchedMidiFromXml';

export type ComposeStudyPlaybackMidiInput = {
  /** Partitura completa (catálogo MuseScore com midi-unpitched). */
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

function buildPercussionXmlFromCatalog(catalogXml: string, percIds: string[]): string {
  if (!catalogXml.includes('<score') || percIds.length === 0) return '';
  const filtered = filterXmlByPartIds(catalogXml, percIds);
  return prepareMusicXmlForStudyPlayback(
    enrichPercussionPartListFromCatalog(filtered, catalogXml, percIds),
  );
}

async function loadPercussionLayer(
  input: ComposeStudyPlaybackMidiInput,
  percIds: string[],
): Promise<ArrayBuffer | null> {
  let percXml = buildPercussionXmlFromCatalog(input.catalogXml, percIds);

  if (!percXml.includes('<score')) {
    percXml = prepareMusicXmlForStudyPlayback(await input.resolvePartXml(percIds));
    percXml = enrichPercussionPartListFromCatalog(percXml, input.catalogXml, percIds);
    percXml = prepareMusicXmlForStudyPlayback(percXml);
  }

  if (percXml.includes('<score')) {
    const fromXml = buildUnpitchedMidiFromXml(percXml, percIds);
    if (fromXml && countDrumChannelNoteOns(fromXml) > 0) return fromXml;
  }

  return null;
}

async function loadMelodicLayer(
  input: ComposeStudyPlaybackMidiInput,
  melodicIds: string[],
): Promise<ArrayBuffer | null> {
  if (melodicIds.length === 0) return null;
  const server = await input.fetchPartMidi(input.songId, melodicIds);
  if (!server) return null;
  return prepareStudyMidiBuffer(server, { percussionOnly: false });
}

/** Monta o buffer final para o sequenciador (SpessaSynth). */
export async function composeStudyPlaybackMidi(
  input: ComposeStudyPlaybackMidiInput,
): Promise<ArrayBuffer | null> {
  const { catalogXml, partIds, tempoBpm } = input;
  if (partIds.length === 0 || !catalogXml.includes('<score')) return null;

  const percIds = partIds.filter((id) => partIdIsPercussive(catalogXml, id));
  const melodicIds = partIds.filter((id) => !percIds.includes(id));

  const layers: StudyPlaybackMidiLayer[] = [];

  if (percIds.length > 0) {
    const percussion = await loadPercussionLayer(input, percIds);
    if (percussion) layers.push({ kind: 'percussion', buffer: percussion });
  }

  if (melodicIds.length > 0) {
    const melodic = await loadMelodicLayer(input, melodicIds);
    if (melodic) layers.push({ kind: 'melodic', buffer: melodic });
  }

  if (layers.length === 0) return null;
  if (layers.length === 1) return layers[0].buffer;

  return mergeStudyMidiLayers(layers, tempoBpm);
}
