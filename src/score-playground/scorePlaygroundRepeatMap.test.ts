import { describe, expect, it } from 'vitest';
import { buildUnrolledToWrittenMap, hasRealRepeats } from './scorePlaygroundRepeatMap';
import type { MeasureTimemapEntry } from '@/study/studyTimemap';

function entry(writtenMeasure?: number): MeasureTimemapEntry {
  return { measure: 0, timestamp: 0, duration: 1000, writtenMeasure };
}

describe('buildUnrolledToWrittenMap', () => {
  it('lê writtenMeasure de cada entrada, preservando a ordem', () => {
    const timemap = [entry(0), entry(1), entry(0), entry(1), entry(2)];
    expect(buildUnrolledToWrittenMap(timemap)).toEqual([0, 1, 0, 1, 2]);
  });

  it('usa null quando a entrada não tem writtenMeasure (timemap antigo)', () => {
    const timemap = [entry(0), entry(undefined), entry(2)];
    expect(buildUnrolledToWrittenMap(timemap)).toEqual([0, null, 2]);
  });

  it('devolve array vazio para timemap vazio', () => {
    expect(buildUnrolledToWrittenMap([])).toEqual([]);
  });
});

describe('hasRealRepeats', () => {
  it('é true quando um compasso escrito aparece mais de uma vez (repetição real)', () => {
    expect(hasRealRepeats([0, 1, 0, 1, 2])).toBe(true);
  });

  it('é false quando não há repetição (1:1 entre desdobrado e escrito)', () => {
    expect(hasRealRepeats([0, 1, 2, 3])).toBe(false);
  });

  it('é false quando falta correspondência para algum compasso (timemap antigo)', () => {
    expect(hasRealRepeats([0, 1, null, 1, 2])).toBe(false);
  });

  it('é false para mapa vazio', () => {
    expect(hasRealRepeats([])).toBe(false);
  });

  it('é false para música de um compasso só (sem como repetir)', () => {
    expect(hasRealRepeats([0])).toBe(false);
  });
});
