import { apiAuthHeaders, apiFetch } from '@/lib/api';
import { getApiUrl } from '@/config/environment';
import { studyProcessingGateEnabled, studyScoreReady } from '@/config/studyProcessing';
import type { Song } from '@/domains/songs/types';
import {
  DEFAULT_INSTRUMENT_METADATA,
  resolveInstrumentMetadata,
} from '@/study/instrumentHelper';
import type { InstrumentInfo } from '@/study/studyUtils';

export interface SongPartRef {
  partId: string;
  name: string;
  instrumentKey: string;
  position: number;
  midiStatus: 'pending' | 'rendering' | 'ready' | 'failed' | string;
}

export function selectionStorageKey(ownerId: string | null, songId: string): string {
  return ownerId ? `study_instruments_${ownerId}_${songId}` : `study_instruments_${songId}`;
}

export function partToInstrument(part: SongPartRef): InstrumentInfo {
  const meta = resolveInstrumentMetadata(part.name);
  return {
    id: part.partId,
    name: part.name,
    iconPath: meta?.iconPath || DEFAULT_INSTRUMENT_METADATA.iconPath,
    title: meta?.title || part.name,
  };
}

/** Naipes cujo instrumento é o mesmo que o músico toca. Sem correspondência, todos. */
export function defaultPartIds(parts: SongPartRef[], playedNames: string[]): string[] {
  const all = parts.map((part) => part.partId);
  const played = new Set(
    playedNames
      .map((name) => resolveInstrumentMetadata(name)?.name)
      .filter((name): name is string => Boolean(name)),
  );
  if (played.size === 0) return all;
  const matched = parts.filter((part) => {
    const meta = resolveInstrumentMetadata(part.name);
    return meta ? played.has(meta.name) : false;
  });
  return matched.length > 0 ? matched.map((part) => part.partId) : all;
}

export function readStoredSelection(
  ownerId: string | null,
  songId: string,
): { score: string[]; midi: string[] } {
  try {
    const raw = localStorage.getItem(selectionStorageKey(ownerId, songId));
    if (!raw) return { score: [], midi: [] };
    const parsed = JSON.parse(raw) as { score?: unknown; midi?: unknown };
    const score = Array.isArray(parsed.score)
      ? parsed.score.filter((item): item is string => typeof item === 'string')
      : [];
    const midi = Array.isArray(parsed.midi)
      ? parsed.midi.filter((item): item is string => typeof item === 'string')
      : [];
    return { score, midi };
  } catch {
    return { score: [], midi: [] };
  }
}

export async function fetchSongParts(songId: string): Promise<SongPartRef[]> {
  return apiFetch<SongPartRef[]>(`/songs/${encodeURIComponent(songId)}/parts`);
}

export async function fetchFilteredXml(songId: string, partIds: string[]): Promise<string> {
  const query = partIds.map((id) => encodeURIComponent(id)).join(',');
  const response = await fetch(
    `${getApiUrl()}/songs/${encodeURIComponent(songId)}/musicxml?parts=${query}`,
    { headers: apiAuthHeaders() },
  );
  if (!response.ok) {
    throw new Error('musicxml');
  }
  return response.text();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function waitForStudyScoreReady(
  songId: string,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<Song> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const intervalMs = options?.intervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const song = await apiFetch<Song>(`/songs/${encodeURIComponent(songId)}`);
    if (studyScoreReady(song)) return song;
    if (song.studyScoreStatus === 'failed') {
      throw new Error('study_score_failed');
    }
    await wait(intervalMs);
  }
  throw new Error('study_score_timeout');
}

export async function fetchPartMidi(songId: string, partIds: string[]): Promise<ArrayBuffer | null> {
  const query = partIds.map((id) => encodeURIComponent(id)).join(',');
  const url = `${getApiUrl()}/songs/${encodeURIComponent(songId)}/midi?parts=${query}`;
  const poll = studyProcessingGateEnabled();
  const deadline = poll ? Date.now() + 120_000 : Date.now();
  while (Date.now() <= deadline) {
    const response = await fetch(url, { headers: apiAuthHeaders() });
    if (response.status === 200) return response.arrayBuffer();
    if (!poll || response.status !== 202) return null;
    await wait(2_000);
  }
  return null;
}
