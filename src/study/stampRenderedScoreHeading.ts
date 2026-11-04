/**
 * O OSMD em página contínua ignora o título quando o `default-y` do crédito
 * fica abaixo de `page-height - top-system-distance` — caso comum no XML
 * desenrolado — e cai em "Untitled Score". O andamento em `<sound tempo>`
 * também não é desenhado. Este carimbo grava título, autor e marca de
 * metrônomo em elementos que o OSMD sempre lê.
 */

export type RenderedScoreHeading = {
  title?: string;
  composer?: string;
  arranger?: string;
};

const PLACEHOLDER_TITLE =
  /^(untitled(\s+score)?|sem\s+t[ií]tulo|partitura\s+sem\s+t[ií]tulo)(\s+score)?$/i;
const PLACEHOLDER_PERSON = /^compositor\s*(\/\s*|\s+)arranjador$/i;

function textOf(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function meaningful(value: string | null | undefined): string {
  const trimmed = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!trimmed || PLACEHOLDER_TITLE.test(trimmed) || PLACEHOLDER_PERSON.test(trimmed)) return '';
  if (/^subt[ií]tulo$/i.test(trimmed)) return '';
  return trimmed;
}

function stripRoleLabel(value: string): string {
  return value
    .replace(/^(comp\.?|compositor|autor|arr\.?|arranjo|arranjador|letra)\s*:\s*/i, '')
    .trim();
}

function firstMeaningful(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const next = meaningful(value);
    if (next) return next;
  }
  return '';
}

function creditWords(doc: Document, type: string): string {
  for (const credit of doc.querySelectorAll('credit')) {
    const kind = textOf(credit.querySelector('credit-type')).toLowerCase();
    if (kind !== type) continue;
    const words = [...credit.querySelectorAll('credit-words')].map(textOf).filter(Boolean);
    if (words.length > 0) return words.join(' ');
  }
  return '';
}

function creatorText(doc: Document, type: string): string {
  for (const creator of doc.querySelectorAll('identification > creator')) {
    if (creator.getAttribute('type')?.toLowerCase() === type) return textOf(creator);
  }
  return '';
}

function parseScore(xml: string): Document | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return null;
  if (!doc.querySelector('score-partwise, score-timewise')) return null;
  return doc;
}

function ensureWorkTitle(doc: Document, title: string) {
  const root = doc.documentElement;
  let work = root.querySelector('work');
  if (!work) {
    work = doc.createElement('work');
    const anchor = root.querySelector('movement-title, identification, defaults, credit, part-list, part');
    if (anchor) root.insertBefore(work, anchor);
    else root.appendChild(work);
  }
  let workTitle = work.querySelector('work-title');
  if (!workTitle) {
    workTitle = doc.createElement('work-title');
    work.insertBefore(workTitle, work.firstChild);
  }
  if (!meaningful(textOf(workTitle))) workTitle.textContent = title;
}

function ensureCreator(doc: Document, type: 'composer' | 'lyricist', name: string) {
  const root = doc.documentElement;
  let identification = root.querySelector('identification');
  if (!identification) {
    identification = doc.createElement('identification');
    const anchor = root.querySelector('defaults, credit, part-list, part');
    if (anchor) root.insertBefore(identification, anchor);
    else root.appendChild(identification);
  }
  const existing = [...identification.querySelectorAll('creator')].find(
    (node) => node.getAttribute('type')?.toLowerCase() === type,
  );
  if (existing) {
    if (!meaningful(textOf(existing))) existing.textContent = name;
    return;
  }
  const creator = doc.createElement('creator');
  creator.setAttribute('type', type);
  creator.textContent = name;
  identification.insertBefore(creator, identification.firstChild);
}

function formatBpm(raw: string | null): string | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function directionShowsTempo(direction: Element): boolean {
  if (direction.querySelector('metronome')) return true;
  return [...direction.querySelectorAll('words')].some((node) =>
    /(?:♩|=)\s*\d{2,3}/.test(textOf(node)),
  );
}

function appendMetronome(doc: Document, direction: Element, bpm: string) {
  if (direction.querySelector('metronome')) return;
  const directionType = doc.createElement('direction-type');
  const metronome = doc.createElement('metronome');
  const beatUnit = doc.createElement('beat-unit');
  beatUnit.textContent = 'quarter';
  const perMinute = doc.createElement('per-minute');
  perMinute.textContent = bpm;
  metronome.append(beatUnit, perMinute);
  directionType.append(metronome);
  const sound = direction.querySelector('sound');
  if (sound) direction.insertBefore(directionType, sound);
  else direction.append(directionType);
  if (!direction.getAttribute('placement')) direction.setAttribute('placement', 'above');
}

/** Marca de metrônomo na primeira pauta, inclusive nas trocas de andamento. */
function ensureVisibleTempos(doc: Document) {
  const firstPart = doc.querySelector('part');
  if (!firstPart) return;
  for (const sound of firstPart.querySelectorAll('sound[tempo]')) {
    const bpm = formatBpm(sound.getAttribute('tempo'));
    if (!bpm) continue;
    const parent = sound.parentElement;
    if (!parent) continue;
    const parentName = parent.tagName.toLowerCase();
    if (parentName === 'direction') {
      if (!directionShowsTempo(parent)) appendMetronome(doc, parent, bpm);
      continue;
    }
    if (parentName !== 'measure') continue;
    const previous = sound.previousElementSibling;
    if (previous?.tagName.toLowerCase() === 'direction' && directionShowsTempo(previous)) continue;
    const direction = doc.createElement('direction');
    direction.setAttribute('placement', 'above');
    appendMetronome(doc, direction, bpm);
    parent.insertBefore(direction, sound);
  }
}

export function stampRenderedScoreHeading(
  xml: string,
  song: RenderedScoreHeading = {},
): string {
  const doc = parseScore(xml);
  if (!doc) return xml;

  const title = firstMeaningful(
    creditWords(doc, 'title'),
    textOf(doc.querySelector('work-title')),
    textOf(doc.querySelector('movement-title')),
    song.title,
  );
  const composer = firstMeaningful(
    stripRoleLabel(creatorText(doc, 'composer')),
    stripRoleLabel(creditWords(doc, 'composer')),
    song.composer,
  );
  const lyricist = firstMeaningful(
    creatorText(doc, 'lyricist'),
    creatorText(doc, 'poet'),
    creditWords(doc, 'lyricist'),
    creditWords(doc, 'arranger'),
    song.arranger,
  );

  if (title) ensureWorkTitle(doc, title);
  if (composer) ensureCreator(doc, 'composer', composer);
  if (lyricist) ensureCreator(doc, 'lyricist', lyricist);
  ensureVisibleTempos(doc);

  return new XMLSerializer().serializeToString(doc);
}
