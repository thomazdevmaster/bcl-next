import { SaxonJSProcessor, unrollMusicXml } from '@music-i18n/musicxml-player';

import { prepareMusicXmlForStudyPlayback } from './studyUtils';

/** Artefato SEF servido em `public/study/unroll.sef.json` (mesmo do musicxml-midi). */
export const STUDY_UNROLL_SEF_PATH = '/study/unroll.sef.json';

const processor = new SaxonJSProcessor();

function absoluteUnrollSefUrl(): string {
  if (typeof window === 'undefined') {
    return STUDY_UNROLL_SEF_PATH;
  }
  return new URL(STUDY_UNROLL_SEF_PATH, window.location.origin).href;
}

/**
 * Expande repetições e saltos do MusicXML para a linha do tempo de execução.
 * O timemap do player (sem unroll na visualização) já segue essa linha; o MIDI precisa coincidir.
 *
 * Importante: passar URL absoluta ao Saxon — o processor do player usa `stylesheetLocation`;
 * se passarmos o texto do SEF, o browser tenta GET `/study/{json…}` e estoura 431.
 */
export async function unrollMusicXmlForPlayback(xml: string): Promise<string> {
  if (!xml.includes('<score')) return xml;
  try {
    return await unrollMusicXml(xml, absoluteUnrollSefUrl(), processor);
  } catch (error) {
    console.warn('[study] Falha ao desdobrar MusicXML:', error);
    return xml;
  }
}

/** Sanitiza part-list/percussão e desdobra voltas — usar só na geração ou injeção de MIDI. */
export async function prepareMusicXmlForMidiPlayback(xml: string): Promise<string> {
  const prepared = prepareMusicXmlForStudyPlayback(xml);
  return unrollMusicXmlForPlayback(prepared);
}
