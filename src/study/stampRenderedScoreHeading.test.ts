// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { stampRenderedScoreHeading } from './stampRenderedScoreHeading';

const UNROLLED = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <identification>
    <encoding><software>MuseScore</software></encoding>
  </identification>
  <credit page="1">
    <credit-type>title</credit-type>
    <credit-words default-y="1611" justify="center">Vento Ventania</credit-words>
  </credit>
  <credit page="1">
    <credit-type>lyricist</credit-type>
    <credit-words default-y="1511" justify="left">Tonho - Luminárias</credit-words>
  </credit>
  <credit page="1">
    <credit-type>composer</credit-type>
    <credit-words default-y="1511" justify="right">Comp.: Álvaro / Beni</credit-words>
  </credit>
  <part id="P1">
    <measure number="1">
      <attributes></attributes>
      <sound tempo="90"/>
      <note><rest/></note>
    </measure>
    <measure number="2">
      <direction placement="above">
        <sound tempo="80"/>
      </direction>
    </measure>
  </part>
  <part id="P2">
    <measure number="1"><sound tempo="90"/></measure>
  </part>
</score-partwise>`;

function docOf(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

describe('stampRenderedScoreHeading', () => {
  it('grava título, autor e andamento visível a partir dos créditos', () => {
    const stamped = docOf(stampRenderedScoreHeading(UNROLLED));
    expect(stamped.querySelector('work-title')?.textContent).toBe('Vento Ventania');
    expect(stamped.querySelector('creator[type="composer"]')?.textContent).toBe('Álvaro / Beni');
    expect(stamped.querySelector('creator[type="lyricist"]')?.textContent).toBe('Tonho - Luminárias');

    const firstPart = stamped.querySelector('part');
    const metronomes = firstPart?.querySelectorAll('metronome per-minute');
    expect([...metronomes ?? []].map((node) => node.textContent)).toEqual(['90', '80']);
    expect(stamped.querySelector('part[id="P2"] metronome')).toBeNull();
  });

  it('usa o cadastro quando a partitura não traz créditos', () => {
    const bare = `<?xml version="1.0"?>
      <score-partwise>
        <work><work-title>Untitled Score</work-title></work>
        <identification><creator type="composer">Compositor / arranjador</creator></identification>
        <part id="P1"><measure number="1"><sound tempo="100"/></measure></part>
      </score-partwise>`;
    const stamped = docOf(
      stampRenderedScoreHeading(bare, {
        title: 'Dobrado',
        composer: 'Autor',
        arranger: 'Arranjo da banda',
      }),
    );
    expect(stamped.querySelector('work-title')?.textContent).toBe('Dobrado');
    expect(stamped.querySelector('creator[type="composer"]')?.textContent).toBe('Autor');
    expect(stamped.querySelector('creator[type="lyricist"]')?.textContent).toBe('Arranjo da banda');
    expect(stamped.querySelector('per-minute')?.textContent).toBe('100');
  });

  it('não duplica título nem metrônomo que já estão visíveis', () => {
    const marked = `<?xml version="1.0"?>
      <score-partwise>
        <work><work-title>Marcha</work-title></work>
        <identification><creator type="composer">Autor original</creator></identification>
        <part id="P1">
          <measure number="1">
            <direction placement="above">
              <direction-type>
                <metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome>
              </direction-type>
              <sound tempo="72"/>
            </direction>
          </measure>
        </part>
      </score-partwise>`;
    const stamped = docOf(
      stampRenderedScoreHeading(marked, { title: 'Outro', composer: 'Outro autor' }),
    );
    expect(stamped.querySelector('work-title')?.textContent).toBe('Marcha');
    expect(stamped.querySelector('creator[type="composer"]')?.textContent).toBe('Autor original');
    expect(stamped.querySelectorAll('metronome')).toHaveLength(1);
    expect(stamped.querySelector('per-minute')?.textContent).toBe('72');
  });
});
