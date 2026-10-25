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

/** Converte marcação de metrônomo MusicXML para BPM em semínima (como sound@tempo). */
function quarterBpmFromMetronome(metronome: Element): number | null {
  const perMinuteRaw = metronome.querySelector('per-minute')?.textContent?.trim();
  const perMinute = perMinuteRaw ? Number(perMinuteRaw) : Number.NaN;
  if (Number.isNaN(perMinute) || perMinute <= 0) return null;

  const unit = metronome.querySelector('beat-unit')?.textContent?.trim().toLowerCase() ?? 'quarter';
  const dotted = metronome.querySelector('beat-unit-dot') != null;
  let beatLengthInQuarters = 1;
  switch (unit) {
    case 'whole':
      beatLengthInQuarters = 4;
      break;
    case 'half':
      beatLengthInQuarters = 2;
      break;
    case 'quarter':
      beatLengthInQuarters = 1;
      break;
    case 'eighth':
      beatLengthInQuarters = 0.5;
      break;
    case '16th':
      beatLengthInQuarters = 0.25;
      break;
    case '32nd':
      beatLengthInQuarters = 0.125;
      break;
    default:
      beatLengthInQuarters = 1;
  }
  if (dotted) beatLengthInQuarters *= 1.5;
  return perMinute * beatLengthInQuarters;
}

