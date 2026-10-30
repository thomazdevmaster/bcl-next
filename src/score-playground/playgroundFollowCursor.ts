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
 * Mantém o cursor na faixa confortável da viewport.
 * Devolve a nova posição só quando precisa mover — o caller aplica na hora,
 * sem `behavior: 'smooth'`, porque um scroll suave por frame nunca chega.
 */
export function nextPlaygroundScroll(
  scroll: PlaygroundScrollBox,
  cursor: PlaygroundCursorBox,
): { top: number; left: number } | null {
  let top = scroll.scrollTop;
  let left = scroll.scrollLeft;
  let changed = false;

  const marginTop = scroll.clientHeight * 0.22;
  const marginBottom = scroll.clientHeight * 0.18;
  const cursorBottom = cursor.top + cursor.height;
  if (cursor.top < marginTop || cursorBottom > scroll.clientHeight - marginBottom) {
    const maxTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    const delta = cursor.top - scroll.clientHeight * 0.32;
    const next = Math.max(0, Math.min(scroll.scrollTop + delta, maxTop));
    if (Math.abs(next - scroll.scrollTop) > 4) {
      top = next;
      changed = true;
    }
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
