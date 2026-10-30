import { apiAuthHeaders } from '@/lib/api';
import { getApiUrl } from '@/config/environment';
import {
  normalizeTimemapTimestamps,
  type MeasureTimemapEntry,
} from './studyTimemap';

export type StudyTimemapPayload = {
  version: number;
  generator?: string;
  totalDurationMs: number;
  measures: MeasureTimemapEntry[];
};

const STUDY_API_MAX_ATTEMPTS = 3;
const STUDY_API_RETRY_DELAY_MS = [0, 450, 1400] as const;

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Evita TypeError não tratado quando a API cai ou o backend ainda está subindo. */
async function fetchStudyResource(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < STUDY_API_MAX_ATTEMPTS; attempt += 1) {
    const delay = STUDY_API_RETRY_DELAY_MS[attempt] ?? 1400;
    if (delay > 0) await sleep(delay);
    try {
      const response = await fetch(url, { headers: apiAuthHeaders() });
      if (response.ok) return response;
      if (response.status >= 500 && attempt < STUDY_API_MAX_ATTEMPTS - 1) continue;
      return response;
    } catch {
      if (attempt === STUDY_API_MAX_ATTEMPTS - 1) return null;
    }
  }
  return null;
}

export async function fetchUnrolledStudyXml(
  songId: string,
  partIds: string[],
): Promise<string | null> {
  if (!/^\d+$/.test(songId) || partIds.length === 0) return null;
  const query = partIds.map((id) => encodeURIComponent(id)).join(',');
  const response = await fetchStudyResource(
    `${getApiUrl()}/songs/${encodeURIComponent(songId)}/musicxml?parts=${query}&form=unrolled`,
  );
  if (!response?.ok) return null;
  try {
    const text = await response.text();
    return text.includes('<') ? text : null;
  } catch {
    return null;
  }
}

export async function fetchStudyTimemap(
  songId: string,
  partIds: string[],
): Promise<MeasureTimemapEntry[] | null> {
  if (!/^\d+$/.test(songId) || partIds.length === 0) return null;
  const query = partIds.map((id) => encodeURIComponent(id)).join(',');
  const response = await fetchStudyResource(
    `${getApiUrl()}/songs/${encodeURIComponent(songId)}/timemap?parts=${query}`,
  );
  if (!response?.ok) return null;
  let payload: StudyTimemapPayload;
  try {
    payload = (await response.json()) as StudyTimemapPayload;
  } catch {
    return null;
  }
  if (!Array.isArray(payload.measures) || payload.measures.length === 0) return null;
  return normalizeTimemapTimestamps(payload.measures);
}
