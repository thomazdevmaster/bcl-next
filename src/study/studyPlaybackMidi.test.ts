// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildUnpitchedMidiFromXml } from './unpitchedMidiFromXml';
import { extractTimedEventsFromSmf, fitStudySmfToTimemap } from './studyMidiFix';

const scoreXml = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Bateria</part-name>
      <score-instrument id="P1-I1"><instrument-name>Acoustic Bass Drum</instrument-name></score-instrument>
      <midi-instrument id="P1-I1"><midi-unpitched>36</midi-unpitched></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note>
        <unpitched><display-step>C</display-step><display-octave>3</display-octave></unpitched>
        <duration>1</duration>
        <instrument id="P1-I1"/>
      </note>
      <note><rest/><duration>3</duration></note>
    </measure>
    <measure number="2">
      <note>
        <unpitched><display-step>C</display-step><display-octave>3</display-octave></unpitched>
        <duration>1</duration>
        <instrument id="P1-I1"/>
      </note>
      <note><rest/><duration>3</duration></note>
    </measure>
    <measure number="3">
      <note><rest/><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

function noteOnMs(midi: ArrayBuffer): number[] {
  const { events, division } = extractTimedEventsFromSmf(midi);
  const msPerTick = 60_000 / 120 / division;
  return events
    .filter((event) => (event.status & 0xf0) === 0x90 && event.d2 > 0)
    .map((event) => event.tick * msPerTick);
}

describe('fitStudySmfToTimemap', () => {
  it('não empurra o ataque do compasso 2 para a pausa final quando a partitura marca outro andamento', () => {
    const built = buildUnpitchedMidiFromXml(scoreXml, ['P1'], 120);
    expect(built).not.toBeNull();
    const timemap = [
      { measure: 0, timestamp: 0, duration: 2000 },
      { measure: 1, timestamp: 2000, duration: 2000 },
      { measure: 2, timestamp: 4000, duration: 2000 },
    ];
    const fitted = fitStudySmfToTimemap(built as ArrayBuffer, timemap, 90, {
      preserveTickTimeline: true,
    });
    const [first, second] = noteOnMs(fitted);
    expect(first).toBeLessThan(500);
    expect(second).toBeGreaterThanOrEqual(2000);
    expect(second).toBeLessThan(4000);
  });
});
