import { describe, expect, it } from 'vitest';
import type { InstrumentInfo } from '@/study/studyUtils';
import {
  canApplyInstrumentSelection,
  filterInstruments,
  sameInstrumentIds,
  toggleInstrumentId,
} from './playgroundInstrumentSelection';

const instruments = [
  { id: 'P1', name: 'Clarinete em Bb 1' },
  { id: 'P2', name: 'Saxofone Alto 1' },
  { id: 'P17', name: 'Bateria' },
] as InstrumentInfo[];

describe('toggleInstrumentId', () => {
  it('adiciona e remove instrumentos na seleção múltipla', () => {
    expect(toggleInstrumentId(['P1'], 'P17', true)).toEqual(['P1', 'P17']);
    expect(toggleInstrumentId(['P1', 'P17'], 'P1', false)).toEqual(['P17']);
  });

  it('troca a pauta única sem deixar a seleção vazia', () => {
    expect(toggleInstrumentId(['P1'], 'P2', true, true)).toEqual(['P2']);
    expect(toggleInstrumentId(['P1'], 'P1', false, true)).toEqual(['P1']);
  });
});

describe('filterInstruments', () => {
  it('busca pelo nome sem diferenciar maiúsculas', () => {
    expect(filterInstruments(instruments, '  SAX ').map((i) => i.id)).toEqual(['P2']);
    expect(filterInstruments(instruments, '')).toHaveLength(3);
  });
});

describe('seleção aplicável', () => {
  it('compara conjuntos de ids sem depender da ordem', () => {
    expect(sameInstrumentIds(['P1', 'P17'], ['P17', 'P1'])).toBe(true);
    expect(sameInstrumentIds(['P1'], ['P1', 'P17'])).toBe(false);
  });

  it('exige ao menos uma pauta e um instrumento no áudio', () => {
    expect(canApplyInstrumentSelection(['P1'], ['P17'])).toBe(true);
    expect(canApplyInstrumentSelection([], ['P17'])).toBe(false);
    expect(canApplyInstrumentSelection(['P1'], [])).toBe(false);
  });
});
