import { metadataFromMusicXml } from '@/domains/songs/musicXmlMetadata';
import { extractTempoInfoFromXml } from '@/study/studyUtils';

export type StudySongMetadataInput = {
  title: string;
  composer?: string;
  arranger?: string;
  key?: string;
};

export type StudyScoreHeader = {
  title: string;
  composer?: string;
  arranger?: string;
  bpm?: number;
  key?: string;
  tuning?: string;
  timeSignature?: string;
};

const PLACEHOLDER_TITLE =
  /^(untitled(\s+score)?|sem\s+t[ií]tulo|partitura\s+sem\s+t[ií]tulo)(\s+score)?\s*$/i;

function isPlaceholderCreator(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^compositor\s*(\/\s*|\s+)arranjador/i.test(trimmed);
}

function parseXml(xml: string): Document | null {
  if (typeof window === 'undefined') return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return null;
  return doc;
}

function isPlaceholderTitle(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || PLACEHOLDER_TITLE.test(trimmed);
}

function textContent(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** Afinações comuns em nomes de naipe (ex.: "Clarinet in Bb"). */
export function inferTuningFromMusicXml(xml: string): string | null {
  const doc = parseXml(xml);
  if (!doc) return null;
  const tuning = new Set<string>();
  const pattern =
    /\b(?:in|em)\s+([A-G](?:b|#|♭|♯)?(?:\s|-)?(?:major|minor|menor|maior)?)\b/gi;
  const sources = doc.querySelectorAll(
    'part-name, part-abbreviation, instrument-name, instrument-sound',
  );
  sources.forEach((node) => {
    const text = node.textContent ?? '';
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1]?.replace(/♭/g, 'b').replace(/♯/g, '#').trim();
      if (raw && raw.length <= 4) tuning.add(raw);
    }
  });
  if (tuning.size === 0) return null;
  return [...tuning].join(', ');
}

const CHROMATIC_TO_TUNING: Record<number, string> = {
  0: 'C',
  [-2]: 'Bb',
  [-7]: 'F',
  [-9]: 'Eb',
  [3]: 'Eb',
  [-5]: 'D',
  [2]: 'D',
  [-3]: 'A',
  [5]: 'Bb',
};

function inferTuningFromTranspose(xml: string): string | null {
  const doc = parseXml(xml);
  if (!doc) return null;
  const labels = new Set<string>();
  doc.querySelectorAll('transpose > chromatic').forEach((node) => {
    const chromatic = Number(node.textContent?.trim());
    if (!Number.isInteger(chromatic)) return;
    const normalized = ((chromatic % 12) + 12) % 12;
    const mapped =
      CHROMATIC_TO_TUNING[chromatic] ??
      CHROMATIC_TO_TUNING[normalized === 0 ? 0 : chromatic > 0 ? normalized : chromatic];
    if (mapped) labels.add(mapped);
  });
  if (labels.size === 0) return null;
  return [...labels].join(', ');
}

function stripCreditLabel(value: string): string {
  return value
    .replace(/^(comp\.?|compositor|arr\.?|arranjo|arranjador)\s*:\s*/i, '')
    .trim();
}

/** Créditos MuseScore (com ou sem credit-type padronizado). */
function extractCreditsFromMusicXml(xml: string): { composer?: string; arranger?: string } {
  const doc = parseXml(xml);
  if (!doc) return {};
  let composer: string | undefined;
  let arranger: string | undefined;

  doc.querySelectorAll('credit').forEach((credit) => {
    const type = textContent(credit.querySelector('credit-type')).toLowerCase();
    const words = textContent(credit.querySelector('credit-words'));
    if (!words || type === 'title') return;

    if (type === 'composer') {
      composer = composer || stripCreditLabel(words);
      return;
    }
    if (type === 'arranger') {
      arranger = arranger || stripCreditLabel(words);
      return;
    }
    if (type === 'lyricist' || /arranjo/i.test(words)) {
      const match = words.match(/arranjo[:\s-]+(.+)/i);
      arranger = arranger || stripCreditLabel(match?.[1] ?? words);
      return;
    }
    if (!type || type === 'rights' || type === 'subtitle') {
      if (/arranjo/i.test(words)) {
        const match = words.match(/arranjo[:\s-]+(.+)/i);
        arranger = arranger || stripCreditLabel(match?.[1] ?? words);
        return;
      }
      if (!composer && /[\/|]/.test(words) && words.length < 160 && !/♩|=/.test(words)) {
        composer = stripCreditLabel(words);
      }
    }
  });

  return {
    ...(composer ? { composer } : {}),
    ...(arranger ? { arranger } : {}),
  };
}

export function buildStudyScoreHeader(
  xml: string,
  song: StudySongMetadataInput,
): StudyScoreHeader {
  const fromXml = metadataFromMusicXml(xml);
  const fromCredits = extractCreditsFromMusicXml(xml);
  const tempo = extractTempoInfoFromXml(xml);
  const tuning =
    inferTuningFromMusicXml(xml) ??
    inferTuningFromTranspose(xml) ??
    undefined;
  const title =
    (song.title?.trim() && !isPlaceholderTitle(song.title) ? song.title.trim() : '') ||
    (fromXml.title && !isPlaceholderTitle(fromXml.title) ? fromXml.title : '') ||
    song.title?.trim() ||
    'Partitura';

  const composer =
    song.composer?.trim() ||
    fromCredits.composer?.trim() ||
    fromXml.composer?.trim() ||
    undefined;
  const arranger =
    song.arranger?.trim() ||
    fromCredits.arranger?.trim() ||
    fromXml.arranger?.trim() ||
    undefined;
  const key = song.key?.trim() || fromXml.key?.trim() || undefined;
  const bpm =
    tempo?.bpm != null && tempo.bpm > 0 ? Math.round(tempo.bpm) : undefined;
  const timeSignature = tempo?.timeSignature ?? undefined;

  return {
    title,
    ...(composer ? { composer } : {}),
    ...(arranger ? { arranger } : {}),
    ...(bpm != null ? { bpm } : {}),
    ...(key ? { key } : {}),
    ...(tuning ? { tuning } : {}),
    ...(timeSignature ? { timeSignature } : {}),
  };
}

function ensureWorkTitle(doc: Document, title: string) {
  const root = doc.documentElement;
  let work = root.querySelector('work');
  if (!work) {
    work = doc.createElement('work');
    const identification = root.querySelector('identification');
    root.insertBefore(work, identification ?? root.querySelector('part-list'));
  }
  let workTitle = work.querySelector('work-title');
  if (!workTitle) {
    workTitle = doc.createElement('work-title');
    work.insertBefore(workTitle, work.firstChild);
  }
  const current = textContent(workTitle);
  if (isPlaceholderTitle(current)) workTitle.textContent = title;
}

function ensureCreator(doc: Document, type: 'composer' | 'arranger', name: string) {
  const root = doc.documentElement;
  const identification = root.querySelector('identification');
  if (!identification) return;
  const existing = Array.from(identification.querySelectorAll('creator')).find(
    (node) => node.getAttribute('type')?.toLowerCase() === type,
  );
  if (existing) {
    const current = textContent(existing);
    if (!current || isPlaceholderCreator(current)) existing.textContent = name;
    return;
  }
  const creator = doc.createElement('creator');
  creator.setAttribute('type', type);
  creator.textContent = name;
  identification.insertBefore(creator, identification.firstChild);
}

function replacePlaceholderTitleCredits(doc: Document, title: string) {
  const credits = doc.documentElement.querySelectorAll('credit');
  credits.forEach((credit) => {
    const type = textContent(credit.querySelector('credit-type')).toLowerCase();
    if (type !== 'title') return;
    const wordsEl = credit.querySelector('credit-words');
    if (!wordsEl) return;
    if (isPlaceholderTitle(textContent(wordsEl))) wordsEl.textContent = title;
  });
}

/**
 * Preenche título/créditos ausentes ou genéricos (ex.: Untitled Score) com dados da música e do XML.
 */
export function enrichStudyMusicXml(xml: string, header: StudyScoreHeader): string {
  const doc = parseXml(xml);
  if (!doc || !header.title.trim()) return xml;

  const title = header.title.trim();
  ensureWorkTitle(doc, title);
  replacePlaceholderTitleCredits(doc, title);

  if (header.composer) {
    ensureCreator(doc, 'composer', header.composer);
  }

  if (header.arranger) {
    ensureCreator(doc, 'arranger', header.arranger);
  }

  // Metadados ficam no cabeçalho da tela de estudo; créditos no XML geram bloco
  // enorme no mobile e desalinham o cursor de playback (OSMD mede Y a partir do SVG).
  doc.querySelectorAll('credit').forEach((node) => node.remove());

  return new XMLSerializer().serializeToString(doc);
}
