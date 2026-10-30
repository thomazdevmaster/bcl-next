import { describe, expect, it } from 'vitest';
import {
  isLargeScoreForWebMscoreLayout,
  prepareMusicXmlForWebMscoreDisplay,
} from './prepareMusicXmlForWebMscoreDisplay';

function scoreWithMeasures(count: number): string {
  const measures = Array.from({ length: count }, (_, index) => {
    return `<measure number="${index + 1}"><print new-system="yes" new-page="yes"/></measure>`;
  }).join('');
  return `<?xml version="1.0"?><score-partwise><part id="P1">${measures}</part></score-partwise>`;
}

describe('isLargeScoreForWebMscoreLayout', () => {
  it('trata pauta longa como grande para o zoom ir ao OSMD', () => {
    expect(isLargeScoreForWebMscoreLayout(scoreWithMeasures(200))).toBe(true);
  });

  it('mantém o reflow do webmscore numa pauta curta', () => {
    const xml = scoreWithMeasures(12);
    expect(isLargeScoreForWebMscoreLayout(xml)).toBe(false);
    const prepared = prepareMusicXmlForWebMscoreDisplay(xml, {
      measuresPerLine: 4,
      baselineMeasures: 6,
      engravingZoom: 1,
    });
    expect(prepared.includes('new-system="yes"')).toBe(false);
    expect(prepared.includes('new-page="yes"')).toBe(false);
  });

  it('não refaz o layout quando o XML passa do limite de memória', () => {
    const huge = `<score-partwise>${'x'.repeat(1_400_000)}</score-partwise>`;
    expect(isLargeScoreForWebMscoreLayout(huge)).toBe(true);
    const prepared = prepareMusicXmlForWebMscoreDisplay(huge, {
      measuresPerLine: 4,
      baselineMeasures: 4,
      engravingZoom: 1,
    });
    expect(prepared.includes('new-system="no"')).toBe(false);
  });
});
