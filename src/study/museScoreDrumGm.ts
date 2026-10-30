/**
 * MuseScore exporta midi-unpitched no part-list, mas o timbre correto no player
 * segue o **nome** do instrumento no kit. SpessaSynth usa GM: priorizamos nomes
 * do kit MuseScore → nota GM de playback (referência MP3 / MuseScore interno).
 */

/** Nomes exatos do kit padrão MuseScore (EN) → GM para soundfont. */
const MUSESCORE_KIT_NAME_TO_GM: Record<string, number> = {
  'Acoustic Bass Drum': 35,
  'Bass Drum 2': 36,
  'Bass Drum 1': 36,
  'Side Stick': 37,
  'Cross Stick': 37,
  'Acoustic Snare': 38,
  Snare: 38,
  'Hand Clap': 39,
  'Electric Snare': 40,
  'Low Floor Tom': 41,
  'High Floor Tom': 43,
  'Pedal Hi-Hat': 44,
  'Low Tom': 45,
  'Open Hi-Hat': 46,
  'Hi-Hat': 42,
  'Closed Hi-Hat': 42,
  'Mid Tom': 47,
  'High Tom': 48,
  'Crash Cymbal 2': 50,
  'Crash Cymbal': 49,
  'Ride Cymbal': 51,
  'Chinese Cymbal': 52,
  'Ride Bell': 53,
  'Tambourine': 54,
  'Splash Cymbal': 55,
  Cowbell: 56,
  'Vibraslap': 58,
  'Alt Open HH': 46,
  Rim: 37,
};

const NAME_PATTERNS: { pattern: RegExp; gm: number }[] = [
  { pattern: /bass drum|bumbo|kick|surdo grave/i, gm: 36 },
  { pattern: /side stick|cross stick|\brim\b|aro da caixa/i, gm: 37 },
  { pattern: /^(?!.*floor).*\bsnare\b|caixa(?!.*surdo)/i, gm: 38 },
  { pattern: /hand clap|palmas/i, gm: 39 },
  { pattern: /floor tom|surdo|tom tom de ch[aã]o|tom grave/i, gm: 41 },
  { pattern: /pedal.*hi.?hat|chimbal com p[eé]/i, gm: 44 },
  { pattern: /open.*hi.?hat|chimbal aberto|alt open/i, gm: 46 },
  { pattern: /closed.*hi.?hat|chimbal fechado|^hi.?hat$/i, gm: 42 },
  { pattern: /chimbal(?!.*aberto|.*p[eé])/i, gm: 42 },
  { pattern: /mid tom|tom m[eé]dio/i, gm: 47 },
  { pattern: /high tom|tom agudo/i, gm: 48 },
  { pattern: /low tom(?!.*floor)/i, gm: 45 },
  { pattern: /splash/i, gm: 55 },
  { pattern: /crash|prato de ataque|ataque/i, gm: 49 },
  { pattern: /ride bell/i, gm: 53 },
  { pattern: /ride|prato de condu|condu/i, gm: 51 },
  { pattern: /chinese|china/i, gm: 52 },
  { pattern: /cowbell|vibraslap/i, gm: 56 },
];

const DISPLAY_GM: Record<string, number> = {
  'F-4-normal': 36,
  'F-5-normal': 38,
  'F-4-x': 37,
  'A-5-x': 49,
  'G-5-x': 42,
  'G-5-other': 46,
  'C-4-normal': 41,
  'D-4-normal': 45,
  'E-4-normal': 48,
  'A-4-normal': 47,
  'B-4-normal': 50,
};

function lookupKitName(name: string): number | undefined {
  const trimmed = name.trim();
  if (MUSESCORE_KIT_NAME_TO_GM[trimmed] != null) return MUSESCORE_KIT_NAME_TO_GM[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, gm] of Object.entries(MUSESCORE_KIT_NAME_TO_GM)) {
    if (key.toLowerCase() === lower) return gm;
  }
  return undefined;
}

export function gmFromMuseScoreInstrumentName(name: string | null | undefined): number | undefined {
  if (!name?.trim()) return undefined;
  const exact = lookupKitName(name);
  if (exact != null) return exact;
  for (const { pattern, gm } of NAME_PATTERNS) {
    if (pattern.test(name)) return gm;
  }
  return undefined;
}

/**
 * Nota GM para SpessaSynth: nome MuseScore prevalece sobre midi-unpitched do XML.
 */
export function resolveMuseScoreDrumPlaybackPitch(
  instrumentName: string | null | undefined,
  midiUnpitched: number | undefined,
): number | undefined {
  const byName = gmFromMuseScoreInstrumentName(instrumentName);
  if (byName != null) return byName;

  if (midiUnpitched == null || midiUnpitched < 0 || midiUnpitched > 127) return undefined;

  const n = instrumentName?.toLowerCase() ?? '';
  if (midiUnpitched === 37 && /bass|bumbo|kick/i.test(n)) return 36;
  if (midiUnpitched === 39 && /snare|caixa/i.test(n)) return 38;
  if (midiUnpitched === 43 && /hi.?hat|chimbal/i.test(n) && !/open|pedal|floor/i.test(n)) return 42;
  if (midiUnpitched === 58 && /hi.?hat|chimbal|closed/i.test(n)) return 42;

  return midiUnpitched;
}

export function gmFromMuseScoreDisplay(
  displayStep: string | null | undefined,
  displayOctave: string | null | undefined,
  notehead: string | null | undefined,
): number | undefined {
  if (!displayStep || displayOctave == null) return undefined;
  const head = (notehead?.trim() || 'normal').toLowerCase();
  const key = `${displayStep.toUpperCase()}-${displayOctave}-${head}`;
  return DISPLAY_GM[key];
}
