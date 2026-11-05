import { describe, expect, it } from 'vitest';
import {
  buildMetronomeBeats,
  metronomeBeatsDue,
  metronomeClickDelaySeconds,
  metronomePositionJumped,
  readBeatsPerMeasure,
} from './playgroundMetronome';

const xml = `<?xml version="1.0"?>
<score-partwise>
  <part id="P1">
    <measure number="1"><attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes></measure>
    <measure number="2"></measure>
    <measure number="3"><attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes></measure>
  </part>
  <part id="P2">
    <measure number="1"><attributes><time><beats>4</beats><beat-type>4</beat-type></time></attributes></measure>
  </part>
</score-partwise>`;

describe('readBeatsPerMeasure', () => {
  it('lê a fórmula da primeira parte e mantém a anterior', () => {
    expect(readBeatsPerMeasure(xml)).toEqual([4, 4, 3]);
  });
});

describe('buildMetronomeBeats', () => {
  const timemap = [
    { measure: 0, timestamp: 0, duration: 2000 },
    { measure: 1, timestamp: 2000, duration: 1500 },
  ];

  it('marca o primeiro tempo de cada compasso e divide a duração do timemap', () => {
    const beats = buildMetronomeBeats(timemap, [4, 3]);
    expect(beats.map((beat) => beat.songMs)).toEqual([0, 500, 1000, 1500, 2000, 2500, 3000]);
    expect(beats.filter((beat) => beat.accent).map((beat) => beat.songMs)).toEqual([0, 2000]);
  });
});

describe('metronomeBeatsDue', () => {
  const beats = buildMetronomeBeats([{ measure: 0, timestamp: 0, duration: 2000 }], [4]);

  it('entrega os tempos da janela à frente da posição, sem repetir', () => {
    const due = metronomeBeatsDue(beats, 480, 1, new Set());
    expect(due.map((beat) => beat.songMs)).toEqual([500]);
    const again = metronomeBeatsDue(beats, 480, 1, new Set(due.map((beat) => beat.id)));
    expect(again).toEqual([]);
  });

  it('adianta a janela quando o andamento está mais rápido', () => {
    const due = metronomeBeatsDue(beats, 400, 2, new Set());
    expect(due.map((beat) => beat.songMs)).toEqual([500]);
  });
});

describe('sincronia com o relógio do player', () => {
  it('atrasa o clique pelo tempo que falta, compensando o andamento', () => {
    expect(metronomeClickDelaySeconds(500, 400, 1)).toBeCloseTo(0.1);
    expect(metronomeClickDelaySeconds(500, 400, 2)).toBeCloseTo(0.05);
    expect(metronomeClickDelaySeconds(400, 500, 1)).toBe(0);
  });

  it('detecta volta ao início para reagendar os cliques', () => {
    expect(metronomePositionJumped(4000, 0)).toBe(true);
    expect(metronomePositionJumped(4000, 4030)).toBe(false);
  });
});
