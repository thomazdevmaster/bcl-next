/**
 * Espaço entre linhas, em pixels, igual em todos os jogos.
 * A cabeça da nota acompanha esse espaço, então o desenho fica do mesmo tamanho.
 */
export const GAME_STAFF_LINE_GAP_PX = 13;

export function gameStaffHeightPx(viewBoxHeight: number, lineGap: number): number {
  return Math.round((viewBoxHeight * GAME_STAFF_LINE_GAP_PX) / lineGap);
}

export function gameStaffSize(
  viewBoxWidth: number,
  viewBoxHeight: number,
  lineGap: number,
): { height: number; width: number; clefWidth: number } {
  const height = gameStaffHeightPx(viewBoxHeight, lineGap);
  return {
    height,
    width: Math.round(height * (viewBoxWidth / viewBoxHeight)),
    clefWidth: Math.round(height / 2),
  };
}

/** Geometria da pauta em clave de sol (viewBox 200×96 no modo leitura). */
export const TREBLE_NOTE_X = 132;
export const TREBLE_LEDGER_HALF = 22;

export interface TrebleStaffLayoutMetrics {
  staffTop: number;
  lineGap: number;
  viewHeight: number;
}

export const TREBLE_STAFF_METRICS: TrebleStaffLayoutMetrics = {
  staffTop: 34,
  lineGap: 11,
  viewHeight: 96,
};

/** +50% entre linhas — Naturais 2 (partitura clicável). */
export const TREBLE_STAFF_METRICS_TOUCH: TrebleStaffLayoutMetrics = {
  staffTop: 51,
  lineGap: 11 * 1.5,
  viewHeight: 144,
};

export function trebleStepCenterY(
  staffStep: number,
  metrics: TrebleStaffLayoutMetrics = TREBLE_STAFF_METRICS,
): number {
  return metrics.staffTop + (4 - staffStep * 0.5) * metrics.lineGap;
}

/** Converte coordenada Y do SVG para o degrau diatônico mais próximo. */
export function trebleYToStaffStep(
  y: number,
  metrics: TrebleStaffLayoutMetrics = TREBLE_STAFF_METRICS,
): number {
  const raw = ((4 - (y - metrics.staffTop) / metrics.lineGap) * 2);
  return Math.round(raw);
}

export function trebleStaffLineYs(
  metrics: TrebleStaffLayoutMetrics = TREBLE_STAFF_METRICS,
): number[] {
  return [0, 1, 2, 3, 4].map(
    (index) => metrics.staffTop + index * metrics.lineGap,
  );
}

/** Degraus usados na clave de sol (Dó₄ … Dó₆). */
export const TREBLE_STAFF_STEP_MIN = -2;
export const TREBLE_STAFF_STEP_MAX = 12;

export function trebleStaffStepsInRange(
  min = TREBLE_STAFF_STEP_MIN,
  max = TREBLE_STAFF_STEP_MAX,
): number[] {
  const steps: number[] = [];
  for (let step = min; step <= max; step += 1) {
    steps.push(step);
  }
  return steps;
}
