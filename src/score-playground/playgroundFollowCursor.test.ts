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
  it('não mexe enquanto o cursor não cruza a linha do meio (ex.: primeira linha)', () => {
    // Centro do cursor em 240 (200 + 80/2); metade da tela é 300 — ainda acima do meio.
    expect(
      nextPlaygroundScroll(view, { top: 200, left: 120, width: 3, height: 80 }),
    ).toBeNull();
  });

  it('sobe a página na hora quando o cursor está abaixo da viewport', () => {
    const next = nextPlaygroundScroll(view, { top: 2400, left: 120, width: 3, height: 80 });
    expect(next?.top).toBeGreaterThan(1500);
    expect(next?.left).toBe(0);
  });

  it('acompanha o cursor pixel a pixel a partir do meio da tela, sem pular', () => {
    // Centro do cursor em 340 (300 + 40); 40px abaixo do meio (300) → rola exatamente 40px,
    // não os ~192px que a faixa de conforto antiga produziria.
    const next = nextPlaygroundScroll(view, { top: 300, left: 120, width: 3, height: 80 });
    expect(next?.top).toBeCloseTo(40, 1);
  });

  it('acompanha o avanço do cursor 1:1 depois de cruzar o meio, sem degrau maior que o avanço real', () => {
    // Simula quadros sucessivos: o cursor (posição absoluta no conteúdo) avança um valor fixo
    // por quadro; `cursorTopRelative` é o que o DOM reportaria dado o scrollTop já aplicado.
    const step = 15;
    let scrollTop = 0;
    let contentCenterY = 200; // bem acima do meio (300) — não deve rolar ainda
    const deltas: number[] = [];
    for (let frame = 0; frame < 16; frame += 1) {
      const cursorTopRelative = contentCenterY - 40 - scrollTop; // cursor.height / 2 = 40
      const next = nextPlaygroundScroll(
        { ...view, scrollTop },
        { top: cursorTopRelative, left: 120, width: 3, height: 80 },
      );
      const newScrollTop = next ? next.top : scrollTop;
      deltas.push(newScrollTop - scrollTop);
      scrollTop = newScrollTop;
      contentCenterY += step;
    }

    // Nenhum quadro rola mais do que o cursor avançou naquele quadro (não há pulo/overshoot).
    expect(deltas.every((d) => d <= step + 1e-6)).toBe(true);
    // Antes de cruzar o meio da tela, nada rola.
    expect(deltas.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0]);
    // Depois de travar (já sem folga acumulada), cada quadro sobe exatamente o que o cursor
    // avançou — rolagem contínua, não jumps periódicos.
    expect(deltas.slice(-5)).toEqual([step, step, step, step, step]);
  });

  it('trava no fim da partitura: depois do scroll máximo, o cursor segue livre pela tela', () => {
    const shortScore = { ...view, scrollHeight: 650 }; // maxTop = 50
    const next = nextPlaygroundScroll(shortScore, { top: 900, left: 120, width: 3, height: 80 });
    expect(next?.top).toBe(50);
    // Rolar de novo, mais além, não passa do mesmo teto — não há mais o que subir.
    const again = nextPlaygroundScroll({ ...shortScore, scrollTop: 50 }, {
      top: 1200,
      left: 120,
      width: 3,
      height: 80,
    });
    expect(again).toBeNull();
  });

  it('rola na horizontal quando a partitura é mais larga que a tela', () => {
    const wide = { ...view, scrollWidth: 1800 };
    const next = nextPlaygroundScroll(wide, { top: 200, left: 1400, width: 3, height: 80 });
    expect(next?.left).toBeGreaterThan(800);
    expect(next?.top).toBe(0);
  });
});