function readInitialScoreTempoBpm(doc: Document): number | null {
  const firstMeasure = doc.querySelector('part measure');
  if (!firstMeasure) return null;

  for (const direction of Array.from(firstMeasure.querySelectorAll('direction'))) {
    const soundEl = direction.querySelector('sound[tempo]');
    const soundTempo = soundEl?.getAttribute('tempo');
    if (soundTempo) {
      const parsed = Number(soundTempo);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    const metronome = direction.querySelector('metronome');
    if (metronome) {
      const fromMetronome = quarterBpmFromMetronome(metronome);
      if (fromMetronome != null && fromMetronome > 0) return fromMetronome;
    }
  }
  return null;
}

export const extractTempoInfoFromXml = (xml: string): TempoInfo | null => {
  const doc = parseXml(xml);
  if (!doc) return null;
  let bpm: number | null = readInitialScoreTempoBpm(doc);
  let beatsPerMeasure: number | null = null;
  let beatUnit: number | null = null;

  if (bpm == null) {
    const soundTempo = doc.querySelector('sound[tempo]')?.getAttribute('tempo');
    if (soundTempo) {
      const parsed = Number(soundTempo);
      if (!Number.isNaN(parsed) && parsed > 0) bpm = parsed;
    }
  }
  if (bpm == null) {
    const metronome = doc.querySelector('metronome');
    if (metronome) {
      const fromMetronome = quarterBpmFromMetronome(metronome);
      if (fromMetronome != null && fromMetronome > 0) bpm = fromMetronome;
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

/** Maior andamento explícito na partitura (ex.: 284 além de um 120 inicial desatualizado). */
export function extractMarkedTempoBpmFromXml(xml: string): number | null {
  const doc = parseXml(xml);
  if (!doc) return null;
  let peak = 0;

  doc.querySelectorAll('sound[tempo]').forEach((node) => {
    const parsed = Number(node.getAttribute('tempo'));
    if (!Number.isNaN(parsed) && parsed > peak) peak = parsed;
  });

  doc.querySelectorAll('metronome').forEach((metronome) => {
    const quarterBpm = quarterBpmFromMetronome(metronome);
    if (quarterBpm != null && quarterBpm > peak) peak = quarterBpm;
  });

  return peak > 0 ? peak : null;
}

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

function partUsesUnpitchedNotation(doc: Document, partId: string): boolean {
  const partEl = doc.querySelector(`part[id="${partId}"]`);
  if (!partEl) return false;
  if (partEl.querySelector('unpitched')) return true;
  const clefSign = partEl.querySelector('clef > sign')?.textContent?.trim().toLowerCase();
  return clefSign === 'percussion';
}

function scorePartLooksPercussive(scorePart: Element): boolean {
  if (scorePart.querySelector('midi-unpitched')) return true;
  const text = [
    scorePart.querySelector('part-name')?.textContent,
    scorePart.querySelector('part-abbreviation')?.textContent,
    scorePart.querySelector('score-instrument > instrument-name')?.textContent,
    scorePart.querySelector('score-instrument > instrument-sound')?.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /bateria|percuss|drum|surdo|caixa|timpani|prato|pandeiro|triangulo|cymbal|snare|kit/.test(text);
}

/** Verovio/spessasynth exigem canal 10 (GM percussão) em naipes com notação unpitched. */
export function normalizePercussionMidiInXml(xml: string): string {
  const doc = parseXml(xml);
  if (!doc) return xml;

  const unpitchedPartIds = new Set<string>();
  doc.querySelectorAll('part-list > score-part').forEach((scorePart) => {
    const id = scorePart.getAttribute('id') || '';
    if (!id) return;
    if (partUsesUnpitchedNotation(doc, id) || scorePartLooksPercussive(scorePart)) {
      unpitchedPartIds.add(id);
    }
  });

  if (unpitchedPartIds.size === 0) return xml;

  unpitchedPartIds.forEach((partId) => {
    const scorePart = doc.querySelector(`part-list > score-part[id="${partId}"]`);
    if (!scorePart) return;
    scorePart.querySelectorAll('midi-instrument').forEach((midiInst) => {
      let channel = midiInst.querySelector('midi-channel');
      if (!channel) {
        channel = doc.createElement('midi-channel');
        midiInst.insertBefore(channel, midiInst.firstChild);
      }
      channel.textContent = '10';
      let program = midiInst.querySelector('midi-program');
      if (!program) {
        program = doc.createElement('midi-program');
        channel.insertAdjacentElement('afterend', program);
      }
      if (!program.textContent?.trim()) program.textContent = '1';
    });
  });

  return new XMLSerializer().serializeToString(doc);
}

/** Sanitiza grupos MuseScore e corrige MIDI de bateria/percussão antes do player. */
export function prepareMusicXmlForStudyPlayback(xml: string): string {
  return normalizePercussionMidiInXml(sanitizeMusicXmlPartList(xml));
}

export function partIdIsPercussive(xml: string, partId: string): boolean {
  const doc = parseXml(xml);
  if (!doc) return false;
  if (partUsesUnpitchedNotation(doc, partId)) return true;
  const scorePart = doc.querySelector(`part-list > score-part[id="${partId}"]`);
  if (!scorePart) return false;
  if (scorePart.querySelector('midi-unpitched')) return true;
  if (scorePartLooksPercussive(scorePart) && !partUsesPitchedNotation(doc, partId)) return true;
  return false;
}

function partUsesPitchedNotation(doc: Document, partId: string): boolean {
  const partEl = doc.querySelector(`part[id="${partId}"]`);
  if (!partEl) return false;
  return partEl.querySelector('note > pitch') != null;
}

export function selectionIncludesPercussion(xml: string, partIds: string[]): boolean {
  return partIds.some((id) => partIdIsPercussive(xml, id));
}

export function selectionIsPercussionOnly(xml: string, partIds: string[]): boolean {
  if (partIds.length === 0) return false;
  return partIds.every((id) => partIdIsPercussive(xml, id));
}

/**
 * API/recorte pode omitir midi-instrument; copia do XML completo (MuseScore) restaura midi-unpitched.
 */
/** Mescla naipes vindos da API no XML em memória sem perder o part-list completo (midi-unpitched). */
export function mergeMusicXmlFetchedParts(baseXml: string, fetchedXml: string): string {
  if (!baseXml.includes('<score')) return fetchedXml;
  if (!fetchedXml.includes('<score')) return baseXml;

  const baseDoc = parseXml(baseXml);
  const fetchDoc = parseXml(fetchedXml);
  if (!baseDoc || !fetchDoc) return baseXml;

  const basePartList = baseDoc.querySelector('part-list');
  const fetchPartList = fetchDoc.querySelector('part-list');
  if (basePartList && fetchPartList) {
    fetchPartList.querySelectorAll('score-part').forEach((fetchScorePart) => {
      const id = fetchScorePart.getAttribute('id') || '';
      if (!id) return;
      let target = basePartList.querySelector(`score-part[id="${id}"]`);
      if (!target) {
        target = baseDoc.createElement('score-part');
        target.setAttribute('id', id);
        basePartList.appendChild(target);
      }
      target.replaceWith(baseDoc.importNode(fetchScorePart, true));
    });
    stripPartListGroups(basePartList);
  }

  fetchDoc.querySelectorAll('part').forEach((fetchPart) => {
    const id = fetchPart.getAttribute('id') || '';
    if (!id) return;
    const existing = baseDoc.querySelector(`part[id="${id}"]`);
    if (existing) existing.replaceWith(baseDoc.importNode(fetchPart, true));
    else baseDoc.documentElement.appendChild(baseDoc.importNode(fetchPart, true));
  });

  return sanitizeMusicXmlPartList(new XMLSerializer().serializeToString(baseDoc));
}

export function enrichPercussionPartListFromCatalog(
  partXml: string,
  catalogXml: string,
  partIds: string[],
): string {
  if (!partXml.includes('<score') || !catalogXml.includes('<score') || partIds.length === 0) {
    return partXml;
  }
  const partDoc = parseXml(partXml);
  const catalogDoc = parseXml(catalogXml);
  if (!partDoc || !catalogDoc) return partXml;

  for (const partId of partIds) {
    const target = partDoc.querySelector(`part-list > score-part[id="${partId}"]`);
    const source = catalogDoc.querySelector(`part-list > score-part[id="${partId}"]`);
    if (!target || !source) continue;

    target.querySelectorAll('score-instrument').forEach((node) => node.remove());
    source.querySelectorAll('score-instrument').forEach((node) => {
      target.appendChild(partDoc.importNode(node, true));
    });

    target.querySelectorAll('midi-instrument').forEach((node) => node.remove());
    source.querySelectorAll('midi-instrument').forEach((node) => {
      target.appendChild(partDoc.importNode(node, true));
    });
  }

  return new XMLSerializer().serializeToString(partDoc);
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
