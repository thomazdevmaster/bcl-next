import { describe, expect, it } from 'vitest';
import { nextPlaygroundScroll } from './playgroundFollowCursor';

const view = {
  scrollTop: 0,
  scrollLeft: 0,
  scrollWidth: 800,
  scrollHeight: 4000,
  clientWidth: 800,
  clientHeight: 600,
};

describe('nextPlaygroundScroll', () => {
  it('não mexe quando o cursor já está na faixa visível', () => {
    expect(
      nextPlaygroundScroll(view, { top: 200, left: 120, width: 3, height: 80 }),
    ).toBeNull();
  });

  it('sobe a página na hora quando o cursor está abaixo da viewport', () => {
    const next = nextPlaygroundScroll(view, { top: 2400, left: 120, width: 3, height: 80 });
    expect(next?.top).toBeGreaterThan(1500);
    expect(next?.left).toBe(0);
  });

  it('rola na horizontal quando a partitura é mais larga que a tela', () => {
    const wide = { ...view, scrollWidth: 1800 };
    const next = nextPlaygroundScroll(wide, { top: 200, left: 1400, width: 3, height: 80 });
    expect(next?.left).toBeGreaterThan(800);
    expect(next?.top).toBe(0);
  });
});
