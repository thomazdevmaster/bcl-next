import { apiAuthHeaders, fetchAuthedAsset } from '@/lib/api';
import { getApiUrl } from '@/config/environment';
import { fetchStudyTimemap } from '@/study/studyTimemapApi';
import { fetchPartMidi } from '@/study/songParts';
import type { MeasureTimemapEntry } from '@/study/studyTimemap';
import { assembleStudyPlaybackMidi } from '@/study/studyPlaybackMidi';
import { resolveStudyPlaybackTempoBpm } from '@/study/studyMidiFix';
import { partIdIsPercussive } from '@/study/studyUtils';
import {
  assemblePlaygroundChannelMidi,
  type PlaygroundMidiChannel,
} from './playgroundMidiChannels';

export type PlaygroundScoreForm = 'unrolled' | 'written';

export async function fetchPlaygroundScoreXml(
  songId: string,
  partIds: string[],
  form: PlaygroundScoreForm = 'unrolled',
): Promise<string> {
  const query = partIds.map((id) => encodeURIComponent(id)).join(',');
  const response = await fetch(
    `${getApiUrl()}/songs/${encodeURIComponent(songId)}/musicxml?parts=${query}&form=${form}`,
    { headers: apiAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error('musicxml_unavailable');
  }
  return response.text();
}

/** XML completo do catálogo (identificação de percussão e stems). */
export async function resolvePlaygroundCatalogXml(
  songId: string,
  optionsXml: string,
  fullScoreUrl?: string,
): Promise<string> {
  if (optionsXml.includes('<score')) return optionsXml;
  if (fullScoreUrl) {
    const response = await fetchAuthedAsset(fullScoreUrl);
    if (response.ok) {
      const xml = await response.text();
      if (xml.includes('<score')) return xml;
    }
  }
  const parts = await fetch(
    `${getApiUrl()}/songs/${encodeURIComponent(songId)}/musicxml`,
    { headers: apiAuthHeaders() },
  );
  if (parts.ok) {
    const xml = await parts.text();
    if (xml.includes('<score')) return xml;
  }
  return optionsXml;
}

function samePartSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export type PlaygroundPlaybackMidi = {
  buffer: ArrayBuffer;
  channels: PlaygroundMidiChannel[];
};

export async function buildPlaygroundPlaybackMidi(
  catalogXml: string,
  songId: string,
  partIds: string[],
  prefetchedMidi: ArrayBuffer,
  timemap: MeasureTimemapEntry[],
): Promise<PlaygroundPlaybackMidi> {
  const tempoBpm = resolveStudyPlaybackTempoBpm({
    xml: catalogXml,
    midi: prefetchedMidi,
  });

  const separated = await assemblePlaygroundChannelMidi({
    partIds,
    tempoBpm,
    isPercussive: (partId) => partIdIsPercussive(catalogXml, partId),
    loadStem: async (ids) => {
      const stem = await assembleStudyPlaybackMidi(
        {
          catalogXml,
          songId,
          partIds: ids,
          tempoBpm,
          fetchPartMidi: (sid, stemIds) => fetchPartMidi(sid, stemIds),
          resolvePartXml: (stemIds) => fetchPlaygroundScoreXml(songId, stemIds, 'unrolled'),
        },
        null,
        timemap,
      );
      return stem?.buffer ?? null;
    },
  });
  if (separated) return separated;

  const fetchStem = async (sid: string, ids: string[]): Promise<ArrayBuffer | null> => {
    if (sid === songId && samePartSet(ids, partIds)) {
      return prefetchedMidi;
    }
    return fetchPartMidi(sid, ids);
  };

  const assembled = await assembleStudyPlaybackMidi(
    {
      catalogXml,
      songId,
      partIds,
      tempoBpm,
      fetchPartMidi: fetchStem,
      resolvePartXml: (ids) => fetchPlaygroundScoreXml(songId, ids, 'unrolled'),
    },
    prefetchedMidi,
    timemap,
  );

  return { buffer: assembled?.buffer ?? prefetchedMidi, channels: [] };
}

export async function fetchPlaygroundMidiAndTimemap(
  songId: string,
  partIds: string[],
): Promise<{ midi: ArrayBuffer; timemap: MeasureTimemapEntry[] }> {
  const timemap = await fetchStudyTimemap(songId, partIds);
  if (!timemap) {
    throw new Error('timemap_unavailable');
  }
  const midi = await fetchPartMidi(songId, partIds);
  if (!midi || midi.byteLength === 0) {
    throw new Error('midi_unavailable');
  }
  return { midi, timemap };
}
