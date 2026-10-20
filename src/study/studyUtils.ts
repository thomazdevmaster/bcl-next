import {
  DEFAULT_INSTRUMENT_METADATA,
  type IInstrumentMetadata,
  resolveInstrumentMetadata,
} from './instrumentHelper';

export interface TempoInfo {
  bpm: number | null;
  timeSignature: string | null;
  beatsPerMeasure: number | null;
  beatUnit: number | null;
}

export interface InstrumentInfo {
  id: string;
  name: string;
  iconPath: string;
  title: string;
}

const parseXml = (xml: string): Document | null => {
  if (typeof window === 'undefined') return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) return null;
  return doc;
};

export const extractTempoInfoFromXml = (xml: string): TempoInfo | null => {
  const doc = parseXml(xml);
  if (!doc) return null;
  let bpm: number | null = null;
  let beatsPerMeasure: number | null = null;
  let beatUnit: number | null = null;

  const soundTempo = doc.querySelector('sound[tempo]')?.getAttribute('tempo');
  if (soundTempo) {
    const parsed = Number(soundTempo);
    if (!Number.isNaN(parsed) && parsed > 0) bpm = parsed;
  }
  if (bpm == null) {
    const perMinute = doc.querySelector('metronome per-minute')?.textContent?.trim();
    if (perMinute) {
      const parsed = Number(perMinute);
      if (!Number.isNaN(parsed) && parsed > 0) bpm = parsed;
    }
  }
  if (bpm == null) {
    const words = doc.querySelector('direction-type words');
    const tempoMatch = words?.textContent?.match(/(?:♩|=)\s*(\d{2,3})/);
    if (tempoMatch?.[1]) {
      const parsed = Number(tempoMatch[1]);
      if (!Number.isNaN(parsed) && parsed > 0) bpm = parsed;
    }
  }
  const timeEl = doc.querySelector('part measure attributes time') ?? doc.querySelector('attributes time');
  if (timeEl) {
    const beats = timeEl.querySelector('beats')?.textContent?.trim();
    const beatType = timeEl.querySelector('beat-type')?.textContent?.trim();
    if (beats) beatsPerMeasure = Number(beats);
    if (beatType) beatUnit = Number(beatType);
  }
  if (beatsPerMeasure == null || beatUnit == null) {
    const beats = doc.querySelector('time > beats')?.textContent?.trim();
    const beatType = doc.querySelector('time > beat-type')?.textContent?.trim();
    if (beats) beatsPerMeasure = Number(beats);
    if (beatType) beatUnit = Number(beatType);
  }

  const timeSignature =
    beatsPerMeasure != null && beatUnit != null ? `${beatsPerMeasure}/${beatUnit}` : null;
  return { bpm, timeSignature, beatsPerMeasure, beatUnit };
};

export const extractInstrumentsFromXml = (xml: string): InstrumentInfo[] => {
  const doc = parseXml(xml);
  if (!doc) return [];
  const scoreParts = Array.from(doc.querySelectorAll('part-list > score-part'));
  return scoreParts
    .map((part) => {
      const id = part.getAttribute('id') || '';
      const partName = part.querySelector('part-name')?.textContent?.trim() || '';
      const instrumentName =
        part.querySelector('score-instrument > instrument-name')?.textContent?.trim() || '';
      const partAbbrev = part.querySelector('part-abbreviation')?.textContent?.trim() || '';
      const instrumentAbbrev =
        part.querySelector('score-instrument > instrument-abbreviation')?.textContent?.trim() || '';
      const candidates = [partName, instrumentName, partAbbrev, instrumentAbbrev].filter(Boolean);
      let meta: IInstrumentMetadata | null = null;
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
      };
    })
    .filter((part) => part.id);
};

/**
 * Colchetes/chaves do MuseScore (`part-group`) são só layout na partitura impressa.
 * O Verovio (player) monta staffGrp/staffDef a partir deles; após filtrar naipes,
 * grupos vazios ou aninhados geram "Each staffGrp must contain at least one staffDef".
 */
function stripPartListGroups(partList: Element) {
  partList.querySelectorAll('part-group').forEach((el) => el.remove());
  partList.querySelectorAll('score-part > group').forEach((el) => el.remove());
}

function countScoreParts(doc: Document): number {
  return doc.querySelectorAll('part-list > score-part').length;
}

function countPartwiseParts(doc: Document): number {
  const root = doc.documentElement.tagName.toLowerCase();
  if (!root.includes('partwise')) return 0;
  return Array.from(doc.documentElement.children).filter(
    (node) => node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'part',
  ).length;
}

/** Corrige part-list após recorte (também útil em XML vindo da API). */
export function sanitizeMusicXmlPartList(xml: string): string {
  const doc = parseXml(xml);
  if (!doc) return xml;
  const partList = doc.querySelector('part-list');
  if (partList) stripPartListGroups(partList);
  return new XMLSerializer().serializeToString(doc);
}

export const filterXmlByPartIds = (xml: string, selectedIds: string[]): string => {
  if (selectedIds.length === 0) return xml;
  const doc = parseXml(xml);
  if (!doc) return xml;
  const selected = new Set(selectedIds);

  Array.from(doc.querySelectorAll('part-list > score-part')).forEach((part) => {
    const id = part.getAttribute('id') || '';
    if (id && !selected.has(id)) part.remove();
  });

  const partList = doc.querySelector('part-list');
  if (partList) stripPartListGroups(partList);

  const rootTag = doc.documentElement.tagName.toLowerCase();
  if (rootTag.includes('partwise')) {
    Array.from(doc.documentElement.children).forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.tagName.toLowerCase() !== 'part') return;
      const id = node.getAttribute('id') || '';
      if (id && !selected.has(id)) node.remove();
    });
  } else {
    Array.from(doc.querySelectorAll('part')).forEach((part) => {
      const id = part.getAttribute('id') || '';
      if (id && !selected.has(id)) part.remove();
    });
  }

  if (countScoreParts(doc) === 0) return xml;
  if (rootTag.includes('partwise') && countPartwiseParts(doc) === 0) return xml;

  return sanitizeMusicXmlPartList(new XMLSerializer().serializeToString(doc));
};
