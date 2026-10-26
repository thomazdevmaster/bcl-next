import { estimateDurationSecondsFromMusicXml } from '@/study/studyUtils';

export interface MusicXmlMetadata {
  title?: string;
  composer?: string;
  arranger?: string;
  genre?: string;
  key?: string;
  /** Estimativa a partir dos compassos e andamentos (voltas não expandidas). */
  durationSeconds?: number;
}

const MAJOR_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Cb',
  [-6]: 'Gb',
  [-5]: 'Db',
  [-4]: 'Ab',
  [-3]: 'Eb',
  [-2]: 'Bb',
  [-1]: 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
};

const PLACEHOLDER_TITLE = /^partitura sem t[ií]tulo$/i;
const PLACEHOLDER_COMPOSER = /^Compositor\s*\/\s*arranjador$/i;

function isPlaceholderTitle(value: string): boolean {
  return PLACEHOLDER_TITLE.test(value.trim());
}

function isPlaceholderComposer(value: string): boolean {
  return PLACEHOLDER_COMPOSER.test(value.trim());
}

/** Primeiro título útil entre work, movement e credit (ignora placeholder do MuseScore). */
function resolveTitle(head: string): string {
  const candidates = [
    tagText(head, 'work-title'),
    tagText(head, 'movement-title'),
    credit(head, 'title'),
  ].filter(Boolean);
  const meaningful = candidates.filter((value) => !isPlaceholderTitle(value));
  return meaningful[0] ?? candidates[0] ?? '';
}

function resolveComposer(head: string): string {
  const candidates = [
    cleanLabel(creator(head, 'composer')),
    cleanLabel(credit(head, 'composer')),
  ].filter(Boolean);
  const meaningful = candidates.filter((value) => !isPlaceholderComposer(value));
  return meaningful[0] ?? candidates[0] ?? '';
}

/** Lê título, créditos e tonalidade. MuseScore grava isso em credit, não em work/creator. */
export function metadataFromMusicXml(xml: string): MusicXmlMetadata {
  const fifthsAt = xml.search(/<fifths\b/i);
  const head = xml.slice(0, fifthsAt > 0 ? Math.min(xml.length, fifthsAt + 400) : Math.min(xml.length, 512 * 1024));

  const title = resolveTitle(head);
  const composer = resolveComposer(head);
  const arranger = creator(head, 'arranger') || credit(head, 'arranger');
  const genre = miscellaneous(head, 'genre');
  const key = keySignature(head);
  const durationSeconds = estimateDurationSecondsFromMusicXml(xml) ?? undefined;

  return {
    ...(title ? { title } : {}),
    ...(composer ? { composer } : {}),
    ...(arranger ? { arranger } : {}),
    ...(genre ? { genre } : {}),
    ...(key ? { key } : {}),
    ...(durationSeconds != null ? { durationSeconds } : {}),
  };
}

function tagText(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return decode(match?.[1] ?? '');
}

function creator(xml: string, type: string): string {
  const match = xml.match(new RegExp(`<creator\\b[^>]*\\btype=["']${type}["'][^>]*>([\\s\\S]*?)</creator>`, 'i'));
  return decode(match?.[1] ?? '');
}

function credit(xml: string, type: string): string {
  const match = xml.match(
    new RegExp(
      `<credit\\b[^>]*>\\s*<credit-type>\\s*${type}\\s*</credit-type>\\s*<credit-words\\b[^>]*>([\\s\\S]*?)</credit-words>`,
      'i',
    ),
  );
  return decode(match?.[1] ?? '');
}

function miscellaneous(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<miscellaneous-field\\b[^>]*\\bname=["']${name}["'][^>]*>([\\s\\S]*?)</miscellaneous-field>`, 'i'),
  );
  return decode(match?.[1] ?? '');
}

function keySignature(xml: string): string {
  const fifths = Number(tagText(xml, 'fifths'));
  if (!Number.isInteger(fifths) || !(fifths in MAJOR_BY_FIFTHS)) return '';
  const mode = tagText(xml, 'mode').toLowerCase();
  const name = MAJOR_BY_FIFTHS[fifths];
  return mode === 'minor' ? `${name}m` : name;
}

function cleanLabel(value: string): string {
  return value.replace(/^(comp\.?|compositor)\s*:\s*/i, '').trim();
}

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const MUSIC_XML_MIME_TYPES = new Set([
  'application/xml',
  'text/xml',
  'application/vnd.recordare.musicxml+xml',
]);

/** Extensão ou MIME aceitos no upload de partitura na gestão. */
export function isMusicXmlUploadFile(file: File): boolean {
  if (/\.(xml|musicxml)$/i.test(file.name)) return true;
  const mime = file.type.trim().toLowerCase();
  return mime.length > 0 && MUSIC_XML_MIME_TYPES.has(mime);
}

export function looksLikeMusicXml(content: string): boolean {
  const head = content.trimStart().slice(0, 8192);
  if (!head.startsWith('<')) return false;
  return /<(score-partwise|score-timewise)\b/i.test(head);
}
