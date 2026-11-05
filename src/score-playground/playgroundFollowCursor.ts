export type PlaygroundScrollBox = {
  scrollTop: number;
  scrollLeft: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
};

/** Cursor medido em relação ao canto visível da área de rolagem. */
export type PlaygroundCursorBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/**
 * Rola continuamente para manter o cursor preso na linha do meio da tela.
 *
 * Nas primeiras linhas a partitura não se mexe: o alvo de rolagem fica negativo
 * e é limitado a 0, então a primeira linha permanece onde está. A partir do
 * instante em que o centro do cursor cruza a metade da altura visível, o alvo
 * passa a acompanhar o cursor pixel a pixel — sem faixa de conforto nem pulo —
 * até a rolagem chegar ao fim da partitura (`maxTop`); dali em diante o cursor
 * segue livre pela tela, pois não há mais o que subir.
 *
 * Devolve a nova posição a cada quadro — o caller aplica na hora, sem
 * `behavior: 'smooth'`, porque um scroll suave por frame nunca chega.
 */
export function nextPlaygroundScroll(
  scroll: PlaygroundScrollBox,
  cursor: PlaygroundCursorBox,
): { top: number; left: number } | null {
  let top = scroll.scrollTop;
  let left = scroll.scrollLeft;
  let changed = false;

  const maxTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
  const cursorCenter = scroll.scrollTop + cursor.top + cursor.height / 2;
  const targetTop = Math.max(0, Math.min(cursorCenter - scroll.clientHeight / 2, maxTop));
  if (Math.abs(targetTop - scroll.scrollTop) > 0.5) {
    top = targetTop;
    changed = true;
  }

  if (scroll.scrollWidth > scroll.clientWidth + 8) {
    const cursorRight = cursor.left + cursor.width;
    if (cursor.left < 32 || cursorRight > scroll.clientWidth - 48) {
      const maxLeft = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      const delta = cursor.left - scroll.clientWidth * 0.25;
      const next = Math.max(0, Math.min(scroll.scrollLeft + delta, maxLeft));
      if (Math.abs(next - scroll.scrollLeft) > 4) {
        left = next;
        changed = true;
      }
    }
  }

  return changed ? { top, left } : null;
}

export function followPlaygroundCursor(container: HTMLElement, cursorEl: HTMLElement): void {
  const scrollRoot = container.closest('[data-score-scroll]');
  if (!(scrollRoot instanceof HTMLElement)) return;
  const view = scrollRoot.getBoundingClientRect();
  const cursor = cursorEl.getBoundingClientRect();
  if (view.height <= 0 || cursor.height <= 0) return;
  const next = nextPlaygroundScroll(
    {
      scrollTop: scrollRoot.scrollTop,
      scrollLeft: scrollRoot.scrollLeft,
      scrollWidth: scrollRoot.scrollWidth,
      scrollHeight: scrollRoot.scrollHeight,
      clientWidth: scrollRoot.clientWidth,
      clientHeight: scrollRoot.clientHeight,
    },
    {
      top: cursor.top - view.top,
      left: cursor.left - view.left,
      width: cursor.width,
      height: cursor.height,
    },
  );
  if (!next) return;
  scrollRoot.scrollTop = next.top;
  scrollRoot.scrollLeft = next.left;
}
