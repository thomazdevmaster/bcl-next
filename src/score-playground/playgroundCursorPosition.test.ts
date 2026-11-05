import { describe, expect, it } from 'vitest';
import { continuousCursorX } from './playgroundCursorPosition';

const notes = [
  { rel: 0, x: 10 },
  { rel: 0.25, x: 40 },
  { rel: 0.5, x: 70 },
];

describe('continuousCursorX', () => {
  it('está na nota no ataque e desliza até a próxima enquanto ela soa', () => {
    expect(continuousCursorX(notes, 0, 1, 0, 100)).toBe(10);
    expect(continuousCursorX(notes, 0.125, 1, 0, 100)).toBe(25);
    expect(continuousCursorX(notes, 0.25, 1, 0, 100)).toBe(40);
  });

  it('depois da última nota continua até a barra, sem ficar parado', () => {
    expect(continuousCursorX(notes, 0.75, 1, 0, 100)).toBe(85);
    expect(continuousCursorX(notes, 1, 1, 0, 100)).toBe(100);
  });

  it('na pausa inicial sai da borda esquerda em direção à primeira nota', () => {
    expect(continuousCursorX([{ rel: 0.5, x: 60 }], 0.25, 1, 10, 110)).toBe(35);
  });

  it('usa a nota mais à esquerda quando o ataque é um acorde', () => {
    expect(
      continuousCursorX(
        [
          { rel: 0, x: 20 },
          { rel: 0, x: 12 },
        ],
        0,
        1,
        0,
        100,
      ),
    ).toBe(12);
  });

  it('sem notas anda linear entre as bordas do compasso', () => {
    expect(continuousCursorX([], 0.5, 1, 10, 110)).toBe(60);
  });
});
