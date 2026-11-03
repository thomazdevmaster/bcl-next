import { describe, expect, it } from 'vitest';
import { soundingNoteCursorX } from './playgroundCursorPosition';

const notes = [
  { rel: 0, x: 10 },
  { rel: 0.25, x: 40 },
  { rel: 0.5, x: 70 },
];

describe('soundingNoteCursorX', () => {
  it('permanece na nota sustentada em vez de avançar até a barra', () => {
    expect(soundingNoteCursorX(notes, 0.9, 1)).toBe(70);
  });

  it('avança quando a nota seguinte é atacada', () => {
    expect(soundingNoteCursorX(notes, 0.5, 1)).toBe(70);
    expect(soundingNoteCursorX(notes, 0.3, 1)).toBe(40);
  });

  it('não antecipa a primeira nota durante a pausa do começo', () => {
    expect(soundingNoteCursorX([{ rel: 0.25, x: 40 }], 0.1, 1)).toBeNull();
  });

  it('usa a nota mais à esquerda quando o ataque é um acorde', () => {
    expect(
      soundingNoteCursorX(
        [
          { rel: 0, x: 20 },
          { rel: 0, x: 12 },
        ],
        0.2,
        1,
      ),
    ).toBe(12);
  });
});
