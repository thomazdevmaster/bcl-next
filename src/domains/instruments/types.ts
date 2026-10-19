export type InstrumentFamily = 'woodwind' | 'brass' | 'percussion' | 'string' | 'keyboard' | 'electronic';

export type InstrumentSignal = 'acoustic' | 'electronic';

/** Tipo de instrumento do catálogo (trompete, sax alto), não a peça física. */
export interface CatalogInstrument {
  id: number | string;
  name: string;
  family: InstrumentFamily;
  subclass?: string | null;
  tuning?: string | null;
  signalType: InstrumentSignal;
  tessitura?: string | null;
  tags?: string[];
  status: 'active' | 'inactive';
}

export interface InstrumentDetails {
  instrumentId?: number | string;
  name?: string;
  family: InstrumentFamily;
  tuning?: string;
  pitch?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
}

export const INSTRUMENT_FAMILY_LABEL: Record<InstrumentFamily, string> = {
  woodwind: 'Sopro madeira',
  brass: 'Sopro metais',
  percussion: 'Percussão',
  string: 'Cordas',
  keyboard: 'Teclas',
  electronic: 'Eletrônicos',
};

export const INSTRUMENT_SIGNAL_LABEL: Record<InstrumentSignal, string> = {
  acoustic: 'Acústico',
  electronic: 'Eletrônico',
};

export const INSTRUMENT_FAMILY_OPTIONS = (Object.keys(INSTRUMENT_FAMILY_LABEL) as InstrumentFamily[]).map(
  (value) => ({ value, label: INSTRUMENT_FAMILY_LABEL[value] }),
);

export const INSTRUMENT_SIGNAL_OPTIONS = (Object.keys(INSTRUMENT_SIGNAL_LABEL) as InstrumentSignal[]).map(
  (value) => ({ value, label: INSTRUMENT_SIGNAL_LABEL[value] }),
);
